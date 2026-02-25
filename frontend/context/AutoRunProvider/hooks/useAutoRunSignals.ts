import { useCallback, useEffect, useRef, useState } from 'react';

import { AgentType } from '@/constants';
import { useBalanceAndRefillRequirementsContext } from '@/hooks';
import { delayInSeconds } from '@/utils/delay';

/**
 * Constants for timeouts and intervals used in auto-run signals,
 * such as waiting for rewards eligibility or balances to be ready.
 */
const REWARDS_WAIT_TIMEOUT_SECONDS = 20;

type UseAutoRunSignalsParams = {
  enabled: boolean;
  runningAgentType: AgentType | null;
  isSelectedAgentDetailsLoading: boolean;
  isEligibleForRewards: boolean | undefined;
  selectedAgentType: AgentType;
  selectedServiceConfigId: string | null;
  logMessage: (message: string) => void;
};

/**
 * hook to manage signals related to auto-run state and agent status,
 * such as tracking the currently running agent, rewards eligibility snapshots,
 * and providing utility functions to wait for certain conditions or schedule scans.
 */
export const useAutoRunSignals = ({
  enabled,
  runningAgentType,
  isSelectedAgentDetailsLoading,
  isEligibleForRewards,
  selectedAgentType,
  selectedServiceConfigId,
  logMessage,
}: UseAutoRunSignalsParams) => {
  const {
    isBalancesAndFundingRequirementsLoadingForAllServices,
    isBalancesAndFundingRequirementsReadyForAllServices,
    refetch,
  } = useBalanceAndRefillRequirementsContext();

  // NOTE: Refs keep async loops in sync with live state without re-render churn.
  const enabledRef = useRef(enabled);
  const runningAgentTypeRef = useRef(runningAgentType);
  const isSelectedAgentDetailsLoadingRef = useRef(
    isSelectedAgentDetailsLoading,
  );
  const selectedAgentTypeRef = useRef(selectedAgentType);
  const selectedServiceConfigIdRef = useRef(selectedServiceConfigId);
  const balancesLoadingRef = useRef(
    isBalancesAndFundingRequirementsLoadingForAllServices,
  );
  const balancesReadyRef = useRef(
    isBalancesAndFundingRequirementsReadyForAllServices,
  );
  const didRefetchBalancesRef = useRef(false);
  // Latest rewards snapshot per agent; updated by RewardProvider.
  const rewardSnapshotRef = useRef<
    Partial<Record<AgentType, boolean | undefined>>
  >({});
  // Track the previous rewards state to detect transitions.
  const lastRewardsEligibilityRef = useRef<
    Partial<Record<AgentType, boolean | undefined>>
  >({});
  // Timer + tick used to rescan after delays.
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scanTick, setScanTick] = useState(0);
  const [rewardsTick, setRewardsTick] = useState(0);

  // Keep the enabled ref fresh and clear any scheduled scan on disable.
  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled && scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    if (enabled) {
      didRefetchBalancesRef.current = false;
    }
  }, [enabled]);

  // Track the running agent from polling.
  useEffect(() => {
    runningAgentTypeRef.current = runningAgentType;
  }, [runningAgentType]);
  useEffect(() => {
    isSelectedAgentDetailsLoadingRef.current = isSelectedAgentDetailsLoading;
  }, [isSelectedAgentDetailsLoading]);
  useEffect(() => {
    balancesReadyRef.current =
      isBalancesAndFundingRequirementsReadyForAllServices;
  }, [isBalancesAndFundingRequirementsReadyForAllServices]);
  useEffect(() => {
    balancesLoadingRef.current =
      isBalancesAndFundingRequirementsLoadingForAllServices;
  }, [isBalancesAndFundingRequirementsLoadingForAllServices]);
  useEffect(() => {
    selectedAgentTypeRef.current = selectedAgentType;
  }, [selectedAgentType]);
  useEffect(() => {
    const previous = selectedServiceConfigIdRef.current;
    selectedServiceConfigIdRef.current = selectedServiceConfigId;
    if (selectedServiceConfigId && selectedServiceConfigId !== previous) {
      didRefetchBalancesRef.current = false;
    }
  }, [selectedServiceConfigId]);

  // Update rewards snapshot for the selected agent (RewardProvider is selection-driven).
  useEffect(() => {
    if (!selectedAgentType) return;
    rewardSnapshotRef.current[selectedAgentType] = isEligibleForRewards;
    setRewardsTick((value) => value + 1);
  }, [isEligibleForRewards, selectedAgentType]);

  // Cleanup pending scan timer on unmount.
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  // Wait until UI selection and service config match the requested agent.
  const waitForAgentSelection = useCallback(
    async (agentType: AgentType, serviceConfigId?: string | null) => {
      while (enabledRef.current) {
        const isSelectedAgent =
          !isSelectedAgentDetailsLoadingRef.current &&
          selectedAgentTypeRef.current === agentType &&
          (serviceConfigId == null ||
            selectedServiceConfigIdRef.current === serviceConfigId);
        if (isSelectedAgent) {
          return true;
        }
        await delayInSeconds(2);
      }
      return false;
    },
    [],
  );

  // Wait until balances are ready, with periodic refetches on long waits.
  const waitForBalancesReady = useCallback(async () => {
    if (balancesReadyRef.current && !balancesLoadingRef.current) return true;
    let lastRefetchAt = Date.now();
    while (enabledRef.current) {
      if (balancesReadyRef.current && !balancesLoadingRef.current) {
        return true;
      }
      await delayInSeconds(2);
      const now = Date.now();
      if (!didRefetchBalancesRef.current && now - lastRefetchAt >= 15000) {
        didRefetchBalancesRef.current = true;
        lastRefetchAt = now;
        refetch().catch((error) => {
          logMessage(`balances refetch failed: ${error}`);
        });
      }
    }
    return false;
  }, [logMessage, refetch]);

  // Wait for rewards eligibility to be populated for a given agent.
  const waitForRewardsEligibility = useCallback(
    async (agentType: AgentType) => {
      const startedAt = Date.now();
      while (rewardSnapshotRef.current[agentType] === undefined) {
        if (Date.now() - startedAt > REWARDS_WAIT_TIMEOUT_SECONDS * 1000) {
          logMessage(
            `rewards eligibility timeout: ${agentType}, proceeding without it`,
          );
          return undefined;
        }
        await delayInSeconds(2);
      }
      const value = rewardSnapshotRef.current[agentType];
      return value;
    },
    [logMessage],
  );

  // Reset rewards snapshot so downstream waits don't use stale values.
  const markRewardSnapshotPending = useCallback((agentType: AgentType) => {
    rewardSnapshotRef.current[agentType] = undefined;
    setRewardsTick((value) => value + 1);
  }, []);

  const getRewardSnapshot = useCallback(
    (agentType: AgentType) => rewardSnapshotRef.current[agentType],
    [],
  );

  const setRewardSnapshot = useCallback(
    (agentType: AgentType, value: boolean | undefined) => {
      rewardSnapshotRef.current[agentType] = value;
      setRewardsTick((current) => current + 1);
    },
    [],
  );

  const getBalancesStatus = useCallback(
    () => ({
      ready: balancesReadyRef.current,
      loading: balancesLoadingRef.current,
    }),
    [],
  );

  // Wait until the running agent type matches the requested agent.
  const waitForRunningAgent = useCallback(
    async (agentType: AgentType, timeoutSeconds: number) => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutSeconds * 1000) {
        if (runningAgentTypeRef.current === agentType) return true;
        await delayInSeconds(5);
      }
      logMessage(`running timeout: ${agentType}`);
      return false;
    },
    [logMessage],
  );

  // Wait until the running agent type no longer matches the given agent.
  const waitForStoppedAgent = useCallback(
    async (agentType: AgentType, timeoutSeconds: number) => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutSeconds * 1000) {
        if (runningAgentTypeRef.current !== agentType) return true;
        await delayInSeconds(5);
      }
      logMessage(`stop timeout: ${agentType}`);
      return false;
    },
    [logMessage],
  );

  // Schedule a delayed scan and bump the tick when it fires.
  const scheduleNextScan = useCallback((delaySeconds: number) => {
    if (!enabledRef.current) return;
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    scanTimeoutRef.current = setTimeout(() => {
      scanTimeoutRef.current = null;
      setScanTick((value) => value + 1);
    }, delaySeconds * 1000);
  }, []);

  return {
    enabledRef,
    runningAgentTypeRef,
    rewardSnapshotRef,
    lastRewardsEligibilityRef,
    scanTick,
    rewardsTick,
    scheduleNextScan,
    waitForAgentSelection,
    waitForBalancesReady,
    waitForRewardsEligibility,
    waitForRunningAgent,
    waitForStoppedAgent,
    markRewardSnapshotPending,
    getRewardSnapshot,
    setRewardSnapshot,
    getBalancesStatus,
  };
};
