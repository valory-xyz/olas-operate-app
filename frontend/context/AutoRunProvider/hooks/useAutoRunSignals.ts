import { useCallback, useEffect, useRef, useState } from 'react';

import {
  AgentType,
  isRunningDeploymentStatus,
  StakingProgramId,
} from '@/constants';
import { useBalanceAndRefillRequirementsContext } from '@/hooks';
import { ActivityGoal, StakingRewardsInfo } from '@/types';
import { sleepAwareDelay } from '@/utils/delay';

import {
  AGENT_SELECTION_WAIT_TIMEOUT_SECONDS,
  REWARDS_POLL_SECONDS,
} from '../constants';
import { ObservedGoal, RewardSnapshot, StallClock } from '../types';
import {
  isStakingEpochExpired,
  isStallClockExpired,
} from '../utils/autoRunHelpers';
import { probeDeploymentStatus } from '../utils/probeDeployment';

const BALANCES_WAIT_TIMEOUT_SECONDS = AGENT_SELECTION_WAIT_TIMEOUT_SECONDS * 3;
const BALANCE_STALENESS_MS = REWARDS_POLL_SECONDS * 1000;

type UseAutoRunSignalsParams = {
  enabled: boolean;
  runningAgentType: AgentType | null;
  runningServiceConfigId: string | null;
  isSelectedAgentDetailsLoading: boolean;
  /**
   * Selected instance is done for the epoch: staking KPI (regime-aware) and
   * activity goal both met — the rotation signal.
   */
  isSelectedDoneForEpoch: boolean | undefined;
  /**
   * Selected instance has no staking (Connect). Its done signal comes only
   * from `refreshRewardsEligibility`, so the selection must not overwrite it.
   */
  isSelectedNoStakingAgent: boolean;
  /** Whether the staking epoch has expired without a checkpoint being called. */
  isEpochExpired: boolean;
  /** Selected instance's staking program, stored with its snapshot. */
  selectedStakingProgramId: StakingProgramId | undefined;
  /** Selected instance's epoch, stored with its snapshot. */
  selectedRewardsEpoch:
    | Pick<StakingRewardsInfo, 'tsCheckpoint' | 'livenessPeriod'>
    | undefined;
  /** Selected instance's activity goal, stored with its snapshot. */
  selectedActivityGoal: ActivityGoal | null | undefined;
  selectedAgentType: AgentType;
  selectedServiceConfigId: string | null;
  logMessage: (message: string) => void;
};

/**
 * Runtime signal hub for auto-run.
 *
 * This hook keeps mutable refs in sync with the latest UI/network state so
 * long-running async loops can read fresh values without stale-closure bugs.
 *
 * Example:
 * Scanner selects instance `sc-aaa` → waits for selection/balances/rewards →
 * this hook provides those waits and snapshot reads.
 */
export const useAutoRunSignals = ({
  enabled,
  runningAgentType,
  runningServiceConfigId,
  isSelectedAgentDetailsLoading,
  isSelectedDoneForEpoch,
  isSelectedNoStakingAgent,
  isEpochExpired,
  selectedStakingProgramId,
  selectedRewardsEpoch,
  selectedActivityGoal,
  selectedAgentType,
  selectedServiceConfigId,
  logMessage,
}: UseAutoRunSignalsParams) => {
  const {
    isBalancesAndFundingRequirementsLoadingForAllServices,
    isBalancesAndFundingRequirementsReadyForAllServices,
    refetch,
  } = useBalanceAndRefillRequirementsContext();

  // NOTE: refs are intentionally used here so async loops can always read the latest
  // values even if React re-renders while a wait loop is in progress.
  const enabledRef = useRef(enabled);
  const runningAgentTypeRef = useRef(runningAgentType);
  const runningServiceConfigIdRef = useRef(runningServiceConfigId);
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
  // Latest rewards read per instance, from the poll or the selected
  // instance's RewardProvider data. Never wiped: checked when used.
  const rewardSnapshotRef = useRef<
    Partial<Record<string, RewardSnapshot | undefined>>
  >({});
  // Latest activity goal seen for each instance outside a rewards read.
  const observedGoalRef = useRef<Partial<Record<string, ObservedGoal>>>({});
  // Track the previous rewards state to detect transitions.
  const lastRewardsEligibilityRef = useRef<
    Partial<Record<string, boolean | undefined>>
  >({});
  // When the running instance's activity goal last moved. In memory only.
  const stallClockRef = useRef<Partial<Record<string, StallClock>>>({});
  // Instances moved on from for a stall, with the epoch that happened in.
  const stallDeferredRef = useRef<
    Partial<Record<string, { tsCheckpoint: number }>>
  >({});
  // Timer + tick pair used for delayed re-scans.
  // Scheduling sets a timeout; when it fires we bump scanTick to trigger effects.
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scanTick, setScanTick] = useState(0);
  const [rewardsTick, setRewardsTick] = useState(0);

  // Keep the enabled ref fresh and clear any scheduled scan on disable.
  useEffect(() => {
    enabledRef.current = enabled;
    if (enabled) return;
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    stallClockRef.current = {};
    stallDeferredRef.current = {};
  }, [enabled]);

  // Keep refs aligned with latest render values.
  useEffect(() => {
    runningAgentTypeRef.current = runningAgentType;
  }, [runningAgentType]);
  // Only the running instance has a stall clock, and a new run gets a fresh one.
  useEffect(() => {
    runningServiceConfigIdRef.current = runningServiceConfigId;
    stallClockRef.current = {};
  }, [runningServiceConfigId]);
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

  // A stored `true` read with another goal no longer decides on its own.
  useEffect(() => {
    if (!selectedServiceConfigId) return;
    if (selectedActivityGoal === undefined) return;
    observedGoalRef.current[selectedServiceConfigId] = {
      goal: selectedActivityGoal,
      observedAt: Date.now(),
    };
  }, [selectedActivityGoal, selectedServiceConfigId]);

  // Update rewards snapshot for the selected instance (RewardProvider is selection-driven).
  // isSelectedDoneForEpoch=true means the instance has done its epoch work
  // (staking KPI and activity goal), matching `refreshRewardsEligibility`.
  // However if the epoch has already expired (clock = 0, checkpoint not yet called),
  // that value is stale — the instance needs to run in the new epoch to trigger checkpoint.
  // We check both conditions separately rather than modifying the business value itself.
  // An unknown value is not written: the last read stays, and is checked when used.
  useEffect(() => {
    if (!selectedServiceConfigId) return;
    if (isSelectedNoStakingAgent) return;
    if (isSelectedDoneForEpoch === undefined) return;
    if (!selectedStakingProgramId || !selectedRewardsEpoch) return;
    rewardSnapshotRef.current[selectedServiceConfigId] = {
      done: isEpochExpired ? false : isSelectedDoneForEpoch,
      readAt: Date.now(),
      stakingProgramId: selectedStakingProgramId,
      tsCheckpoint: selectedRewardsEpoch.tsCheckpoint,
      livenessPeriod: selectedRewardsEpoch.livenessPeriod,
      goalUnit: selectedActivityGoal?.unit ?? null,
      goalTarget: selectedActivityGoal?.target ?? null,
      goalPeriodStart: selectedActivityGoal?.period_start ?? null,
    };
    setRewardsTick((value) => value + 1);
  }, [
    isSelectedDoneForEpoch,
    isEpochExpired,
    isSelectedNoStakingAgent,
    selectedActivityGoal,
    selectedRewardsEpoch,
    selectedServiceConfigId,
    selectedStakingProgramId,
  ]);

  // Cleanup pending scan timer on unmount.
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  // Wait until UI selection and selected service details match the requested instance.
  // Example: scanner requested `sc-aaa`; this blocks until UI state is actually on `sc-aaa`.
  const waitForInstanceSelection = useCallback(
    async (serviceConfigId: string) => {
      const startedAt = Date.now();
      while (enabledRef.current) {
        const isSelected =
          !isSelectedAgentDetailsLoadingRef.current &&
          selectedServiceConfigIdRef.current === serviceConfigId;
        if (isSelected) {
          return true;
        }
        if (
          Date.now() - startedAt >
          AGENT_SELECTION_WAIT_TIMEOUT_SECONDS * 1000
        ) {
          logMessage(`selection wait timeout: ${serviceConfigId}`);
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

    // If balances are stale (e.g. laptop slept), force a refetch once.
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
      if (now - startedAt > BALANCES_WAIT_TIMEOUT_SECONDS * 1000) {
        logMessage('balances wait timeout');
        return false;
      }
    }
    return false;
  }, [logMessage, refetch]);

  const getRewardSnapshot = useCallback(
    (serviceConfigId: string) => rewardSnapshotRef.current[serviceConfigId],
    [],
  );

  const setRewardSnapshot = useCallback(
    (serviceConfigId: string, snapshot: RewardSnapshot) => {
      rewardSnapshotRef.current[serviceConfigId] = snapshot;
      setRewardsTick((current) => current + 1);
    },
    [],
  );

  const getObservedGoal = useCallback(
    (serviceConfigId: string) => observedGoalRef.current[serviceConfigId],
    [],
  );

  const isStalled = useCallback(
    (serviceConfigId: string) =>
      isStallClockExpired(stallClockRef.current[serviceConfigId], Date.now()),
    [],
  );

  const restartStallClock = useCallback((serviceConfigId: string) => {
    const clock = stallClockRef.current[serviceConfigId];
    if (clock) clock.since = Date.now();
  }, []);

  const deferStalled = useCallback((serviceConfigId: string) => {
    delete stallClockRef.current[serviceConfigId];
    const snapshot = rewardSnapshotRef.current[serviceConfigId];
    stallDeferredRef.current[serviceConfigId] = {
      tsCheckpoint: snapshot?.tsCheckpoint ?? 0,
    };
  }, []);

  const clearStallDeferral = useCallback((serviceConfigId: string) => {
    delete stallDeferredRef.current[serviceConfigId];
  }, []);

  // A deferral lasts for the epoch it happened in.
  const isStallDeferred = useCallback((serviceConfigId: string) => {
    const deferral = stallDeferredRef.current[serviceConfigId];
    if (!deferral) return false;
    const snapshot = rewardSnapshotRef.current[serviceConfigId];
    if (
      snapshot &&
      (snapshot.tsCheckpoint !== deferral.tsCheckpoint ||
        isStakingEpochExpired(snapshot))
    ) {
      delete stallDeferredRef.current[serviceConfigId];
      return false;
    }
    return true;
  }, []);

  const getBalancesStatus = useCallback(
    () => ({
      ready: balancesReadyRef.current,
      loading: balancesLoadingRef.current,
    }),
    [],
  );

  // Wait until the deployment for `serviceConfigId` reaches a running state
  // (DEPLOYED or DEPLOYING). Probes the backend directly instead of trusting
  // `runningServiceConfigIdRef`, because the ref is mirrored via React-Query
  // polling and can lag the just-started agent by several seconds — long
  // enough to time out a rotation and mask success as
  // `start_confirm status=timeout`. Note: STOPPING is *not* treated as
  // running here — a deployment mid-stop hasn't fulfilled the start request.
  const waitForRunningInstance = useCallback(
    async (serviceConfigId: string, timeoutSeconds: number) => {
      const startedAt = Date.now();
      while (
        enabledRef.current &&
        Date.now() - startedAt < timeoutSeconds * 1000
      ) {
        try {
          const deployment = await probeDeploymentStatus(serviceConfigId);
          if (isRunningDeploymentStatus(deployment?.status)) return true;
        } catch {
          // Transient probe failure — keep polling within the outer budget.
        }
        const ok = await sleepAwareDelay(5);
        if (!ok) return false;
      }
      if (enabledRef.current) logMessage(`running timeout: ${serviceConfigId}`);
      return false;
    },
    [logMessage],
  );

  // Schedule a delayed scan and bump the tick when it fires.
  const scheduleNextScan = useCallback((delaySeconds: number) => {
    // Re-arm scan timer on each schedule call so only the latest schedule wins.
    if (!enabledRef.current) return;
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    scanTimeoutRef.current = setTimeout(() => {
      scanTimeoutRef.current = null;
      setScanTick((value) => value + 1);
    }, delaySeconds * 1000);
  }, []);

  const hasScheduledScan = useCallback(
    () => scanTimeoutRef.current !== null,
    [],
  );

  return {
    enabledRef,
    runningAgentTypeRef,
    runningServiceConfigIdRef,
    rewardSnapshotRef,
    lastRewardsEligibilityRef,
    stallClockRef,
    scanTick,
    rewardsTick,
    scheduleNextScan,
    hasScheduledScan,
    waitForInstanceSelection,
    waitForBalancesReady,
    waitForRunningInstance,
    getRewardSnapshot,
    setRewardSnapshot,
    getObservedGoal,
    isStalled,
    restartStallClock,
    deferStalled,
    clearStallDeferral,
    isStallDeferred,
    getBalancesStatus,
  };
};
