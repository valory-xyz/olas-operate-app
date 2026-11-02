import { useCallback, useEffect, useMemo, useRef } from 'react';

import { AGENT_CONFIG } from '@/config/agents';
import { AgentMap, AgentType, EvmChainId } from '@/constants';
import {
  useActivityGoal,
  useAgentRunning,
  useEpochWorkStatus,
  useRewardContext,
  useStartService,
} from '@/hooks';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useIsAgentGeoRestricted } from '@/hooks/useIsAgentGeoRestricted';
import { useIsInitiallyFunded } from '@/hooks/useIsInitiallyFunded';
import { isNoStakingProgram } from '@/utils/stakingProgram';

import {
  AUTO_RUN_VERBOSE_LOGS,
  AutoRunHealthMetric,
  HEALTH_SUMMARY_INTERVAL_SECONDS,
} from '../constants';
import { AgentMeta } from '../types';
import {
  FetchDeployabilityContext,
  fetchDeployabilityForAgent,
  getUsableRewardStatus,
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
  showNotification,
  onAutoRunInstanceStarted,
  onAutoRunStartStateChange,
}: UseAutoRunControllerParams) => {
  const {
    stakingRewardsDetails,
    stakingRewardsDataUpdatedAt,
    isEpochTargetMet,
  } = useRewardContext();
  // Staking KPI and activity goal combined, so the selection-driven snapshot
  // agrees with the one `refreshRewardsEligibility` polls.
  const { isDoneForEpoch: isSelectedDoneForEpoch } = useEpochWorkStatus();
  // Read with the snapshot it is stored in; shares the Overview's query.
  const {
    activityGoal: selectedActivityGoal,
    dataUpdatedAt: selectedActivityGoalReadAt,
  } = useActivityGoal(selectedServiceConfigId);
  const selectedRewardReadAt = isEpochTargetMet
    ? Math.min(
        stakingRewardsDataUpdatedAt ?? 0,
        selectedActivityGoalReadAt ?? 0,
      )
    : (stakingRewardsDataUpdatedAt ?? 0);
  const selectedMeta = useMemo(
    () =>
      configuredAgents.find(
        (agent) => agent.serviceConfigId === selectedServiceConfigId,
      ),
    [configuredAgents, selectedServiceConfigId],
  );
  const isSelectedNoStakingAgent =
    !!selectedMeta && isNoStakingProgram(selectedMeta.stakingProgramId);
  const selectedRewardsEpoch = useMemo(
    () =>
      stakingRewardsDetails
        ? {
            tsCheckpoint: stakingRewardsDetails.tsCheckpoint,
            livenessPeriod: stakingRewardsDetails.livenessPeriod,
          }
        : undefined,
    [stakingRewardsDetails],
  );

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
  } = useAutoRunSignals({
    enabled,
    runningAgentType,
    runningServiceConfigId,
    isSelectedAgentDetailsLoading,
    isSelectedDoneForEpoch,
    isSelectedNoStakingAgent,
    isEpochExpired,
    selectedStakingProgramId: selectedMeta?.stakingProgramId,
    selectedRewardsEpoch,
    selectedActivityGoal,
    selectedRewardReadAt,
    selectedActivityGoalReadAt: selectedActivityGoalReadAt ?? 0,
    selectedAgentType,
    selectedServiceConfigId,
    logMessage,
  });

  // Per-instance backoff after stop-timeout to avoid immediate re-trigger loops.
  const stopRetryBackoffUntilRef = useRef<Partial<Record<string, number>>>({});

  // Build the deployability callback that scanAndStartNext uses instead of
  // switching UI selection. Captures stable refs/callbacks so it doesn't
  // change on every render.
  //
  // `stoppedId` is an instance whose stop the scan saw confirmed: it is not
  // running, whatever the deployment poll still reports.
  const getDeployabilityForAgent = useCallback(
    (
      agentMeta: AgentMeta,
      options?: Pick<FetchDeployabilityContext, 'ignoreRunningAgent'> & {
        stoppedId?: string;
      },
    ) => {
      const { stoppedId, ...contextOptions } = options ?? {};
      const runningId = runningServiceConfigIdRef.current;
      return fetchDeployabilityForAgent(agentMeta, {
        runningServiceConfigId:
          stoppedId && runningId === stoppedId ? null : runningId,
        canCreateSafeForChain,
        allowStartAgentByServiceConfigId,
        hasBalancesForServiceConfigId,
        isInstanceInitiallyFunded,
        isGeoRestrictedForAgent,
        logMessage,
        ...contextOptions,
      });
    },
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

  // The stored rewards status, `undefined` when it cannot decide without a read.
  const getRewardStatus = useCallback(
    (serviceConfigId: string) => {
      const agentMeta = configuredAgents.find(
        (agent) => agent.serviceConfigId === serviceConfigId,
      );
      if (!agentMeta) return undefined;
      return getUsableRewardStatus(getRewardSnapshot(serviceConfigId), {
        stakingProgramId: agentMeta.stakingProgramId,
        nowMs: Date.now(),
        observedGoal: getObservedGoal(serviceConfigId),
        isStalled:
          runningServiceConfigIdRef.current === serviceConfigId &&
          isStalled(serviceConfigId),
      });
    },
    [
      configuredAgents,
      getObservedGoal,
      getRewardSnapshot,
      isStalled,
      runningServiceConfigIdRef,
    ],
  );

  const {
    refreshRewardsEligibility,
    notifyGoalReachedOnHandOver,
    notifySkipOnce,
    startAgentWithRetries,
    stopAgentWithRecovery,
  } = useAutoRunOperations({
    enabled,
    enabledRef,
    runningServiceConfigIdRef,
    stallClockRef,
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
    getObservedGoal,
    recordMetric,
    logMessage,
  });

  const {
    getPreferredStartFrom,
    scanAndStartNext,
    startSelectedAgentIfEligible,
  } = useAutoRunScanner({
    enabledRef,
    orderedIncludedInstances,
    configuredAgents,
    selectedServiceConfigId,
    getSelectedEligibility,
    waitForInstanceSelection,
    waitForBalancesReady,
    refreshRewardsEligibility,
    getRewardStatus,
    isStallDeferred,
    clearStallDeferral,
    getBalancesStatus,
    notifySkipOnce,
    getDeployabilityForAgent,
    startAgentWithRetries,
    scheduleNextScan,
    recordMetric,
    logMessage,
  });

  // Deployability of the instance that is *currently running*, for the eviction
  // watchdog. `getDeployabilityForAgent` excludes an agent when another one is
  // running, so it already answers meaningfully when asked about the running
  // instance itself.
  const getDeployabilityForRunningInstance = useCallback(async () => {
    const currentId = runningServiceConfigIdRef.current;
    if (!currentId) return null;
    const agentMeta = configuredAgents.find(
      (agent) => agent.serviceConfigId === currentId,
    );
    if (!agentMeta) return null;
    return getDeployabilityForAgent(agentMeta);
  }, [configuredAgents, getDeployabilityForAgent, runningServiceConfigIdRef]);

  // Deployability of a possible successor while the current instance still
  // runs. The running gate is ignored: the question is whether this instance
  // could start once the current one is stopped.
  const getHandOverDeployability = useCallback(
    async (serviceConfigId: string) => {
      const agentMeta = configuredAgents.find(
        (agent) => agent.serviceConfigId === serviceConfigId,
      );
      if (!agentMeta) return null;
      return getDeployabilityForAgent(agentMeta, { ignoreRunningAgent: true });
    },
    [configuredAgents, getDeployabilityForAgent],
  );

  const { stopCurrentRunningAgent } = useAutoRunLifecycle({
    enabled,
    runningAgentType,
    runningServiceConfigId,
    orderedIncludedInstances,
    configuredAgents,
    enabledRef,
    runningAgentTypeRef,
    runningServiceConfigIdRef,
    lastRewardsEligibilityRef,
    scanTick,
    rewardsTick,
    scheduleNextScan,
    hasScheduledScan,
    refreshRewardsEligibility,
    isStalled,
    restartStallClock,
    deferStalled,
    isStallDeferred,
    getPreferredStartFrom,
    scanAndStartNext,
    startSelectedAgentIfEligible,
    stopAgentWithRecovery,
    startAgentWithRetries,
    getDeployabilityForRunningInstance,
    getHandOverDeployability,
    notifyGoalReachedOnHandOver,
    stopRetryBackoffUntilRef,
    recordMetric,
    logMessage,
  });

  return {
    stopRunningAgent: stopCurrentRunningAgent,
    runningAgentType,
  };
};
