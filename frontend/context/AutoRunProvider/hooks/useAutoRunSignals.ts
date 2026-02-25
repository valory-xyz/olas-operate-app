import { useCallback, useEffect, useRef, useState } from 'react';

import { AgentType } from '@/constants';
import { useBalanceAndRefillRequirementsContext } from '@/hooks';
import { delayInSeconds } from '@/utils/delay';

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

  // Refs keep async loops in sync with live state.
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
    logMessage(`running agent update: ${String(runningAgentType)}`);
  }, [runningAgentType, logMessage]);

  // Track selected-agent loading state to avoid stale closures.
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

  // Track current UI selection and its service config id.
  useEffect(() => {
    selectedAgentTypeRef.current = selectedAgentType;
  }, [selectedAgentType]);

  useEffect(() => {
    const previous = selectedServiceConfigIdRef.current;
    selectedServiceConfigIdRef.current = selectedServiceConfigId;
    if (selectedServiceConfigId && selectedServiceConfigId !== previous) {
      didRefetchBalancesRef.current = false;
      logMessage(`balances selection changed: ${selectedServiceConfigId}`);
    }
  }, [logMessage, selectedServiceConfigId]);

  // Update rewards snapshot for the selected agent (RewardProvider is selection-driven).
  useEffect(() => {
    if (!selectedAgentType) return;
    rewardSnapshotRef.current[selectedAgentType] = isEligibleForRewards;
    logMessage(
      `rewards snapshot: ${selectedAgentType} -> ${String(isEligibleForRewards)}`,
    );
    setRewardsTick((value) => value + 1);
  }, [isEligibleForRewards, logMessage, selectedAgentType]);

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
      logMessage(`waiting for selection: ${agentType}`);
      while (enabledRef.current) {
        if (
          !isSelectedAgentDetailsLoadingRef.current &&
          selectedAgentTypeRef.current === agentType &&
          (serviceConfigId == null ||
            selectedServiceConfigIdRef.current === serviceConfigId)
        ) {
          logMessage(`selection ready: ${agentType}`);
          return true;
        }
        await delayInSeconds(2);
      }
      return false;
    },
    [logMessage],
  );

  const waitForBalancesReady = useCallback(async () => {
    if (balancesReadyRef.current && !balancesLoadingRef.current) {
      logMessage('balances already ready');
      return true;
    }
    logMessage('waiting for balances readiness');
    let lastLogAt = Date.now();
    let lastRefetchAt = Date.now();
    while (enabledRef.current) {
      if (balancesReadyRef.current && !balancesLoadingRef.current) {
        logMessage('balances ready');
        return true;
      }
      await delayInSeconds(2);
      const now = Date.now();
      if (!didRefetchBalancesRef.current && now - lastRefetchAt >= 15000) {
        didRefetchBalancesRef.current = true;
        lastRefetchAt = now;
        logMessage('balances still loading: triggering refetch');
        refetch().catch((error) => {
          logMessage(`balances refetch failed: ${error}`);
        });
      }
      if (now - lastLogAt >= 10000) {
        const details = ` loading=${String(balancesLoadingRef.current)} selected=${selectedServiceConfigIdRef.current ?? 'none'}`;
        logMessage(
          `balances still loading: ready=${String(
            balancesReadyRef.current,
          )}${details}`,
        );
        lastLogAt = now;
      }
    }
    return false;
  }, [logMessage, refetch]);

  // Wait for rewards eligibility to be populated for a given agent.
  const waitForRewardsEligibility = useCallback(
    async (agentType: AgentType) => {
      logMessage(`waiting for rewards eligibility: ${agentType}`);
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
      logMessage(`rewards eligibility: ${agentType} -> ${String(value)}`);
      return value;
    },
    [logMessage],
  );

  // Reset rewards snapshot so downstream waits don't use stale values.
  const markRewardSnapshotPending = useCallback(
    (agentType: AgentType) => {
      rewardSnapshotRef.current[agentType] = undefined;
      logMessage(`rewards snapshot reset: ${agentType}`);
      setRewardsTick((value) => value + 1);
    },
    [logMessage],
  );

  const getRewardSnapshot = useCallback(
    (agentType: AgentType) => rewardSnapshotRef.current[agentType],
    [],
  );

  const setRewardSnapshot = useCallback(
    (agentType: AgentType, value: boolean | undefined) => {
      rewardSnapshotRef.current[agentType] = value;
      logMessage(`rewards snapshot: ${agentType} -> ${String(value)}`);
      setRewardsTick((current) => current + 1);
    },
    [logMessage],
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
      logMessage(`waiting for running agent: ${agentType}`);
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutSeconds * 1000) {
        if (runningAgentTypeRef.current === agentType) {
          logMessage(`running confirmed: ${agentType}`);
          return true;
        }
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
      logMessage(`waiting for stop: ${agentType}`);
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutSeconds * 1000) {
        if (runningAgentTypeRef.current !== agentType) {
          logMessage(`stop confirmed: ${agentType}`);
          return true;
        }
        await delayInSeconds(5);
      }
      logMessage(`stop timeout: ${agentType}`);
      return false;
    },
    [logMessage],
  );

  // Schedule a delayed scan and bump the tick when it fires.
  const scheduleNextScan = useCallback(
    (delaySeconds: number) => {
      if (!enabledRef.current) return;
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
      logMessage(`next scan scheduled in ${delaySeconds}s`);
      scanTimeoutRef.current = setTimeout(() => {
        scanTimeoutRef.current = null;
        setScanTick((value) => value + 1);
      }, delaySeconds * 1000);
    },
    [logMessage],
  );

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
const REWARDS_WAIT_TIMEOUT_SECONDS = 20;
