import { MutableRefObject, useCallback, useEffect, useRef } from 'react';

import { AgentType } from '@/constants';

import {
  AUTO_RUN_HEALTH_METRIC,
  AutoRunHealthMetricNoRotation,
} from '../constants';
import { AgentMeta } from '../types';
import { refreshRewardsEligibility as refreshRewardsEligibilityHelper } from '../utils/autoRunHelpers';
import {
  getInstanceDisplayNames,
  notifyGoalReached,
  notifySkipped,
} from '../utils/utils';
import { useAutoRunStartOperations } from './useAutoRunStartOperations';
import { useAutoRunStopOperations } from './useAutoRunStopOperations';
import { useAutoRunVerboseLogger } from './useAutoRunVerboseLogger';

type UseAutoRunOperationsParams = {
  enabled: boolean;
  enabledRef: MutableRefObject<boolean>;
  runningServiceConfigIdRef: MutableRefObject<string | null>;
  configuredAgents: AgentMeta[];
  createSafeIfNeeded: (meta: AgentMeta) => Promise<void>;
  showNotification?: (title: string, body?: string) => void;
  onAutoRunInstanceStarted?: (serviceConfigId: string) => void;
  onAutoRunStartStateChange?: (isStarting: boolean) => void;
  startService: (params: {
    agentType: AgentType;
    agentConfig: AgentMeta['agentConfig'];
    service: AgentMeta['service'];
    stakingProgramId: AgentMeta['stakingProgramId'];
    createSafeIfNeeded: () => Promise<void>;
  }) => Promise<unknown>;
  waitForBalancesReady: () => Promise<boolean>;
  waitForRunningInstance: (
    serviceConfigId: string,
    timeoutSeconds: number,
  ) => Promise<boolean>;
  getRewardSnapshot: (serviceConfigId: string) => boolean | undefined;
  setRewardSnapshot: (
    serviceConfigId: string,
    value: boolean | undefined,
  ) => void;
  recordMetric: (metric: AutoRunHealthMetricNoRotation) => void;
  logMessage: (message: string) => void;
};

/**
 * Composes operational primitives used by scanner/lifecycle:
 * - rewards refresh + skip notifications
 * - Connect run baseline + its one-per-turn goal-reached notification
 * - guarded start with retries
 * - stop with deployment confirmation and recovery retries
 */
export const useAutoRunOperations = ({
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
}: UseAutoRunOperationsParams) => {
  const logVerbose = useAutoRunVerboseLogger(logMessage);

  // Track per-instance skip reason to avoid spamming notifications.
  const skipNotifiedRef = useRef<Partial<Record<string, string>>>({});
  // Throttle rewards fetch per instance to avoid spamming the API.
  const lastRewardsFetchRef = useRef<Partial<Record<string, number>>>({});
  // Track when each instance was last started via AutoRun in this session.
  // Used by refreshRewardsEligibilityHelper to detect a stale
  // `epoch-target-met=true` that persists from a prior active run.
  const lastStartedAtRef = useRef<Partial<Record<string, number>>>({});
  // No-staking (Connect) runs completed after this unix-seconds baseline
  // count as done. Moved forward when a completed run is handled in place.
  const connectRunBaselineRef = useRef<Partial<Record<string, number>>>({});
  // Latest `last_met_at` read per no-staking instance.
  const connectLastMetAtRef = useRef<Partial<Record<string, number | null>>>(
    {},
  );
  // Start time (ms) of the turn whose goal-reached notification was sent.
  const goalNotifiedRef = useRef<Partial<Record<string, number>>>({});

  useEffect(() => {
    if (!enabled) {
      skipNotifiedRef.current = {};
      connectRunBaselineRef.current = {};
      connectLastMetAtRef.current = {};
      goalNotifiedRef.current = {};
    }
  }, [enabled]);

  /**
   * Baseline in unix seconds (the clock Connect stamps `last_met_at` with):
   * when Auto-run last started the instance, or, if it did not start it this
   * session, the moment it is first evaluated.
   */
  const getConnectRunBaseline = useCallback((serviceConfigId: string) => {
    const startedAtSeconds = Math.floor(
      (lastStartedAtRef.current[serviceConfigId] ?? 0) / 1000,
    );
    const advanced = connectRunBaselineRef.current[serviceConfigId];
    if (advanced === undefined && startedAtSeconds === 0) {
      const nowSeconds = Math.floor(Date.now() / 1000);
      connectRunBaselineRef.current[serviceConfigId] = nowSeconds;
      return nowSeconds;
    }
    return Math.max(advanced ?? 0, startedAtSeconds);
  }, []);

  const recordConnectLastMetAt = useCallback(
    (serviceConfigId: string, lastMetAt: number | null) => {
      connectLastMetAtRef.current[serviceConfigId] = lastMetAt;
    },
    [],
  );

  /**
   * Marks the completed run as handled while the no-staking instance keeps
   * running, so only the next completed run reports it done again.
   */
  const advanceConnectRunBaseline = useCallback(
    (serviceConfigId: string) => {
      const baseline = getConnectRunBaseline(serviceConfigId);
      const lastMetAt = connectLastMetAtRef.current[serviceConfigId] ?? null;
      connectRunBaselineRef.current[serviceConfigId] = Math.max(
        baseline,
        lastMetAt ?? baseline,
      );
      setRewardSnapshot(serviceConfigId, false);
    },
    [getConnectRunBaseline, setRewardSnapshot],
  );

  /** Sends the goal-reached notification at most once per Auto-run turn. */
  const notifyGoalReachedOnce = useCallback(
    (serviceConfigId: string) => {
      const turnStartedAt = lastStartedAtRef.current[serviceConfigId] ?? 0;
      if (goalNotifiedRef.current[serviceConfigId] === turnStartedAt) return;
      goalNotifiedRef.current[serviceConfigId] = turnStartedAt;
      const { agentName, instanceName } = getInstanceDisplayNames(
        serviceConfigId,
        configuredAgents,
      );
      notifyGoalReached(showNotification, agentName, instanceName);
      logMessage(`goal reached, handing over: ${serviceConfigId}`);
    },
    [configuredAgents, logMessage, showNotification],
  );

  // Wrap the caller's optional start callback so lastStartedAtRef is updated
  // on every successful AutoRun start. Caller's callback still fires after.
  const wrappedOnAutoRunInstanceStarted = useCallback(
    (serviceConfigId: string) => {
      lastStartedAtRef.current[serviceConfigId] = Date.now();
      onAutoRunInstanceStarted?.(serviceConfigId);
    },
    [onAutoRunInstanceStarted],
  );

  const refreshRewardsEligibility = useCallback(
    (serviceConfigId: string) =>
      refreshRewardsEligibilityHelper({
        serviceConfigId,
        configuredAgents,
        lastRewardsFetchRef,
        lastStartedAtRef,
        runningServiceConfigIdRef,
        getRewardSnapshot,
        setRewardSnapshot,
        logMessage,
        onRewardsFetchError: () =>
          recordMetric(AUTO_RUN_HEALTH_METRIC.REWARDS_ERRORS),
        getConnectRunBaseline,
        onConnectGoalRead: recordConnectLastMetAt,
      }),
    [
      configuredAgents,
      getConnectRunBaseline,
      getRewardSnapshot,
      recordConnectLastMetAt,
      logMessage,
      recordMetric,
      runningServiceConfigIdRef,
      setRewardSnapshot,
    ],
  );

  const notifySkipOnce = useCallback(
    (serviceConfigId: string, reason?: string, isLoadingReason = false) => {
      if (!reason) return;
      if (isLoadingReason) return;
      if (skipNotifiedRef.current[serviceConfigId] === reason) return;
      skipNotifiedRef.current[serviceConfigId] = reason;
      const { agentName, instanceName } = getInstanceDisplayNames(
        serviceConfigId,
        configuredAgents,
      );
      notifySkipped(showNotification, agentName, instanceName, reason);
      logMessage(`skip ${serviceConfigId}: ${reason}`);
    },
    [configuredAgents, logMessage, showNotification],
  );

  const { startAgentWithRetries } = useAutoRunStartOperations({
    enabledRef,
    configuredAgents,
    createSafeIfNeeded,
    startService,
    waitForBalancesReady,
    waitForRunningInstance,
    onAutoRunInstanceStarted: wrappedOnAutoRunInstanceStarted,
    onAutoRunStartStateChange,
    showNotification,
    recordMetric,
    logMessage,
    logVerbose,
  });

  const { stopAgentWithRecovery } = useAutoRunStopOperations({
    runningServiceConfigIdRef,
    recordMetric,
    logMessage,
    logVerbose,
  });

  return {
    refreshRewardsEligibility,
    advanceConnectRunBaseline,
    notifyGoalReachedOnce,
    notifySkipOnce,
    startAgentWithRetries,
    stopAgentWithRecovery,
  };
};
