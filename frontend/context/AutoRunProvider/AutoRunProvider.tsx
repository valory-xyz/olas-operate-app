import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { AgentType } from '@/constants';
import { useServices } from '@/hooks';

import { useAutoRunController } from './hooks/useAutoRunController';
import { useAutoRunStore } from './hooks/useAutoRunStore';
import { useConfiguredAgents } from './hooks/useConfiguredAgents';
import { useAutoRunEvent } from './hooks/useLogAutoRunEvent';
import { useSafeEligibility } from './hooks/useSafeEligibility';
import { useSelectedEligibility } from './hooks/useSelectedEligibility';
import { AutoRunContextType } from './types';
import {
  appendNewAgents,
  buildIncludedAgentsFromOrder,
  sortIncludedAgents,
} from './utils';

const AutoRunContext = createContext<AutoRunContextType>({
  enabled: false,
  includedAgents: [],
  excludedAgents: [],
  currentAgent: null,
  isToggling: false,
  eligibilityByAgent: {},
  setEnabled: () => {},
  includeAgent: () => {},
  excludeAgent: () => {},
});

export const AutoRunProvider = ({ children }: PropsWithChildren) => {
  const { services, selectedAgentType, updateAgentType } = useServices();
  const { logMessage } = useAutoRunEvent();
  const {
    enabled,
    includedAgents,
    currentAgent,
    isInitialized,
    updateAutoRun,
  } = useAutoRunStore();

  const configuredAgents = useConfiguredAgents(services);
  const configuredAgentTypes = useMemo(
    () => configuredAgents.map((agent) => agent.agentType),
    [configuredAgents],
  );

  const decommissionedAgentTypes = useMemo(
    () =>
      configuredAgents
        .filter(
          (agent) =>
            agent.agentConfig.isUnderConstruction ||
            agent.agentConfig.isAgentEnabled === false,
        )
        .map((agent) => agent.agentType),
    [configuredAgents],
  );

  const eligibleAgentTypes = useMemo(() => {
    if (configuredAgentTypes.length === 0) return [];
    const blocked = new Set(decommissionedAgentTypes);
    return configuredAgentTypes.filter((agentType) => !blocked.has(agentType));
  }, [configuredAgentTypes, decommissionedAgentTypes]);

  const includedAgentsSorted = useMemo(
    () => sortIncludedAgents(includedAgents, eligibleAgentTypes),
    [eligibleAgentTypes, includedAgents],
  );

  const orderedIncludedAgentTypes = useMemo(() => {
    if (includedAgentsSorted.length > 0) {
      return includedAgentsSorted.map((agent) => agent.agentType);
    }
    return eligibleAgentTypes;
  }, [eligibleAgentTypes, includedAgentsSorted]);

  const excludedAgents = useMemo(() => {
    const includedSet = new Set(orderedIncludedAgentTypes);
    return configuredAgentTypes.filter(
      (agentType) => !includedSet.has(agentType),
    );
  }, [configuredAgentTypes, orderedIncludedAgentTypes]);

  const { canCreateSafeForChain, createSafeIfNeeded } = useSafeEligibility();
  const { isSelectedAgentDetailsLoading, getSelectedEligibility } =
    useSelectedEligibility({ canCreateSafeForChain });

  const { canSyncSelection, stopRunningAgent } = useAutoRunController({
    enabled,
    currentAgent,
    orderedIncludedAgentTypes,
    configuredAgents,
    updateAutoRun,
    updateAgentType,
    selectedAgentType,
    isSelectedAgentDetailsLoading,
    getSelectedEligibility,
    createSafeIfNeeded,
  });

  const [isToggling, setIsToggling] = useState(false);

  // Seed included list once. After that, treat empty as intentional.
  useEffect(() => {
    if (!services) return;
    if (isInitialized) return;
    if (eligibleAgentTypes.length === 0) return;

    updateAutoRun({
      includedAgents: buildIncludedAgentsFromOrder(eligibleAgentTypes),
      isInitialized: true,
    });
  }, [eligibleAgentTypes, isInitialized, services, updateAutoRun]);

  // Append new agents to included list
  useEffect(() => {
    if (!services) return;
    if (!isInitialized) return;
    if (eligibleAgentTypes.length === 0) return;
    if (includedAgents.length === 0) return;

    const includedSet = new Set(includedAgents.map((item) => item.agentType));
    const newAgents = eligibleAgentTypes.filter(
      (agentType) => !includedSet.has(agentType),
    );

    if (newAgents.length === 0) return;

    updateAutoRun({
      includedAgents: appendNewAgents(includedAgents, newAgents),
    });
  }, [
    eligibleAgentTypes,
    includedAgents,
    isInitialized,
    services,
    updateAutoRun,
  ]);

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
      // If enabling, update the state and useEffect in useAutoRunController
      // will handle starting the first agent.
      if (value) {
        updateAutoRun({ enabled: true });
        logMessage('enabled set to true');
        return;
      }

      // If disabling, we need to stop the currently running agent immediately.
      updateAutoRun({ enabled: false });
      logMessage('enabled set to false');

      if (isToggling) return;
      if (!stopRunningAgent) return;

      setIsToggling(true);
      stopRunningAgent()
        .then((stopped) => {
          if (stopped) updateAutoRun({ currentAgent: null });
        })
        .catch((error) => {
          logMessage(`failed to stop agent: ${error}`);
        })
        .finally(() => {
          setIsToggling(false);
        });
    },
    [isToggling, stopRunningAgent, updateAutoRun, logMessage],
  );

  const includeAgent = useCallback(
    (agentType: AgentType) => {
      if (!eligibleAgentTypes.includes(agentType)) return;
      const existing = includedAgents.find(
        (item) => item.agentType === agentType,
      );
      if (existing) return;

      updateAutoRun({
        includedAgents: appendNewAgents(includedAgents, [agentType]),
      });
      logMessage(`included ${agentType}`);
    },
    [eligibleAgentTypes, includedAgents, logMessage, updateAutoRun],
  );

  const excludeAgent = useCallback(
    (agentType: AgentType) => {
      if (!includedAgents.length) return;
      const nextIncluded = includedAgents.filter(
        (item) => item.agentType !== agentType,
      );
      updateAutoRun({ includedAgents: nextIncluded });
      logMessage(`excluded ${agentType}`);
    },
    [includedAgents, logMessage, updateAutoRun],
  );

  const eligibilityByAgent = useMemo(() => {
    // Seed all configured agents with a permissive default so the "+" button
    // is enabled by default. We only have live eligibility data for the
    // currently selected agent; for the rest we fall back to canRun: true and
    // let the execution-time checks (in useAutoRunController) handle skipping.
    const base: AutoRunContextType['eligibilityByAgent'] = {};
    for (const { agentType } of configuredAgents) {
      base[agentType] = { canRun: true };
    }
    for (const agentType of decommissionedAgentTypes) {
      base[agentType] = { canRun: false, reason: 'Decommissioned' };
    }
    base[selectedAgentType] = getSelectedEligibility();
    return base;
  }, [
    configuredAgents,
    decommissionedAgentTypes,
    getSelectedEligibility,
    selectedAgentType,
  ]);

  const value = useMemo(
    () => ({
      enabled,
      includedAgents: includedAgentsSorted,
      excludedAgents,
      currentAgent,
      isToggling,
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
      isToggling,
      setEnabled,
    ],
  );

  return (
    <AutoRunContext.Provider value={value}>{children}</AutoRunContext.Provider>
  );
};

export const useAutoRunContext = () => useContext(AutoRunContext);
