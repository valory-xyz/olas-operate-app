import { MutableRefObject, useCallback, useEffect, useRef } from 'react';

import { AgentType } from '@/constants';
import { sleepAwareDelay } from '@/utils/delay';
import { isNoStakingProgram } from '@/utils/stakingProgram';

import {
  AUTO_RUN_HEALTH_METRIC,
  AUTO_RUN_START_DELAY_SECONDS,
  AUTO_RUN_START_STATUS,
  AutoRunLifecycleMetric,
  AutoRunStartResult,
  COOLDOWN_SECONDS,
  REWARDS_POLL_SECONDS,
  RUNNING_AGENT_ELIGIBILITY_CHECK_SECONDS,
  RUNNING_AGENT_MAX_RUNTIME_SECONDS,
  RUNNING_AGENT_WATCHDOG_CHECK_SECONDS,
  SCAN_BLOCKED_DELAY_SECONDS,
  SCAN_ELIGIBLE_DELAY_SECONDS,
} from '../constants';
import { AgentMeta } from '../types';
import { DeployabilityCheckResult } from '../utils/autoRunHelpers';
import { ScanOptions, ScanResult } from './useAutoRunScanner';
import { useAutoRunVerboseLogger } from './useAutoRunVerboseLogger';

type UseAutoRunLifecycleParams = {
  enabled: boolean;
  runningAgentType: AgentType | null;
  runningServiceConfigId: string | null;
  orderedIncludedInstances: string[];
  configuredAgents: AgentMeta[];
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
  /** Whether the running instance has gone an hour without goal progress. */
  isStalled: (serviceConfigId: string) => boolean;
  /** Starts the stall hour again, for a stalled instance kept running. */
  restartStallClock: (serviceConfigId: string) => void;
  /** Sends a stalled instance to the back of the queue for this epoch. */
  deferStalled: (serviceConfigId: string) => void;
  isStallDeferred: (serviceConfigId: string) => boolean;
  getPreferredStartFrom: () => string | null;
  scanAndStartNext: (
    from?: string | null,
    options?: ScanOptions,
  ) => Promise<ScanResult>;
  startSelectedAgentIfEligible: () => Promise<boolean>;
  stopAgentWithRecovery: (serviceConfigId: string) => Promise<boolean>;
  startAgentWithRetries: (
    serviceConfigId: string,
  ) => Promise<AutoRunStartResult>;
  /**
   * Reads the on-chain deployability of the running instance. `null` when the
   * running instance has no known metadata to check against.
   */
  getDeployabilityForRunningInstance: () => Promise<DeployabilityCheckResult | null>;
  /**
   * Deployability of an instance as if nothing were running, to check that
   * the running instance has someone to hand over to before stopping it.
   */
  getHandOverDeployability: (
    serviceConfigId: string,
  ) => Promise<DeployabilityCheckResult | null>;
  /** Goal-reached notification for a Connect hand-over. */
  notifyGoalReachedOnHandOver: (serviceConfigId: string) => void;
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
  // The instance kept running because no other could start, and the scan
  // tick its recheck was scheduled on.
  const holdRef = useRef<{ serviceConfigId: string; scanTick: number } | null>(
    null,
  );
  const scanTickRef = useRef(scanTick);
  scanTickRef.current = scanTick;
  // Read when a rotation runs, so an instance added during a hold is seen.
  const orderedIncludedInstancesRef = useRef(orderedIncludedInstances);
  orderedIncludedInstancesRef.current = orderedIncludedInstances;

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
   * Stops the current instance and, after the cooldown, scans from it for the
   * next one, `first` before the usual order. If stopping fails (e.g. backend
   * timeout) the instance keeps running and rotation is retried after a delay,
   * so the queue is never left with nothing running. `onStopped` runs right
   * after a successful stop.
   */
  const stopAndScanFrom = useCallback(
    async (
      currentServiceConfigId: string,
      cycleId: string,
      trigger: string,
      options: { first?: string; onStopped?: () => void } = {},
    ) => {
      const stopOk = await stopAgentWithRecovery(currentServiceConfigId);
      if (!stopOk) {
        logMessage(
          `stop timeout for ${currentServiceConfigId}, aborting rotation`,
        );
        // Reset the rewards guard so the next poll can re-trigger rotation.
        lastRewardsEligibilityRef.current[currentServiceConfigId] = undefined;
        stopRetryBackoffUntilRef.current[currentServiceConfigId] =
          Date.now() + SCAN_BLOCKED_DELAY_SECONDS * 1000;
        logMessage(
          `reset rewards guard for ${currentServiceConfigId}, scheduling rescan in ${SCAN_BLOCKED_DELAY_SECONDS}s`,
        );
        scheduleNextScan(SCAN_BLOCKED_DELAY_SECONDS);
        return;
      }
      options.onStopped?.();

      // Reset the rewards guard, or a leftover `true` blocks every later rotation.
      lastRewardsEligibilityRef.current[currentServiceConfigId] = undefined;
      stopRetryBackoffUntilRef.current[currentServiceConfigId] = undefined;
      if (!enabledRef.current) return;
      const cooldownOk = await sleepAwareDelay(COOLDOWN_SECONDS);
      if (!cooldownOk) return;
      if (!enabledRef.current) return;
      // The stop was confirmed by probing the deployment, so the scan must not
      // wait for the shared deployment poll to stop reporting it as running.
      const { startedId } = await scanAndStartNextRef.current(
        currentServiceConfigId,
        {
          first: options.first,
          stoppedId: currentServiceConfigId,
          cycleId,
          trigger,
        },
      );
      const status =
        startedId && startedId !== currentServiceConfigId ? 'ok' : 'none';
      if (status === 'ok') {
        recordMetric(AUTO_RUN_HEALTH_METRIC.ROTATIONS_SUCCEEDED);
      }
      logVerbose(
        `cycle=${cycleId} trigger=${trigger} phase=rotate_end status=${status} current=${currentServiceConfigId}`,
      );
    },
    [
      enabledRef,
      lastRewardsEligibilityRef,
      logMessage,
      logVerbose,
      recordMetric,
      scheduleNextScan,
      stopAgentWithRecovery,
      stopRetryBackoffUntilRef,
    ],
  );

  /**
   * Pre-check before every rotation: the first instance after the current
   * one, in order, that still needs its turn and could start once the current
   * one stops. Done and unknown instances never count. Empty-pool instances,
   * then stall-deferred ones, count only when nothing else can start, and
   * stall-deferred ones not at all when the current instance is stalled too.
   * Logs the check that excluded each one passed over, and reports whether
   * any was passed over for an unknown rewards status.
   */
  const findRunnableAlternate = useCallback(
    async (
      currentServiceConfigId: string,
      options: { cycleId: string; trigger: string; includeStalled: boolean },
    ) => {
      const { cycleId, trigger, includeStalled } = options;
      const passOver = (serviceConfigId: string, check?: string) =>
        logVerbose(
          `cycle=${cycleId} trigger=${trigger} pass over ${serviceConfigId}: ${check ?? 'unknown'}`,
        );
      const order = orderedIncludedInstancesRef.current;
      const currentIndex = order.indexOf(currentServiceConfigId);
      const alternates = [
        ...order.slice(currentIndex + 1),
        ...order.slice(0, Math.max(currentIndex, 0)),
      ].filter((id) => id !== currentServiceConfigId);

      const statuses = await Promise.all(
        alternates.map((id) => refreshRewardsEligibility(id)),
      );
      const hasUnknown = statuses.some((status) => status === undefined);
      const found = (next: string | null) => ({ next, hasUnknown });
      const emptyPool: string[] = [];
      const stalled: string[] = [];
      for (const [index, candidate] of alternates.entries()) {
        if (!enabledRef.current) return found(null);
        if (statuses[index] === true) {
          passOver(candidate, 'done for the epoch');
          continue;
        }
        if (statuses[index] === undefined) {
          passOver(candidate, 'rewards status unknown');
          continue;
        }
        if (isStallDeferred(candidate)) {
          if (includeStalled) stalled.push(candidate);
          else passOver(candidate, 'stalled on its activity goal, deferred');
          continue;
        }
        const deployability = await getHandOverDeployability(candidate);
        if (deployability?.canRun) return found(candidate);
        if (deployability?.isEmptyRewardPool) {
          emptyPool.push(candidate);
          continue;
        }
        passOver(candidate, deployability?.reason ?? 'not configured');
      }
      if (emptyPool.length > 0) return found(emptyPool[0]);
      for (const candidate of stalled) {
        if (!enabledRef.current) return found(null);
        const deployability = await getHandOverDeployability(candidate);
        if (deployability?.canRun || deployability?.isEmptyRewardPool) {
          return found(candidate);
        }
        passOver(candidate, deployability?.reason ?? 'not configured');
      }
      return found(null);
    },
    [
      enabledRef,
      getHandOverDeployability,
      isStallDeferred,
      logVerbose,
      refreshRewardsEligibility,
    ],
  );

  /**
   * Ends the running instance's turn: on the rewards edge (done or stalled),
   * the watchdog, an eviction it cannot recover from, or Connect's minutes.
   * Stops it only when the pre-check found another instance that can start,
   * which the scan then tries first. Otherwise the instance keeps the slot,
   * and the whole order is checked again after a delay.
   */
  const rotateToNext = useCallback(
    async (
      currentServiceConfigId: string,
      options?: { force?: boolean; cycleId?: string; trigger?: string },
    ) => {
      const cycleId =
        options?.cycleId ?? `cycle-unknown-${currentServiceConfigId}`;
      const currentMeta = configuredAgents.find(
        (agent) => agent.serviceConfigId === currentServiceConfigId,
      );
      const isNoStakingAgent =
        !!currentMeta && isNoStakingProgram(currentMeta.stakingProgramId);
      const stalled = !isNoStakingAgent && isStalled(currentServiceConfigId);
      const trigger =
        stalled && options?.trigger === 'rewards'
          ? 'stall'
          : (options?.trigger ?? 'unknown');
      logVerbose(
        `cycle=${cycleId} trigger=${trigger} phase=rotate_begin current=${currentServiceConfigId} force=${Boolean(options?.force)}`,
      );

      const { next, hasUnknown } = await findRunnableAlternate(
        currentServiceConfigId,
        {
          cycleId,
          trigger,
          includeStalled: !stalled,
        },
      );
      if (!enabledRef.current) return;

      if (!next) {
        // A stalled instance keeps running with a fresh hour.
        if (stalled) restartStallClock(currentServiceConfigId);
        // Connect's `is_met` never goes back to false within a process, so the
        // reset is what lets the next rewards poll check again.
        if (isNoStakingAgent) {
          lastRewardsEligibilityRef.current[currentServiceConfigId] = undefined;
        }
        // A forced rotation (watchdog, eviction), or an alternate whose rewards
        // status is unknown, rechecks sooner.
        const delay =
          options?.force || hasUnknown
            ? SCAN_BLOCKED_DELAY_SECONDS
            : SCAN_ELIGIBLE_DELAY_SECONDS;
        logVerbose(
          `cycle=${cycleId} trigger=${trigger} keeping ${currentServiceConfigId} running, no runnable alternate rescan=${delay}s`,
        );
        logVerbose(
          `cycle=${cycleId} trigger=${trigger} phase=rotate_end status=kept current=${currentServiceConfigId}`,
        );
        scheduleNextScan(delay);
        holdRef.current = {
          serviceConfigId: currentServiceConfigId,
          scanTick: scanTickRef.current,
        };
        return;
      }

      logVerbose(
        `cycle=${cycleId} trigger=${trigger} phase=hand_over current=${currentServiceConfigId} next=${next}`,
      );
      // Only Connect finishing its minutes means its goal was reached: a
      // watchdog, eviction or stall hand-over does not.
      const notifyGoalReached = isNoStakingAgent && !options?.force;
      // Deferred only once stopped: after a stop timeout it is still running.
      const onStopped = () => {
        if (stalled) deferStalled(currentServiceConfigId);
        if (notifyGoalReached) {
          notifyGoalReachedOnHandOver(currentServiceConfigId);
        }
      };
      await stopAndScanFrom(currentServiceConfigId, cycleId, trigger, {
        first: next,
        onStopped,
      });
    },
    [
      configuredAgents,
      deferStalled,
      enabledRef,
      findRunnableAlternate,
      isStalled,
      lastRewardsEligibilityRef,
      logVerbose,
      notifyGoalReachedOnHandOver,
      restartStallClock,
      scheduleNextScan,
      stopAndScanFrom,
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

    // The hold's scheduled recheck fired: forget the `true` that started the
    // hold, so the order is checked again even though the status is unchanged.
    const hold = holdRef.current;
    if (
      hold &&
      (hold.serviceConfigId !== currentId || hold.scanTick !== scanTick)
    ) {
      if (hold.serviceConfigId === currentId) {
        lastRewardsEligibilityRef.current[currentId] = undefined;
      }
      holdRef.current = null;
    }

    let isActive = true;
    const checkRewardsAndRotate = async () => {
      const cycleId = `rewards-${currentId}-${++rotationCycleSeqRef.current}`;
      isRotatingRef.current = true;
      try {
        const snapshot = await refreshRewardsEligibility(currentId);
        if (!isActive) return;
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

  // Keep the eligibility check reading the current callback without
  // re-creating the interval on every render.
  const getDeployabilityForRunningInstanceRef = useRef(
    getDeployabilityForRunningInstance,
  );
  const startAgentWithRetriesRef = useRef(startAgentWithRetries);
  // `rotateToNext` closes over `orderedIncludedInstances`, which derives from
  // `services` — refetched every 5s. Left in the dep array it would tear down
  // and recreate this interval faster than its 10-minute period, so the check
  // could never fire. The runtime watchdog survives the same churn only
  // because `runningSinceRef` carries its progress across restarts; this
  // check is stateless, so it has to hold the callback in a ref instead.
  const rotateToNextRef = useRef(rotateToNext);
  useEffect(() => {
    getDeployabilityForRunningInstanceRef.current =
      getDeployabilityForRunningInstance;
    startAgentWithRetriesRef.current = startAgentWithRetries;
    rotateToNextRef.current = rotateToNext;
  }, [getDeployabilityForRunningInstance, startAgentWithRetries, rotateToNext]);

  /**
   * Eviction watchdog for the *running* instance.
   *
   * The eviction gate in `fetchDeployabilityForAgent` only ever runs when
   * choosing a candidate to start, and neither rotation trigger can fire once
   * an instance is evicted: rewards eligibility can no longer flip false→true,
   * and the runtime watchdog is purely time-based. So an instance evicted while
   * running stays selected until the runtime cap — crash-looping the whole
   * time if its agent exits on eviction.
   *
   * Recoverable (past `minimumStakingDuration`) → stop and start, since the
   * start path re-stakes through the middleware's deploy endpoint. Locked →
   * hand the queue to another instance; the instance is un-runnable until its
   * eviction window ends, and no layer can re-stake it before then.
   */
  useEffect(() => {
    if (!enabled) return;
    if (!runningServiceConfigId) return;

    const intervalId = setInterval(() => {
      const currentId = runningServiceConfigIdRef.current;
      if (!enabledRef.current || !currentId) return;
      if (isRotatingRef.current) return;

      const stopRetryBackoffUntil =
        stopRetryBackoffUntilRef.current[currentId] ?? 0;
      if (Date.now() < stopRetryBackoffUntil) return;

      const cycleId = `eviction-${currentId}-${++rotationCycleSeqRef.current}`;
      void (async () => {
        // The staking read is a network call. Claim the rotation guard only
        // once there is something to do, or every check would block the
        // runtime watchdog and the rewards trigger for the read's duration.
        let hasRotationGuard = false;
        try {
          const deployability =
            await getDeployabilityForRunningInstanceRef.current();
          if (!enabledRef.current) return;
          if (!deployability) return;
          // A failed staking read must never stop a healthy agent.
          if (deployability.isTransient) return;
          if (!deployability.isAgentEvicted) return;
          // Re-check under the guard: another loop may have started rotating
          // while the read was in flight. No await between here and the claim.
          if (isRotatingRef.current) return;
          // A rotation may also have *completed* during the read, leaving a
          // different instance running. Acting on `currentId` now would stop
          // an agent that is no longer the one we checked.
          if (runningServiceConfigIdRef.current !== currentId) return;
          isRotatingRef.current = true;
          hasRotationGuard = true;

          if (!deployability.isEligibleAfterEviction) {
            logVerbose(
              `cycle=${cycleId} trigger=eviction phase=trigger current=${currentId} eligible=false action=rotate`,
            );
            await rotateToNextRef.current(currentId, {
              force: true,
              cycleId,
              trigger: 'eviction',
            });
            return;
          }

          logVerbose(
            `cycle=${cycleId} trigger=eviction phase=trigger current=${currentId} eligible=true action=restart`,
          );
          const stopOk = await stopAgentWithRecovery(currentId);
          if (!stopOk) {
            // Never start on top of a stop that did not complete; let the
            // existing backoff reschedule, exactly as rotateToNext does.
            logMessage(
              `stop timeout for ${currentId}, aborting eviction recovery`,
            );
            stopRetryBackoffUntilRef.current[currentId] =
              Date.now() + SCAN_BLOCKED_DELAY_SECONDS * 1000;
            scheduleNextScan(SCAN_BLOCKED_DELAY_SECONDS);
            return;
          }
          // Reset the rewards guard as `rotateToNext` does after a successful
          // stop: a stale `true` left over from before the eviction would
          // block the rewards trigger for this instance in every later epoch.
          lastRewardsEligibilityRef.current[currentId] = undefined;
          stopRetryBackoffUntilRef.current[currentId] = undefined;
          if (!enabledRef.current) return;
          // Same cooldown rotation uses — the backend needs time to tear the
          // service down before a start on the same instance is accepted.
          const cooldownOk = await sleepAwareDelay(COOLDOWN_SECONDS);
          if (!cooldownOk) return;
          if (!enabledRef.current) return;
          const startResult = await startAgentWithRetriesRef.current(currentId);
          // The instance id does not change across a recovery, so the effect
          // that resets this on rotation may not re-run. Without the reset the
          // runtime watchdog would count the pre-eviction runtime and rotate
          // straight off a just-recovered agent.
          runningSinceRef.current = Date.now();
          // We stopped a running agent to get here, so a start that did not
          // take leaves the queue idle. Schedule a rescan rather than relying
          // on the resume effect noticing, which is what `rotateToNext` does
          // on its own failure paths. `ABORTED` is auto-run being switched
          // off mid-recovery — not a failure, and nothing should restart it.
          if (
            startResult.status !== AUTO_RUN_START_STATUS.STARTED &&
            startResult.status !== AUTO_RUN_START_STATUS.ABORTED
          ) {
            logMessage(
              `eviction recovery start failed for ${currentId}: ${startResult.status}${
                startResult.reason ? ` (${startResult.reason})` : ''
              }`,
            );
            scheduleNextScan(SCAN_BLOCKED_DELAY_SECONDS);
          }
        } catch (error) {
          logMessage(`eviction watchdog error: ${error}`);
          recordMetric(AUTO_RUN_HEALTH_METRIC.REWARDS_ERRORS);
          scheduleNextScan(SCAN_BLOCKED_DELAY_SECONDS);
        } finally {
          if (hasRotationGuard) isRotatingRef.current = false;
        }
      })();
    }, RUNNING_AGENT_ELIGIBILITY_CHECK_SECONDS * 1000);

    return () => clearInterval(intervalId);
  }, [
    enabled,
    enabledRef,
    lastRewardsEligibilityRef,
    logMessage,
    logVerbose,
    recordMetric,
    runningServiceConfigId,
    runningServiceConfigIdRef,
    scheduleNextScan,
    stopAgentWithRecovery,
    stopRetryBackoffUntilRef,
  ]);

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
