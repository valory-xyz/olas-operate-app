import {
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { AgentType } from '@/constants';
import { useAgentRunning, useRewardContext, useStartService } from '@/hooks';

import {
  AUTO_RUN_VERBOSE_LOGS,
  AutoRunHealthMetric,
  HEALTH_SUMMARY_INTERVAL_SECONDS,
} from '../constants';
import { AgentMeta } from '../types';
import { isStakingEpochExpired } from '../utils/autoRunHelpers';
import { useAutoRunLifecycle } from './useAutoRunLifecycle';
import { useAutoRunOperations } from './useAutoRunOperations';
import { useAutoRunScanner } from './useAutoRunScanner';
import { useAutoRunSignals } from './useAutoRunSignals';
import { useLogAutoRunEvent } from './useLogAutoRunEvent';

type UseAutoRunControllerParams = {
  enabled: boolean;
  orderedIncludedInstances: string[];
  configuredAgents: AgentMeta[];
  updateSelectedServiceConfigId: (serviceConfigId: string) => void;
  selectedAgentType: AgentType;
  selectedServiceConfigId: string | null;
  isSelectedAgentDetailsLoading: boolean;
  getSelectedEligibility: () => {
    canRun: boolean;
    reason?: string;
    loadingReason?: string;
  };
  createSafeIfNeeded: (meta: AgentMeta) => Promise<void>;
  /** Ref that is `true` when the user is on a page where agent switching is
   *  allowed (see AGENT_SWITCH_ALLOWED_PAGES). When false, the scanner will
   *  not call updateAgentType and will reschedule instead. */
  canSwitchAgentRef: MutableRefObject<boolean>;
  showNotification?: (title: string, body?: string) => void;
  onAutoRunInstanceStarted?: (serviceConfigId: string) => void;
  onAutoRunStartStateChange?: (isStarting: boolean) => void;
};

/**
 * Thin composition hook:
 * - `useAutoRunSignals`: shared runtime refs + wait helpers
 * - `useAutoRunOperations`: start/stop/retry primitives
 * - `useAutoRunScanner`: queue traversal and candidate selection
 * - `useAutoRunLifecycle`: effects (rotation, polling, resume-after-stop)
 *
 * Example:
 * Selected instance = `sc-xyz`, running instance = `sc-123`.
 * - Controller wires all pieces so lifecycle can stop `sc-123`,
 * - scanner can pick next candidate and
 * - operations can start it safely.
 */
export const useAutoRunController = ({
  enabled,
  orderedIncludedInstances,
  configuredAgents,
  updateSelectedServiceConfigId,
  selectedAgentType,
  selectedServiceConfigId,
  isSelectedAgentDetailsLoading,
  getSelectedEligibility,
  createSafeIfNeeded,
  canSwitchAgentRef,
  showNotification,
  onAutoRunInstanceStarted,
  onAutoRunStartStateChange,
}: UseAutoRunControllerParams) => {
  const { isEligibleForRewards, stakingRewardsDetails } = useRewardContext();

  // Tracks whether the staking epoch has expired without a checkpoint
  // being called on-chain yet
  const isEpochExpired = useMemo(() => {
    if (!stakingRewardsDetails) return false;
    return isStakingEpochExpired(stakingRewardsDetails);
  }, [stakingRewardsDetails]);
  const { runningAgentType, runningServiceConfigId } = useAgentRunning();
  const { startService } = useStartService();
  const { logMessage } = useLogAutoRunEvent();

  const healthStatsRef = useRef({
    startErrors: 0,
    stopTimeouts: 0,
    rewardsErrors: 0,
    eligibilityTimeouts: 0,
    rotationsSucceeded: 0,
  });

  const recordMetric = useCallback((metric: AutoRunHealthMetric) => {
    healthStatsRef.current[metric] += 1;
  }, []);

  useEffect(() => {
    if (!enabled || !AUTO_RUN_VERBOSE_LOGS) {
      healthStatsRef.current = {
        startErrors: 0,
        stopTimeouts: 0,
        rewardsErrors: 0,
        eligibilityTimeouts: 0,
        rotationsSucceeded: 0,
      };
      return;
    }

    const intervalId = setInterval(() => {
      const snapshot = { ...healthStatsRef.current };
      const hasEvents = Object.values(snapshot).some((count) => count > 0);
      if (!hasEvents) return;
      logMessage(
        `health summary: startErrors=${snapshot.startErrors} stopTimeouts=${snapshot.stopTimeouts} rewardsErrors=${snapshot.rewardsErrors} eligibilityTimeouts=${snapshot.eligibilityTimeouts} rotationsSucceeded=${snapshot.rotationsSucceeded}`,
      );
      healthStatsRef.current = {
        startErrors: 0,
        stopTimeouts: 0,
        rewardsErrors: 0,
        eligibilityTimeouts: 0,
        rotationsSucceeded: 0,
      };
    }, HEALTH_SUMMARY_INTERVAL_SECONDS * 1000);

    return () => clearInterval(intervalId);
  }, [enabled, logMessage]);

  const {
    enabledRef,
    runningAgentTypeRef,
    runningServiceConfigIdRef,
    lastRewardsEligibilityRef,
    scanTick,
    rewardsTick,
    scheduleNextScan,
    hasScheduledScan,
    waitForInstanceSelection,
    waitForBalancesReady,
    waitForRewardsEligibility,
    waitForRunningInstance,
    markRewardSnapshotPending,
    getRewardSnapshot,
    setRewardSnapshot,
    getBalancesStatus,
  } = useAutoRunSignals({
    enabled,
    runningAgentType,
    runningServiceConfigId,
    isSelectedAgentDetailsLoading,
    isEligibleForRewards,
    isEpochExpired,
    selectedAgentType,
    selectedServiceConfigId,
    logMessage,
  });

  // Per-instance backoff after stop-timeout to avoid immediate re-trigger loops.
  const stopRetryBackoffUntilRef = useRef<Partial<Record<string, number>>>({});

  const {
    refreshRewardsEligibility,
    notifySkipOnce,
    startAgentWithRetries,
    stopAgentWithRecovery,
  } = useAutoRunOperations({
    enabled,
    enabledRef,
    runningServiceConfigIdRef,
    configuredAgents,
    updateSelectedServiceConfigId,
    getSelectedEligibility,
    createSafeIfNeeded,
    canSwitchAgentRef,
    showNotification,
    onAutoRunInstanceStarted,
    onAutoRunStartStateChange,
    startService,
    waitForInstanceSelection,
    waitForBalancesReady,
    waitForRunningInstance,
    getBalancesStatus,
    getRewardSnapshot,
    setRewardSnapshot,
    recordMetric,
    logMessage,
  });

  const {
    getPreferredStartFrom,
    scanAndStartNext,
    startSelectedAgentIfEligible,
  } = useAutoRunScanner({
    enabledRef,
    canSwitchAgentRef,
    orderedIncludedInstances,
    configuredAgents,
    selectedServiceConfigId,
    updateSelectedServiceConfigId,
    getSelectedEligibility,
    waitForInstanceSelection,
    waitForBalancesReady,
    waitForRewardsEligibility,
    refreshRewardsEligibility,
    markRewardSnapshotPending,
    getRewardSnapshot,
    getBalancesStatus,
    notifySkipOnce,
    startAgentWithRetries,
    scheduleNextScan,
    recordMetric,
    logMessage,
  });

  const { stopCurrentRunningAgent } = useAutoRunLifecycle({
    enabled,
    runningAgentType,
    runningServiceConfigId,
    orderedIncludedInstances,
    enabledRef,
    runningAgentTypeRef,
    runningServiceConfigIdRef,
    lastRewardsEligibilityRef,
    scanTick,
    rewardsTick,
    scheduleNextScan,
    hasScheduledScan,
    refreshRewardsEligibility,
    getRewardSnapshot,
    getPreferredStartFrom,
    scanAndStartNext,
    startSelectedAgentIfEligible,
    stopAgentWithRecovery,
    stopRetryBackoffUntilRef,
    recordMetric,
    logMessage,
  });

  return {
    stopRunningAgent: stopCurrentRunningAgent,
    runningAgentType,
  };
};
