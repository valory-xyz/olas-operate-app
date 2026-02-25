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
import { useElectronApi, useServices } from '@/hooks';

import { useAutoRunController } from './hooks/useAutoRunController';
import { useAutoRunStore } from './hooks/useAutoRunStore';
import { useConfiguredAgents } from './hooks/useConfiguredAgents';
import { useSafeEligibility } from './hooks/useSafeEligibility';
import { useSelectedEligibility } from './hooks/useSelectedEligibility';
import { AutoRunContextType } from './types';
import {
  appendNewAgents,
  getDecommissionedAgentTypes,
  getEligibleAgentTypes,
  getExcludedAgentTypes,
  getOrderedIncludedAgentTypes,
  normalizeIncludedAgents,
  sortIncludedAgents,
} from './utils/utils';

const AutoRunContext = createContext<AutoRunContextType>({
  enabled: false,
  includedAgents: [],
  excludedAgents: [],
  isToggling: false,
  eligibilityByAgent: {},
  setEnabled: () => {},
  includeAgent: () => {},
  excludeAgent: () => {},
});

/**
 * - Provider that manages the state and logic for auto-running agents
 * based on the user's configuration and the current eligibility of agents.
 * - It orchestrates the rotation of agents, handles enabling/disabling auto-run,
 * and provides context values for the UI to consume.
 */
export const AutoRunProvider = ({ children }: PropsWithChildren) => {
  const { services, selectedAgentType, selectedService, updateAgentType } =
    useServices();
  const { showNotification } = useElectronApi();
  const {
    enabled,
    includedAgents,
    isInitialized,
    userExcludedAgents,
    updateAutoRun,
  } = useAutoRunStore();

  // Derived agent lists used for UI and rotation ordering.
  const configuredAgents = useConfiguredAgents(services);
  const configuredAgentTypes = useMemo(
    () => configuredAgents.map((agent) => agent.agentType),
    [configuredAgents],
  );
  const decommissionedAgentTypes = useMemo(
    () => getDecommissionedAgentTypes(configuredAgents),
    [configuredAgents],
  );
  const eligibleAgentTypes = useMemo(
    () => getEligibleAgentTypes(configuredAgentTypes, decommissionedAgentTypes),
    [configuredAgentTypes, decommissionedAgentTypes],
  );
  const includedAgentsSorted = useMemo(
    () =>
      sortIncludedAgents(
        normalizeIncludedAgents(includedAgents),
        eligibleAgentTypes,
      ),
    [eligibleAgentTypes, includedAgents],
  );
  const orderedIncludedAgentTypes = useMemo(
    () =>
      getOrderedIncludedAgentTypes(includedAgentsSorted, eligibleAgentTypes),
    [eligibleAgentTypes, includedAgentsSorted],
  );
  const excludedAgents = useMemo(
    () =>
      getExcludedAgentTypes(configuredAgentTypes, orderedIncludedAgentTypes),
    [configuredAgentTypes, orderedIncludedAgentTypes],
  );

  // Eligibility for the currently selected agent.
  const { canCreateSafeForChain, createSafeIfNeeded } = useSafeEligibility();
  const { isSelectedAgentDetailsLoading, getSelectedEligibility } =
    useSelectedEligibility({ canCreateSafeForChain });

  // Auto-run controller runs the orchestration loop.
  const { stopRunningAgent } = useAutoRunController({
    enabled,
    orderedIncludedAgentTypes,
    configuredAgents,
    updateAgentType,
    selectedAgentType,
    selectedServiceConfigId: selectedService?.service_config_id ?? null,
    isSelectedAgentDetailsLoading,
    getSelectedEligibility,
    createSafeIfNeeded,
    showNotification,
    onAutoRunAgentStarted: (agentType) => {
      if (!configuredAgentTypes.includes(agentType)) return;
      updateAgentType(agentType);
    },
    onAutoRunStartStateChange: (isStarting) => {
      setIsStarting(isStarting);
    },
  });

  // Local state to track whether we're in the middle of a start/stop operation,
  // which is used to disable UI controls and prevent concurrent operations.
  const [isStopping, setIsStopping] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const isToggling = isStopping || isStarting;

  // Reset the starting flag if auto-run is turned off mid-start.
  useEffect(() => {
    if (!enabled && isStarting) {
      setIsStarting(false);
    }
  }, [enabled, isStarting]);

  // Seed the included list once from eligible agents. After that, empty is intentional.
  useEffect(() => {
    if (!services) return;
    if (isInitialized) return;
    if (eligibleAgentTypes.length === 0) return;

    const includedAgents = eligibleAgentTypes.map((agentType, index) => ({
      agentType,
      order: index,
    }));
    updateAutoRun({ includedAgents, isInitialized: true });
  }, [eligibleAgentTypes, isInitialized, services, updateAutoRun]);

  // Auto-append newly onboarded agents unless explicitly excluded by the user.
  useEffect(() => {
    if (!services) return;
    if (!isInitialized) return;
    if (eligibleAgentTypes.length === 0) return;

    const includedSet = new Set(includedAgents.map((item) => item.agentType));
    const excludedSet = new Set(userExcludedAgents);
    const newAgents = eligibleAgentTypes.filter(
      (agentType) => !includedSet.has(agentType) && !excludedSet.has(agentType),
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
    userExcludedAgents,
  ]);

  // Keep included list normalized and drop excluded or decommissioned agents.
  useEffect(() => {
    if (includedAgents.length === 0) return;
    const excludedSet = new Set(userExcludedAgents);
    const normalized = normalizeIncludedAgents(includedAgents).filter(
      (item) =>
        eligibleAgentTypes.includes(item.agentType) &&
        !excludedSet.has(item.agentType),
    );
    const hasChanges =
      normalized.length !== includedAgents.length ||
      normalized.some(
        (item, index) =>
          includedAgents[index]?.agentType !== item.agentType ||
          includedAgents[index]?.order !== item.order,
      );

    if (!hasChanges) return;
    updateAutoRun({ includedAgents: normalized });
  }, [eligibleAgentTypes, includedAgents, updateAutoRun, userExcludedAgents]);

  const setEnabled = useCallback(
    (value: boolean) => {
      // If enabling, update the state and useEffect in `useAutoRunController`
      // will handle starting the first agent.
      if (value) {
        updateAutoRun({ enabled: true });
        return;
      }

      // If disabling, we need to stop the currently running agent immediately.
      updateAutoRun({ enabled: false });
      if (isStopping) return;

      setIsStopping(true);
      stopRunningAgent().finally(() => setIsStopping(false));
    },
    [isStopping, stopRunningAgent, updateAutoRun],
  );

  /**
   * Include an agent in the auto-run rotation.
   */
  const includeAgent = useCallback(
    (agentType: AgentType) => {
      if (!eligibleAgentTypes.includes(agentType)) return;
      const nextExcluded = userExcludedAgents.filter(
        (item) => item !== agentType,
      );
      const existing = includedAgents.find(
        (item) => item.agentType === agentType,
      );
      if (existing) {
        if (nextExcluded.length !== userExcludedAgents.length) {
          updateAutoRun({ userExcludedAgents: nextExcluded });
        }
        return;
      }

      updateAutoRun({
        includedAgents: appendNewAgents(includedAgents, [agentType]),
        userExcludedAgents: nextExcluded,
      });
    },
    [eligibleAgentTypes, includedAgents, updateAutoRun, userExcludedAgents],
  );

  /**
   * Exclude an agent from the auto-run rotation.
   */
  const excludeAgent = useCallback(
    (agentType: AgentType) => {
      const nextIncluded = includedAgents.filter(
        (item) => item.agentType !== agentType,
      );
      const nextExcluded = userExcludedAgents.includes(agentType)
        ? userExcludedAgents
        : [...userExcludedAgents, agentType];

      updateAutoRun({
        includedAgents: nextIncluded,
        userExcludedAgents: nextExcluded,
      });
    },
    [includedAgents, updateAutoRun, userExcludedAgents],
  );

  // Provide UI eligibility; non-selected agents default to permissive.
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
      isToggling,
      eligibilityByAgent,
      setEnabled,
      includeAgent,
      excludeAgent,
    }),
    [
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
