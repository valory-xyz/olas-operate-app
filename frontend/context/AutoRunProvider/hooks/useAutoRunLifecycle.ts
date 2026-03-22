import { MutableRefObject, useCallback, useEffect, useRef } from 'react';

import { AgentType } from '@/constants';
import { sleepAwareDelay } from '@/utils/delay';

import {
  AUTO_RUN_HEALTH_METRIC,
  AUTO_RUN_START_DELAY_SECONDS,
  AutoRunLifecycleMetric,
  COOLDOWN_SECONDS,
  REWARDS_POLL_SECONDS,
  RUNNING_AGENT_MAX_RUNTIME_SECONDS,
  RUNNING_AGENT_WATCHDOG_CHECK_SECONDS,
  SCAN_BLOCKED_DELAY_SECONDS,
  SCAN_ELIGIBLE_DELAY_SECONDS,
} from '../constants';
import { useAutoRunVerboseLogger } from './useAutoRunVerboseLogger';

type UseAutoRunLifecycleParams = {
  enabled: boolean;
  runningAgentType: AgentType | null;
  runningServiceConfigId: string | null;
  orderedIncludedInstances: string[];
  enabledRef: MutableRefObject<boolean>;
  runningAgentTypeRef: MutableRefObject<AgentType | null>;
  runningServiceConfigIdRef: MutableRefObject<string | null>;
  lastRewardsEligibilityRef: MutableRefObject<
    Partial<Record<string, boolean | undefined>>
  >;
  scanTick: number;
  rewardsTick: number;
  scheduleNextScan: (delaySeconds: number) => void;
  hasScheduledScan: () => boolean;
  refreshRewardsEligibility: (
    serviceConfigId: string,
  ) => Promise<boolean | undefined>;
  getRewardSnapshot: (serviceConfigId: string) => boolean | undefined;
  getPreferredStartFrom: () => string | null;
  scanAndStartNext: (startFrom?: string | null) => Promise<{
    started: boolean;
  }>;
  startSelectedAgentIfEligible: () => Promise<boolean>;
  stopAgentWithRecovery: (serviceConfigId: string) => Promise<boolean>;
  stopRetryBackoffUntilRef: MutableRefObject<Partial<Record<string, number>>>;
  recordMetric: (metric: AutoRunLifecycleMetric) => void;
  logMessage: (message: string) => void;
};

/**
 * Lifecycle effects that keep auto-run moving over time.
 *
 * Example:
 * - instance `sc-aaa` is running
 * - rewards flip to earned
 * - lifecycle rotates to next candidate and starts scan
 */
export const useAutoRunLifecycle = ({
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
}: UseAutoRunLifecycleParams) => {
  const logVerbose = useAutoRunVerboseLogger(logMessage);

  // Guards against overlapping scan/rotation loops.
  const isRotatingRef = useRef(false);
  // Track prior enabled state to distinguish initial enable vs later idle (cooldown on manual stop).
  const wasAutoRunEnabledRef = useRef(false);
  // Tracks when the current running instance started, used by runtime watchdog.
  const runningSinceRef = useRef<number | null>(null);
  // Sequence for correlation IDs across rotation/watchdog cycles.
  const rotationCycleSeqRef = useRef(0);

  // Clear stop-timeout backoff state whenever auto-run is disabled.
  useEffect(() => {
    if (!enabled) {
      stopRetryBackoffUntilRef.current = {};
    }
  }, [enabled, stopRetryBackoffUntilRef]);

  // Reset runtime tracking whenever running instance changes (or disappears).
  useEffect(() => {
    if (!enabled || !runningServiceConfigId) {
      runningSinceRef.current = null;
      return;
    }
    runningSinceRef.current = Date.now();
  }, [enabled, runningServiceConfigId]);

  // Keep refs of async functions to avoid stale closures in lifecycle effects.
  const startSelectedAgentIfEligibleRef = useRef(startSelectedAgentIfEligible);
  const scanAndStartNextRef = useRef(scanAndStartNext);
  const getPreferredStartFromRef = useRef(getPreferredStartFrom);
  useEffect(() => {
    startSelectedAgentIfEligibleRef.current = startSelectedAgentIfEligible;
    scanAndStartNextRef.current = scanAndStartNext;
    getPreferredStartFromRef.current = getPreferredStartFrom;
  }, [getPreferredStartFrom, scanAndStartNext, startSelectedAgentIfEligible]);

  /**
   * Rotation effect: when the currently running instance earns rewards, try to rotate to the next one.
   * If no other instances are eligible, keep the current one running and retry rotation after a delay.
   */
  const rotateToNext = useCallback(
    async (
      currentServiceConfigId: string,
      options?: { force?: boolean; cycleId?: string; trigger?: string },
    ) => {
      const cycleId =
        options?.cycleId ?? `cycle-unknown-${currentServiceConfigId}`;
      const trigger = options?.trigger ?? 'unknown';
      logVerbose(
        `cycle=${cycleId} trigger=${trigger} phase=rotate_begin current=${currentServiceConfigId} force=${Boolean(options?.force)}`,
      );
      // Rotation policy:
      // 1) If all other instances are already earned/unknown -> keep current running.
      // 2) Otherwise stop current, cool down, and scan from next.
      const otherInstances = orderedIncludedInstances.filter(
        (id) => id !== currentServiceConfigId,
      );
      if (otherInstances.length === 0) {
        scheduleNextScan(SCAN_ELIGIBLE_DELAY_SECONDS);
        return;
      }

      const refreshed = await Promise.all(
        otherInstances.map((id) => refreshRewardsEligibility(id)),
      );
      const rewardStates = otherInstances.map(
        (id, index) => refreshed[index] ?? getRewardSnapshot(id),
      );

      // If all other instances are either earned (true) or unknown (undefined),
      // keep the current instance running and retry rotation after a delay.
      const allEarnedOrUnknown = rewardStates.every((state) => state !== false);
      if (allEarnedOrUnknown) {
        if (options?.force) {
          // Watchdog force mode should not stop the current instance when there is
          // no known alternative candidate. Doing so would create idle time.
          logVerbose(
            `cycle=${cycleId} trigger=${trigger} phase=no_alternative current=${currentServiceConfigId} rescan=${SCAN_BLOCKED_DELAY_SECONDS}s`,
          );
          scheduleNextScan(SCAN_BLOCKED_DELAY_SECONDS);
          return;
        }
        logVerbose(
          `all other instances earned or unknown, keeping ${currentServiceConfigId} running, rescan in ${SCAN_ELIGIBLE_DELAY_SECONDS}s`,
        );
        scheduleNextScan(SCAN_ELIGIBLE_DELAY_SECONDS);
        return;
      }

      if (!enabledRef.current) return;

      // Stop the currently running instance, but if stopping fails (e.g. backend timeout),
      // keep it running and retry rotation after a delay.
      // This avoids a bad state where the current instance is stopped
      // but fails to start again, leaving no instances running.
      const stopOk = await stopAgentWithRecovery(currentServiceConfigId);
      if (!stopOk) {
        logMessage(
          `stop timeout for ${currentServiceConfigId}, aborting rotation`,
        );
        // Reset rewards guard so the next poll cycle can re-trigger rotation
        // instead of being blocked by the previousEligibility === true check.
        lastRewardsEligibilityRef.current[currentServiceConfigId] = undefined;
        stopRetryBackoffUntilRef.current[currentServiceConfigId] =
          Date.now() + SCAN_BLOCKED_DELAY_SECONDS * 1000;
        logMessage(
          `reset rewards guard for ${currentServiceConfigId}, scheduling rescan in ${SCAN_BLOCKED_DELAY_SECONDS}s`,
        );
        scheduleNextScan(SCAN_BLOCKED_DELAY_SECONDS);
        return;
      }

      // Rotation successful, reset rewards guard and stop backoff state for the current instance.
      stopRetryBackoffUntilRef.current[currentServiceConfigId] = undefined;
      if (!enabledRef.current) return;
      const cooldownOk = await sleepAwareDelay(COOLDOWN_SECONDS);
      if (!cooldownOk) return;
      if (!enabledRef.current) return;
      await scanAndStartNextRef.current(currentServiceConfigId);
      recordMetric(AUTO_RUN_HEALTH_METRIC.ROTATIONS_SUCCEEDED);
      logVerbose(
        `cycle=${cycleId} trigger=${trigger} phase=rotate_end status=ok current=${currentServiceConfigId}`,
      );
    },
    [
      enabledRef,
      getRewardSnapshot,
      logMessage,
      orderedIncludedInstances,
      refreshRewardsEligibility,
      recordMetric,
      scheduleNextScan,
      stopAgentWithRecovery,
      lastRewardsEligibilityRef,
      logVerbose,
      stopRetryBackoffUntilRef,
    ],
  );

  const stopRunningInstance = useCallback(
    async (currentServiceConfigId?: string | null) => {
      if (!currentServiceConfigId) return false;
      return stopAgentWithRecovery(currentServiceConfigId);
    },
    [stopAgentWithRecovery],
  );

  // Stop the currently running instance without requiring a caller to pass an ID.
  const stopCurrentRunningAgent = useCallback(async () => {
    if (!runningServiceConfigId) return false;
    return stopRunningInstance(runningServiceConfigId);
  }, [runningServiceConfigId, stopRunningInstance]);

  // Rotation when current instance earns rewards (false -> true).
  useEffect(() => {
    if (!enabled) return;
    if (isRotatingRef.current) return;

    const currentId = runningServiceConfigId;
    if (!currentId) return;

    let isActive = true;
    const checkRewardsAndRotate = async () => {
      const cycleId = `rewards-${currentId}-${++rotationCycleSeqRef.current}`;
      isRotatingRef.current = true;
      try {
        const refreshed = await refreshRewardsEligibility(currentId);
        if (!isActive) return;
        const snapshot =
          refreshed === undefined ? getRewardSnapshot(currentId) : refreshed;
        // Check backoff BEFORE updating the guard. If the guard were written
        // first it would be overwritten to `true` during the backoff window,
        // permanently blocking future rotation triggers.
        const stopRetryBackoffUntil =
          stopRetryBackoffUntilRef.current[currentId] ?? 0;
        if (Date.now() < stopRetryBackoffUntil) return;
        const previousEligibility =
          lastRewardsEligibilityRef.current[currentId];
        lastRewardsEligibilityRef.current[currentId] = snapshot;
        if (snapshot !== true) return;
        if (previousEligibility === true) return;
        logVerbose(
          `cycle=${cycleId} trigger=rewards phase=trigger current=${currentId}`,
        );
        await rotateToNext(currentId, {
          cycleId,
          trigger: 'rewards',
        });
      } catch (error) {
        logMessage(`rotation error: ${error}`);
        recordMetric(AUTO_RUN_HEALTH_METRIC.REWARDS_ERRORS);
        // Reset the guard so the next rewards poll can re-trigger rotation
        // instead of being permanently blocked by `previousEligibility === true`.
        // Schedule a rescan as a recovery safety net.
        lastRewardsEligibilityRef.current[currentId] = undefined;
        scheduleNextScan(SCAN_BLOCKED_DELAY_SECONDS);
      } finally {
        isRotatingRef.current = false;
      }
    };

    checkRewardsAndRotate();
    return () => {
      isActive = false;
    };
  }, [
    enabled,
    getRewardSnapshot,
    lastRewardsEligibilityRef,
    logMessage,
    logVerbose,
    recordMetric,
    refreshRewardsEligibility,
    rotateToNext,
    runningServiceConfigId,
    rewardsTick,
    scanTick,
    scheduleNextScan,
    stopRetryBackoffUntilRef,
  ]);

  // Poll rewards for the running instance to allow rotation even when viewing others.
  useEffect(() => {
    if (!enabled) return;
    if (!runningServiceConfigId) return;

    const interval = setInterval(() => {
      refreshRewardsEligibility(runningServiceConfigId);
    }, REWARDS_POLL_SECONDS * 1000);

    return () => clearInterval(interval);
  }, [enabled, refreshRewardsEligibility, runningServiceConfigId]);

  // Runtime watchdog: if one instance keeps running too long, attempt rotation/recovery.
  useEffect(() => {
    if (!enabled) return;
    if (!runningServiceConfigId) return;

    const intervalId = setInterval(() => {
      const currentId = runningServiceConfigIdRef.current;
      if (!enabledRef.current || !currentId) return;
      if (isRotatingRef.current) return;

      const runningSince = runningSinceRef.current;
      if (!runningSince) return;
      if (
        Date.now() - runningSince <
        RUNNING_AGENT_MAX_RUNTIME_SECONDS * 1000
      ) {
        return;
      }

      const stopRetryBackoffUntil =
        stopRetryBackoffUntilRef.current[currentId] ?? 0;
      if (Date.now() < stopRetryBackoffUntil) return;

      isRotatingRef.current = true;
      const cycleId = `watchdog-${currentId}-${++rotationCycleSeqRef.current}`;
      void (async () => {
        try {
          logVerbose(
            `cycle=${cycleId} trigger=watchdog phase=trigger current=${currentId} runtimeThreshold=${RUNNING_AGENT_MAX_RUNTIME_SECONDS}s`,
          );
          await rotateToNext(currentId, {
            force: true,
            cycleId,
            trigger: 'watchdog',
          });
        } catch (error) {
          logMessage(`watchdog rotation error: ${error}`);
          recordMetric(AUTO_RUN_HEALTH_METRIC.REWARDS_ERRORS);
          // Reset the guard so the next rewards poll can re-trigger rotation
          // instead of being permanently blocked by `previousEligibility === true`.
          lastRewardsEligibilityRef.current[currentId] = undefined;
          scheduleNextScan(SCAN_BLOCKED_DELAY_SECONDS);
        } finally {
          // Prevent watchdog from re-triggering immediately if the same instance
          // is still running after this attempt.
          runningSinceRef.current = Date.now();
          isRotatingRef.current = false;
        }
      })();
    }, RUNNING_AGENT_WATCHDOG_CHECK_SECONDS * 1000);

    return () => clearInterval(intervalId);
  }, [
    enabled,
    enabledRef,
    lastRewardsEligibilityRef,
    logMessage,
    logVerbose,
    recordMetric,
    rotateToNext,
    runningServiceConfigId,
    runningServiceConfigIdRef,
    scheduleNextScan,
    stopRetryBackoffUntilRef,
  ]);

  // When enabled and nothing is running, start selected or scan for the next.
  // Skip cooldown on first enable, but keep cooldown after manual stops.
  useEffect(() => {
    const wasEnabled = wasAutoRunEnabledRef.current;
    wasAutoRunEnabledRef.current = enabled;
    if (!enabled) return;
    if (runningAgentType) return;
    if (isRotatingRef.current) return;

    isRotatingRef.current = true;
    let reachedScan = false;
    const startNext = async () => {
      const preferredStartFrom = getPreferredStartFromRef.current();
      if (!wasEnabled) {
        // First enable path: wait startup delay, try selected instance first, then scan queue.
        const startOk = await sleepAwareDelay(AUTO_RUN_START_DELAY_SECONDS);
        if (!startOk) return;
        if (!enabledRef.current || runningAgentTypeRef.current) return;
        const startedSelected = await startSelectedAgentIfEligibleRef.current();
        if (startedSelected) return;
        reachedScan = true;
        await scanAndStartNextRef.current(preferredStartFrom);
        return;
      }
      // Auto-run was already enabled but the instance stopped (e.g. sleep/wake,
      // backend crash). Try to resume the previously running instance first.
      const cooldownOk = await sleepAwareDelay(COOLDOWN_SECONDS);
      if (!cooldownOk) return;
      if (!enabledRef.current) return;
      const resumedSelected = await startSelectedAgentIfEligibleRef.current();
      if (resumedSelected) return;
      reachedScan = true;
      await scanAndStartNextRef.current(preferredStartFrom);
    };

    startNext()
      .catch((error) => logMessage(`manual stop start error: ${error}`))
      .finally(() => {
        isRotatingRef.current = false;
        // Safety net: if auto-run is still on but nothing started and we
        // never reached scanAndStartNext, ensure the loop retries.
        if (
          !reachedScan &&
          enabledRef.current &&
          !runningAgentTypeRef.current &&
          !hasScheduledScan()
        ) {
          logMessage(
            `safety net: flow interrupted before scan, retrying in ${COOLDOWN_SECONDS}s`,
          );
          scheduleNextScan(COOLDOWN_SECONDS);
        }
      });
  }, [
    enabled,
    getPreferredStartFrom,
    logMessage,
    runningAgentType,
    scanAndStartNext,
    scanTick,
    scheduleNextScan,
    hasScheduledScan,
    startSelectedAgentIfEligible,
    runningAgentTypeRef,
    enabledRef,
  ]);

  return {
    stopCurrentRunningAgent,
  };
};
