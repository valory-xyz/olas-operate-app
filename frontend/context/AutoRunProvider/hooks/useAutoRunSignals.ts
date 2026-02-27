import { useCallback, useEffect, useRef, useState } from 'react';

import { AgentType } from '@/constants';
import { useBalanceAndRefillRequirementsContext } from '@/hooks';
import { sleepAwareDelay } from '@/utils/delay';

/**
 * Constants for timeouts and intervals used in auto-run signals,
 * such as waiting for rewards eligibility or balances to be ready.
 */
const REWARDS_WAIT_TIMEOUT_SECONDS = 20;
const AGENT_SELECTION_WAIT_TIMEOUT_SECONDS = 60;
const BALANCES_WAIT_TIMEOUT_SECONDS = 3 * 60;

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
  const isRefetchingBalancesRef = useRef(false);
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
    selectedServiceConfigIdRef.current = selectedServiceConfigId;
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
      const startedAt = Date.now();
      while (enabledRef.current) {
        const isSelectedAgent =
          !isSelectedAgentDetailsLoadingRef.current &&
          selectedAgentTypeRef.current === agentType &&
          (serviceConfigId == null ||
            selectedServiceConfigIdRef.current === serviceConfigId);
        if (isSelectedAgent) {
          return true;
        }
        if (
          Date.now() - startedAt >
          AGENT_SELECTION_WAIT_TIMEOUT_SECONDS * 1000
        ) {
          logMessage(
            `selection wait timeout: ${agentType}${serviceConfigId ? ` (${serviceConfigId})` : ''}`,
          );
          return false;
        }
        const ok = await sleepAwareDelay(2);
        if (!ok) return false;
      }
      return false;
    },
    [logMessage],
  );

  // Track when balance data was last updated to detect stale data after sleep/wake.
  const balanceLastUpdatedRef = useRef(Date.now());
  useEffect(() => {
    balanceLastUpdatedRef.current = Date.now();
  }, [isBalancesAndFundingRequirementsReadyForAllServices]);

  // Wait until balances are ready, with periodic refetches on long waits.
  // After sleep/wake the balance ref may still be `true` from before sleep,
  // so we also check freshness before accepting the cached value.
  const BALANCE_STALENESS_MS = 60_000;
  const didLogStaleRef = useRef(false);

  // Reset the stale log flag when balance data actually updates.
  useEffect(() => {
    didLogStaleRef.current = false;
  }, [isBalancesAndFundingRequirementsReadyForAllServices]);

  const waitForBalancesReady = useCallback(async () => {
    const isFresh = () =>
      Date.now() - balanceLastUpdatedRef.current < BALANCE_STALENESS_MS;
    const startedAt = Date.now();

    if (balancesReadyRef.current && !balancesLoadingRef.current && isFresh()) {
      return true;
    }

    // If balances are stale (e.g. after sleep), force a refetch.
    if (!isFresh()) {
      if (!didLogStaleRef.current) {
        logMessage('balances stale, triggering refetch');
        didLogStaleRef.current = true;
      }
      if (!isRefetchingBalancesRef.current) {
        isRefetchingBalancesRef.current = true;
        refetch()
          .then(() => {
            balanceLastUpdatedRef.current = Date.now();
          })
          .catch((error) => {
            logMessage(`balances refetch failed: ${error}`);
          })
          .finally(() => {
            isRefetchingBalancesRef.current = false;
          });
      }
    }

    let lastRefetchAt = Date.now();
    while (enabledRef.current) {
      if (
        balancesReadyRef.current &&
        !balancesLoadingRef.current &&
        isFresh()
      ) {
        return true;
      }
      const ok = await sleepAwareDelay(2);
      if (!ok) return false;
      const now = Date.now();
      if (now - lastRefetchAt >= 15000 && !isRefetchingBalancesRef.current) {
        lastRefetchAt = now;
        isRefetchingBalancesRef.current = true;
        refetch()
          .then(() => {
            balanceLastUpdatedRef.current = Date.now();
          })
          .catch((error) => {
            logMessage(`balances refetch failed: ${error}`);
          })
          .finally(() => {
            isRefetchingBalancesRef.current = false;
          });
      }
      if (now - startedAt > BALANCES_WAIT_TIMEOUT_SECONDS * 1000) {
        logMessage('balances wait timeout');
        return false;
      }
    }
    return false;
  }, [logMessage, refetch]);

  // Wait for rewards eligibility to be populated for a given agent.
  const waitForRewardsEligibility = useCallback(
    async (agentType: AgentType) => {
      const startedAt = Date.now();
      while (
        rewardSnapshotRef.current[agentType] === undefined &&
        enabledRef.current
      ) {
        if (Date.now() - startedAt > REWARDS_WAIT_TIMEOUT_SECONDS * 1000) {
          logMessage(
            `rewards eligibility timeout: ${agentType}, proceeding without it`,
          );
          return undefined;
        }
        const ok = await sleepAwareDelay(2);
        if (!ok) return undefined;
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
      while (
        enabledRef.current &&
        Date.now() - startedAt < timeoutSeconds * 1000
      ) {
        if (runningAgentTypeRef.current === agentType) return true;
        const ok = await sleepAwareDelay(5);
        if (!ok) return false;
      }
      if (enabledRef.current) logMessage(`running timeout: ${agentType}`);
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
    markRewardSnapshotPending,
    getRewardSnapshot,
    setRewardSnapshot,
    getBalancesStatus,
  };
};
