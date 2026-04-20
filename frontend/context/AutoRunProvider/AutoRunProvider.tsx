import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useArchivedAgents, useElectronApi, useServices } from '@/hooks';

import {
  DISABLE_RACE_STOP_CHECK_INTERVAL_MS,
  DISABLE_RACE_STOP_MAX_CHECKS,
} from './constants';
import { useAutoRunController } from './hooks/useAutoRunController';
import { useAutoRunStore } from './hooks/useAutoRunStore';
import { useConfiguredAgents } from './hooks/useConfiguredAgents';
import { useSafeEligibility } from './hooks/useSafeEligibility';
import { useSelectedEligibility } from './hooks/useSelectedEligibility';
import { AutoRunContextType } from './types';
import {
  appendNewInstances,
  getDecommissionedInstances,
  getEligibleInstances,
  getExcludedInstances,
  getOrderedIncludedInstances,
  normalizeIncludedInstances,
  sortIncludedInstances,
} from './utils/utils';

const AutoRunContext = createContext<AutoRunContextType>({
  enabled: false,
  includedInstances: [],
  excludedInstances: [],
  isToggling: false,
  eligibilityByInstance: {},
  setEnabled: () => {},
  includeInstance: () => {},
  excludeInstance: () => {},
});

/**
 * - Provider that manages the state and logic for auto-running agent instances
 * based on the user's configuration and the current eligibility of the instances.
 * - It orchestrates the rotation of instances, handles enabling/disabling auto-run,
 * and provides context values for the UI to consume.
 */
export const AutoRunProvider = ({ children }: PropsWithChildren) => {
  const {
    services,
    selectedAgentType,
    selectedService,
    selectedServiceConfigId,
  } = useServices();
  const { showNotification } = useElectronApi();

  // Derive agent metadata from services.
  const configuredAgents = useConfiguredAgents(services);

  const {
    storeLoaded,
    enabled,
    includedInstances,
    isInitialized,
    userExcludedInstances,
    updateAutoRun,
  } = useAutoRunStore();

  const configuredInstances = useMemo(
    () => configuredAgents.map((agent) => agent.serviceConfigId),
    [configuredAgents],
  );
  const decommissionedInstances = useMemo(
    () => getDecommissionedInstances(configuredAgents),
    [configuredAgents],
  );
  const { archivedInstances: archivedInstanceIds } = useArchivedAgents();

  const eligibleInstances = useMemo(
    () =>
      getEligibleInstances(configuredInstances, [
        ...decommissionedInstances,
        ...archivedInstanceIds,
      ]),
    [configuredInstances, decommissionedInstances, archivedInstanceIds],
  );
  const includedInstancesSorted = useMemo(
    () =>
      sortIncludedInstances(
        normalizeIncludedInstances(includedInstances),
        eligibleInstances,
      ),
    [eligibleInstances, includedInstances],
  );
  const orderedIncludedInstances = useMemo(
    () =>
      getOrderedIncludedInstances(includedInstancesSorted, eligibleInstances),
    [eligibleInstances, includedInstancesSorted],
  );
  const includedInstancesForUi = useMemo(
    () => includedInstancesSorted.map((instance) => instance.serviceConfigId),
    [includedInstancesSorted],
  );
  const excludedInstances = useMemo(
    () => getExcludedInstances(configuredInstances, includedInstancesForUi),
    [configuredInstances, includedInstancesForUi],
  );

  // Eligibility for the currently selected agent.
  const { canCreateSafeForChain, createSafeIfNeeded } = useSafeEligibility();
  const { isSelectedAgentDetailsLoading, getSelectedEligibility } =
    useSelectedEligibility({ canCreateSafeForChain });

  // Auto-run controller runs the orchestration loop.
  const { stopRunningAgent, runningAgentType } = useAutoRunController({
    enabled,
    orderedIncludedInstances,
    configuredAgents,
    selectedAgentType,
    selectedServiceConfigId: selectedService?.service_config_id ?? null,
    isSelectedAgentDetailsLoading,
    getSelectedEligibility,
    canCreateSafeForChain,
    createSafeIfNeeded,
    showNotification,
    onAutoRunStartStateChange: (isStarting) => {
      setIsStarting(isStarting);
    },
  });

  // Local state to track whether we're in the middle of a start/stop operation,
  // which is used to disable UI controls and prevent concurrent operations.
  const [isStopping, setIsStopping] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [disableRaceStopChecksLeft, setDisableRaceStopChecksLeft] = useState(0);
  const isToggling = isStopping || isStarting;

  // Reset the starting flag if auto-run is turned off mid-start.
  useEffect(() => {
    if (!enabled && isStarting) {
      setIsStarting(false);
    }
  }, [enabled, isStarting]);

  // Guard against the narrow race where auto-run is disabled while a start
  // operation is still in-flight.
  useEffect(() => {
    if (enabled) {
      if (disableRaceStopChecksLeft !== 0) {
        setDisableRaceStopChecksLeft(0);
      }
      return;
    }
    if (disableRaceStopChecksLeft <= 0) return;
    if (isStopping) return;

    if (runningAgentType) {
      setIsStopping(true);
      stopRunningAgent()
        .finally(() => setIsStopping(false))
        .finally(() => setDisableRaceStopChecksLeft(0));
      return;
    }

    const timeoutId = setTimeout(() => {
      setDisableRaceStopChecksLeft((value) => Math.max(value - 1, 0));
    }, DISABLE_RACE_STOP_CHECK_INTERVAL_MS);

    return () => clearTimeout(timeoutId);
  }, [
    enabled,
    disableRaceStopChecksLeft,
    isStopping,
    runningAgentType,
    stopRunningAgent,
  ]);

  // Seed the included list once from eligible instances. After that, empty is intentional.
  // Must wait for storeLoaded so we read the real isInitialized value, not the default.
  useEffect(() => {
    if (!storeLoaded) return;
    if (!services) return;
    if (isInitialized) return;
    if (eligibleInstances.length === 0) return;

    const instances = eligibleInstances.map((serviceConfigId, index) => ({
      serviceConfigId,
      order: index,
    }));
    updateAutoRun({ includedInstances: instances, isInitialized: true });
  }, [storeLoaded, eligibleInstances, isInitialized, services, updateAutoRun]);

  // Auto-append newly onboarded instances unless explicitly excluded by the user.
  useEffect(() => {
    if (!services) return;
    if (!isInitialized) return;
    if (eligibleInstances.length === 0) return;

    const includedSet = new Set(
      includedInstances.map((item) => item.serviceConfigId),
    );
    const excludedSet = new Set(userExcludedInstances);
    const newInstances = eligibleInstances.filter(
      (id) => !includedSet.has(id) && !excludedSet.has(id),
    );

    if (newInstances.length === 0) return;

    updateAutoRun({
      includedInstances: appendNewInstances(includedInstances, newInstances),
    });
  }, [
    eligibleInstances,
    includedInstances,
    isInitialized,
    services,
    updateAutoRun,
    userExcludedInstances,
  ]);

  // Keep included list normalized and drop excluded or decommissioned instances.
  useEffect(() => {
    if (includedInstances.length === 0) return;
    if (eligibleInstances.length === 0) return;
    const excludedSet = new Set(userExcludedInstances);
    const normalized = normalizeIncludedInstances(includedInstances).filter(
      (item) =>
        eligibleInstances.includes(item.serviceConfigId) &&
        !excludedSet.has(item.serviceConfigId),
    );
    const hasChanges =
      normalized.length !== includedInstances.length ||
      normalized.some(
        (item, index) =>
          includedInstances[index]?.serviceConfigId !== item.serviceConfigId ||
          includedInstances[index]?.order !== item.order,
      );

    if (!hasChanges) return;
    updateAutoRun({ includedInstances: normalized });
  }, [
    eligibleInstances,
    includedInstances,
    updateAutoRun,
    userExcludedInstances,
  ]);

  const setEnabled = useCallback(
    (value: boolean) => {
      // If enabling, update the state and useEffect in `useAutoRunController`
      // will handle starting the first agent.
      if (value) {
        setDisableRaceStopChecksLeft(0);
        updateAutoRun({ enabled: true });
        return;
      }

      if (!enabled) return;

      // If disabling, we need to stop the currently running agent immediately.
      if (isStarting && !runningAgentType) {
        setDisableRaceStopChecksLeft(DISABLE_RACE_STOP_MAX_CHECKS);
      } else {
        setDisableRaceStopChecksLeft(0);
      }
      updateAutoRun({ enabled: false });
      if (isStopping) return;

      setIsStopping(true);
      stopRunningAgent().finally(() => setIsStopping(false));
    },
    [
      enabled,
      isStarting,
      isStopping,
      runningAgentType,
      stopRunningAgent,
      updateAutoRun,
    ],
  );

  /**
   * Include an instance in the auto-run rotation.
   */
  const includeInstance = useCallback(
    (serviceConfigId: string) => {
      if (!eligibleInstances.includes(serviceConfigId)) return;
      const nextExcluded = userExcludedInstances.filter(
        (item) => item !== serviceConfigId,
      );
      const existing = includedInstances.find(
        (item) => item.serviceConfigId === serviceConfigId,
      );
      if (existing) {
        if (nextExcluded.length !== userExcludedInstances.length) {
          updateAutoRun({ userExcludedInstances: nextExcluded });
        }
        return;
      }

      updateAutoRun({
        includedInstances: appendNewInstances(includedInstances, [
          serviceConfigId,
        ]),
        userExcludedInstances: nextExcluded,
      });
    },
    [
      eligibleInstances,
      includedInstances,
      updateAutoRun,
      userExcludedInstances,
    ],
  );

  /**
   * Exclude an instance from the auto-run rotation.
   */
  const excludeInstance = useCallback(
    (serviceConfigId: string) => {
      const isLastIncluded =
        includedInstancesForUi.length <= 1 &&
        includedInstancesForUi.includes(serviceConfigId);
      if (isLastIncluded) return;
      const nextIncluded = includedInstances.filter(
        (item) => item.serviceConfigId !== serviceConfigId,
      );
      const nextExcluded = userExcludedInstances.includes(serviceConfigId)
        ? userExcludedInstances
        : [...userExcludedInstances, serviceConfigId];

      updateAutoRun({
        includedInstances: nextIncluded,
        userExcludedInstances: nextExcluded,
      });
    },
    [
      includedInstancesForUi,
      includedInstances,
      updateAutoRun,
      userExcludedInstances,
    ],
  );

  // Provide UI eligibility; non-selected instances default to permissive.
  const eligibilityByInstance = useMemo(() => {
    // Seed all configured instances with a permissive default so the "+" button
    // is enabled by default. We only have live eligibility data for the
    // currently selected instance; for the rest we fall back to canRun: true and
    // let the execution-time checks (in useAutoRunController) handle skipping.
    const base: AutoRunContextType['eligibilityByInstance'] = {};
    for (const { serviceConfigId } of configuredAgents) {
      base[serviceConfigId] = { canRun: true };
    }
    for (const id of decommissionedInstances) {
      base[id] = { canRun: false, reason: 'Decommissioned' };
    }
    const excludedSet = new Set(excludedInstances);
    if (selectedServiceConfigId && !excludedSet.has(selectedServiceConfigId)) {
      base[selectedServiceConfigId] = getSelectedEligibility();
    }
    return base;
  }, [
    configuredAgents,
    decommissionedInstances,
    excludedInstances,
    getSelectedEligibility,
    selectedServiceConfigId,
  ]);

  const value = useMemo(
    () => ({
      enabled,
      includedInstances: includedInstancesSorted,
      excludedInstances,
      isToggling,
      eligibilityByInstance,
      setEnabled,
      includeInstance,
      excludeInstance,
    }),
    [
      enabled,
      excludedInstances,
      eligibilityByInstance,
      excludeInstance,
      includeInstance,
      includedInstancesSorted,
      isToggling,
      setEnabled,
    ],
  );

  return (
    <AutoRunContext.Provider value={value}>{children}</AutoRunContext.Provider>
  );
};

export const useAutoRunContext = () => useContext(AutoRunContext);
