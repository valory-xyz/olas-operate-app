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
import {
  useBalanceAndRefillRequirementsContext,
  useElectronApi,
  useServices,
} from '@/hooks';

import { useAutoRunController } from './hooks/useAutoRunController';
import { useAutoRunStore } from './hooks/useAutoRunStore';
import { useConfiguredAgents } from './hooks/useConfiguredAgents';
import { useSafeEligibility } from './hooks/useSafeEligibility';
import { useSelectedEligibility } from './hooks/useSelectedEligibility';
import { AutoRunContextType } from './types';
import {
  appendNewAgents,
  buildIncludedAgentsFromOrder,
  normalizeIncludedAgents,
  sortIncludedAgents,
} from './utils';

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

  const configuredAgents = useConfiguredAgents(services);
  const configuredAgentTypes = useMemo(
    () => configuredAgents.map((agent) => agent.agentType),
    [configuredAgents],
  );

  const normalizedIncludedAgents = useMemo(
    () => normalizeIncludedAgents(includedAgents),
    [includedAgents],
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
    () => sortIncludedAgents(normalizedIncludedAgents, eligibleAgentTypes),
    [eligibleAgentTypes, normalizedIncludedAgents],
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
  const { isBalancesAndFundingRequirementsReady } =
    useBalanceAndRefillRequirementsContext();

  const { stopRunningAgent } = useAutoRunController({
    enabled,
    orderedIncludedAgentTypes,
    configuredAgents,
    updateAgentType,
    selectedAgentType,
    selectedServiceConfigId: selectedService?.service_config_id ?? null,
    isSelectedAgentDetailsLoading,
    isBalancesAndFundingRequirementsReady,
    getSelectedEligibility,
    createSafeIfNeeded,
    showNotification,
    onAutoRunAgentStarted: (agentType) => {
      if (!configuredAgentTypes.includes(agentType)) return;
      updateAgentType(agentType);
    },
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

  // Auto-append newly onboarded agents unless explicitly excluded by user.
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

  // Keep included list normalized and drop explicitly excluded or decommissioned agents.
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
      // If enabling, update the state and useEffect in useAutoRunController
      // will handle starting the first agent.
      if (value) {
        updateAutoRun({ enabled: true });
        return;
      }

      // If disabling, we need to stop the currently running agent immediately.
      updateAutoRun({ enabled: false });
      if (isToggling) return;
      if (!stopRunningAgent) return;

      setIsToggling(true);
      stopRunningAgent()
        .then(() => {})
        .finally(() => {
          setIsToggling(false);
        });
    },
    [isToggling, stopRunningAgent, updateAutoRun],
  );

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
