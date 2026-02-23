import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';

import { AgentType } from '@/constants';
import { useAgentRunning, useElectronApi, useServices } from '@/hooks';

import { AUTO_RUN_LOG_PREFIX } from './constants';
import { useAutoRunController } from './hooks/useAutoRunController';
import { useAutoRunStore } from './hooks/useAutoRunStore';
import { useConfiguredAgents } from './hooks/useConfiguredAgents';
import { useSafeEligibility } from './hooks/useSafeEligibility';
import { useSelectedEligibility } from './hooks/useSelectedEligibility';
import { AutoRunContextType } from './types';
import {
  appendNewAgents,
  buildIncludedAgentsFromOrder,
  logAutoRun,
  sortIncludedAgents,
} from './utils';

const AutoRunContext = createContext<AutoRunContextType>({
  enabled: false,
  includedAgents: [],
  excludedAgents: [],
  currentAgent: null,
  eligibilityByAgent: {},
  setEnabled: () => {},
  includeAgent: () => {},
  excludeAgent: () => {},
});

export const AutoRunProvider = ({ children }: PropsWithChildren) => {
  const { logEvent } = useElectronApi();
  const { services, updateAgentType, selectedAgentType } = useServices();
  const { runningAgentType } = useAgentRunning();
  const { enabled, includedAgents, currentAgent, updateAutoRun } =
    useAutoRunStore();

  const configuredAgents = useConfiguredAgents(services);
  const configuredAgentTypes = useMemo(
    () => configuredAgents.map((agent) => agent.agentType),
    [configuredAgents],
  );

  const includedAgentsSorted = useMemo(
    () => sortIncludedAgents(includedAgents, configuredAgentTypes),
    [configuredAgentTypes, includedAgents],
  );

  const orderedIncludedAgentTypes = useMemo(() => {
    if (includedAgentsSorted.length > 0) {
      return includedAgentsSorted.map((agent) => agent.agentType);
    }
    return configuredAgentTypes;
  }, [configuredAgentTypes, includedAgentsSorted]);

  const excludedAgents = useMemo(() => {
    const includedSet = new Set(orderedIncludedAgentTypes);
    return configuredAgentTypes.filter(
      (agentType) => !includedSet.has(agentType),
    );
  }, [configuredAgentTypes, orderedIncludedAgentTypes]);

  const { canCreateSafeForChain, createSafeIfNeeded } = useSafeEligibility();
  const {
    isEligibleForRewards,
    isSelectedDataLoading,
    getSelectedEligibility,
  } = useSelectedEligibility({ canCreateSafeForChain });

  const { canSyncSelection } = useAutoRunController({
    enabled,
    currentAgent,
    orderedIncludedAgentTypes,
    configuredAgents,
    updateAutoRun,
    updateAgentType,
    selectedAgentType,
    runningAgentType,
    isEligibleForRewards,
    isSelectedDataLoading,
    getSelectedEligibility,
    createSafeIfNeeded,
    logEvent,
  });

  // Seed included list if empty
  useEffect(() => {
    if (!services) return;
    if (includedAgents.length > 0) return;
    if (configuredAgentTypes.length === 0) return;

    updateAutoRun({
      includedAgents: buildIncludedAgentsFromOrder(configuredAgentTypes),
    });
  }, [configuredAgentTypes, includedAgents.length, services, updateAutoRun]);

  // Append new agents to included list
  useEffect(() => {
    if (!services) return;
    if (configuredAgentTypes.length === 0) return;

    const includedSet = new Set(includedAgents.map((item) => item.agentType));
    const newAgents = configuredAgentTypes.filter(
      (agentType) => !includedSet.has(agentType),
    );

    if (newAgents.length === 0) return;

    updateAutoRun({
      includedAgents: appendNewAgents(includedAgents, newAgents),
    });
  }, [configuredAgentTypes, includedAgents, services, updateAutoRun]);

  // Sync sidebar selection with current auto-run agent after activation
  useEffect(() => {
    if (!canSyncSelection) return;
    if (!currentAgent) return;
    if (!configuredAgentTypes.includes(currentAgent)) return;
    if (selectedAgentType === currentAgent) return;

    updateAgentType(currentAgent);
  }, [
    canSyncSelection,
    configuredAgentTypes,
    currentAgent,
    selectedAgentType,
    updateAgentType,
  ]);

  const setEnabled = useCallback(
    (value: boolean) => {
      updateAutoRun({ enabled: value });
      logAutoRun(logEvent, AUTO_RUN_LOG_PREFIX, `enabled set to ${value}`);
    },
    [logEvent, updateAutoRun],
  );

  const includeAgent = useCallback(
    (agentType: AgentType) => {
      if (!configuredAgentTypes.includes(agentType)) return;
      const existing = includedAgents.find(
        (item) => item.agentType === agentType,
      );
      if (existing) return;

      updateAutoRun({
        includedAgents: appendNewAgents(includedAgents, [agentType]),
      });
      logAutoRun(logEvent, AUTO_RUN_LOG_PREFIX, `included ${agentType}`);
    },
    [configuredAgentTypes, includedAgents, logEvent, updateAutoRun],
  );

  const excludeAgent = useCallback(
    (agentType: AgentType) => {
      if (!includedAgents.length) return;
      const nextIncluded = includedAgents.filter(
        (item) => item.agentType !== agentType,
      );
      updateAutoRun({ includedAgents: nextIncluded });
      logAutoRun(logEvent, AUTO_RUN_LOG_PREFIX, `excluded ${agentType}`);
    },
    [includedAgents, logEvent, updateAutoRun],
  );

  const eligibilityByAgent = useMemo(
    () => ({
      [selectedAgentType]: getSelectedEligibility(),
    }),
    [getSelectedEligibility, selectedAgentType],
  );

  const value = useMemo(
    () => ({
      enabled,
      includedAgents: includedAgentsSorted,
      excludedAgents,
      currentAgent,
      eligibilityByAgent,
      setEnabled,
      includeAgent,
      excludeAgent,
    }),
    [
      currentAgent,
      enabled,
      excludedAgents,
      eligibilityByAgent,
      excludeAgent,
      includeAgent,
      includedAgentsSorted,
      setEnabled,
    ],
  );

  return (
    <AutoRunContext.Provider value={value}>{children}</AutoRunContext.Provider>
  );
};

export const useAutoRunContext = () => useContext(AutoRunContext);
