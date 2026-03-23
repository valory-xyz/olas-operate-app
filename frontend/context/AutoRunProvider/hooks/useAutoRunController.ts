import {
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { AGENT_CONFIG } from '@/config/agents';
import { AgentMap, AgentType, EvmChainId } from '@/constants';
import { useAgentRunning, useRewardContext, useStartService } from '@/hooks';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useIsAgentGeoRestricted } from '@/hooks/useIsAgentGeoRestricted';
import { useIsInitiallyFunded } from '@/hooks/useIsInitiallyFunded';

import {
  AUTO_RUN_VERBOSE_LOGS,
  AutoRunHealthMetric,
  HEALTH_SUMMARY_INTERVAL_SECONDS,
} from '../constants';
import { AgentMeta } from '../types';
import {
  fetchDeployabilityForAgent,
  isStakingEpochExpired,
} from '../utils/autoRunHelpers';
import { useAutoRunLifecycle } from './useAutoRunLifecycle';
import { useAutoRunOperations } from './useAutoRunOperations';
import { useAutoRunScanner } from './useAutoRunScanner';
import { useAutoRunSignals } from './useAutoRunSignals';
import { useLogAutoRunEvent } from './useLogAutoRunEvent';

type UseAutoRunControllerParams = {
  enabled: boolean;
  orderedIncludedInstances: string[];
  configuredAgents: AgentMeta[];
  selectedAgentType: AgentType;
  selectedServiceConfigId: string | null;
  isSelectedAgentDetailsLoading: boolean;
  getSelectedEligibility: () => {
    canRun: boolean;
    reason?: string;
    loadingReason?: string;
  };
  canCreateSafeForChain: (chainId: EvmChainId) => {
    ok: boolean;
    reason?: string;
    isLoading?: boolean;
  };
  createSafeIfNeeded: (meta: AgentMeta) => Promise<void>;
  /** Ref that is `true` when the user is on a page where scanning is allowed
   *  (see AGENT_SWITCH_ALLOWED_PAGES). When false, the scanner pauses and
   *  reschedules in SCAN_LOADING_RETRY_SECONDS instead of evaluating candidates. */
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
  selectedAgentType,
  selectedServiceConfigId,
  isSelectedAgentDetailsLoading,
  getSelectedEligibility,
  canCreateSafeForChain,
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

  // Balance and refill requirements — keyed per serviceConfigId, not selection-dependent.
  const { allowStartAgentByServiceConfigId, hasBalancesForServiceConfigId } =
    useBalanceAndRefillRequirementsContext();

  // Initial funding check — reads electron store, not selection-dependent.
  const { isInstanceInitiallyFunded } = useIsInitiallyFunded();

  // Geo-restriction check for Polystrat (the only geo-restricted agent).
  // Queried once here; result is passed into fetchDeployabilityForAgent as a
  // callback so it never touches the selection-keyed context.
  const { isAgentGeoRestricted: isPolystratGeoRestricted } =
    useIsAgentGeoRestricted({
      agentType: AgentMap.Polystrat,
      agentConfig: AGENT_CONFIG[AgentMap.Polystrat],
    });

  const isGeoRestrictedForAgent = useCallback(
    (agentType: AgentType) => {
      if (agentType === AgentMap.Polystrat) return isPolystratGeoRestricted;
      return false;
    },
    [isPolystratGeoRestricted],
  );

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

  // Build the deployability callback that scanAndStartNext uses instead of
  // switching UI selection. Captures stable refs/callbacks so it doesn't
  // change on every render.
  const getDeployabilityForAgent = useCallback(
    (agentMeta: AgentMeta) =>
      fetchDeployabilityForAgent(agentMeta, {
        runningServiceConfigId: runningServiceConfigIdRef.current,
        canCreateSafeForChain,
        allowStartAgentByServiceConfigId,
        hasBalancesForServiceConfigId,
        isInstanceInitiallyFunded,
        isGeoRestrictedForAgent,
        logMessage,
      }),
    [
      runningServiceConfigIdRef,
      canCreateSafeForChain,
      allowStartAgentByServiceConfigId,
      hasBalancesForServiceConfigId,
      isInstanceInitiallyFunded,
      isGeoRestrictedForAgent,
      logMessage,
    ],
  );

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
    createSafeIfNeeded,
    showNotification,
    onAutoRunInstanceStarted,
    onAutoRunStartStateChange,
    startService,
    waitForBalancesReady,
    waitForRunningInstance,
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
    getSelectedEligibility,
    waitForInstanceSelection,
    waitForBalancesReady,
    waitForRewardsEligibility,
    refreshRewardsEligibility,
    markRewardSnapshotPending,
    getRewardSnapshot,
    getBalancesStatus,
    notifySkipOnce,
    getDeployabilityForAgent,
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
