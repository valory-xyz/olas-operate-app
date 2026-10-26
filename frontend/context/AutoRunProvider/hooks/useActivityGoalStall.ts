import { useCallback, useEffect, useRef, useState } from 'react';

import { ActivityGoal } from '@/types';
import { isActivityGoalCurrent } from '@/utils/activityGoal';

import { ACTIVITY_GOAL_STALL_SECONDS } from '../constants';
import { StalledInstance } from '../types';

/** What one rewards poll learned about a staking instance. */
export type ActivityGoalObservation = {
  isRunning: boolean;
  epochTargetMet: boolean;
  epochExpired: boolean;
  tsCheckpoint: number;
  /** `undefined` when the block was not read, or could not be read. */
  goal?: ActivityGoal | null;
};

type StallClock = StalledInstance & {
  /** When `progress`, `target` or `periodStart` last changed (ms). */
  since: number;
  tsCheckpoint: number;
};

type UseActivityGoalStallParams = {
  enabled: boolean;
  runningServiceConfigId: string | null;
  logMessage: (message: string) => void;
};

const toStalledInstance = ({
  progress,
  target,
  unit,
  periodStart,
}: StallClock): StalledInstance => ({ progress, target, unit, periodStart });

/**
 * Detects a running staking agent that has met its staking KPI but made no
 * progress toward its activity goal for `ACTIVITY_GOAL_STALL_SECONDS`.
 *
 * - The clock starts on the first rewards poll where the instance runs, its
 *   KPI is met and its goal block is current and unmet; it restarts whenever
 *   `progress`, `target` or `period_start` changes. `updated_at` is never
 *   read: the agent rewrites it every period whether or not it progressed.
 * - A stalled instance Auto-run rotates away from is *deferred*: it reads as
 *   stalled until it starts again or the epoch moves on, so the scanner tries
 *   it only after every other candidate.
 *
 * All state is in memory: it resets when Auto-run is turned off or Pearl
 * restarts.
 */
export const useActivityGoalStall = ({
  enabled,
  runningServiceConfigId,
  logMessage,
}: UseActivityGoalStallParams) => {
  const clockRef = useRef<Partial<Record<string, StallClock>>>({});
  const deferredRef = useRef<Partial<Record<string, StallClock>>>({});
  const [stalledInstances, setStalledInstances] = useState<
    Partial<Record<string, StalledInstance>>
  >({});

  const publishDeferred = useCallback(() => {
    const next: Partial<Record<string, StalledInstance>> = {};
    for (const [id, clock] of Object.entries(deferredRef.current)) {
      if (clock) next[id] = toStalledInstance(clock);
    }
    setStalledInstances(next);
  }, []);

  const releaseDeferred = useCallback(
    (serviceConfigId: string) => {
      if (!deferredRef.current[serviceConfigId]) return;
      delete deferredRef.current[serviceConfigId];
      publishDeferred();
    },
    [publishDeferred],
  );

  useEffect(() => {
    if (enabled) return;
    clockRef.current = {};
    if (Object.keys(deferredRef.current).length === 0) return;
    deferredRef.current = {};
    setStalledInstances({});
  }, [enabled]);

  // Only the running instance is watched, and one that runs again is no
  // longer deferred (e.g. the user started it by hand).
  useEffect(() => {
    for (const id of Object.keys(clockRef.current)) {
      if (id !== runningServiceConfigId) delete clockRef.current[id];
    }
    if (runningServiceConfigId) releaseDeferred(runningServiceConfigId);
  }, [releaseDeferred, runningServiceConfigId]);

  /**
   * Feeds one rewards poll into the stall clock.
   * @returns whether the instance is stalled (or deferred for a stall)
   */
  const trackActivityGoal = useCallback(
    (serviceConfigId: string, observation: ActivityGoalObservation) => {
      const { isRunning, epochTargetMet, epochExpired, tsCheckpoint, goal } =
        observation;

      const deferred = deferredRef.current[serviceConfigId];
      if (deferred) {
        if (
          epochTargetMet &&
          !epochExpired &&
          tsCheckpoint === deferred.tsCheckpoint
        ) {
          return true;
        }
        releaseDeferred(serviceConfigId);
        logMessage(
          `${serviceConfigId}: epoch moved on, no longer deferred for a stalled activity goal`,
        );
      }

      if (!isRunning || !epochTargetMet || epochExpired) {
        delete clockRef.current[serviceConfigId];
        return false;
      }
      // Unreadable block: "done" is unknown anyway, so leave the clock as is.
      if (goal === undefined) return false;
      if (!goal || goal.is_met || !isActivityGoalCurrent(goal, tsCheckpoint)) {
        delete clockRef.current[serviceConfigId];
        return false;
      }

      const now = Date.now();
      const clock = clockRef.current[serviceConfigId];
      if (
        !clock ||
        clock.progress !== goal.progress ||
        clock.target !== goal.target ||
        clock.periodStart !== goal.period_start
      ) {
        clockRef.current[serviceConfigId] = {
          since: now,
          progress: goal.progress,
          target: goal.target,
          unit: goal.unit,
          periodStart: goal.period_start,
          tsCheckpoint,
        };
        return false;
      }
      return now - clock.since >= ACTIVITY_GOAL_STALL_SECONDS * 1000;
    },
    [logMessage, releaseDeferred],
  );

  /** The running instance has gone a full stall period without progress. */
  const isActivityGoalStalled = useCallback((serviceConfigId: string) => {
    const clock = clockRef.current[serviceConfigId];
    if (!clock) return false;
    return Date.now() - clock.since >= ACTIVITY_GOAL_STALL_SECONDS * 1000;
  }, []);

  const isActivityGoalDeferred = useCallback(
    (serviceConfigId: string) => !!deferredRef.current[serviceConfigId],
    [],
  );

  /** Marks a stalled instance Auto-run just stopped as deferred. */
  const deferStalledInstance = useCallback(
    (serviceConfigId: string) => {
      const clock = clockRef.current[serviceConfigId];
      if (!clock) return;
      deferredRef.current[serviceConfigId] = clock;
      delete clockRef.current[serviceConfigId];
      publishDeferred();
    },
    [publishDeferred],
  );

  /** Gives a stalled instance that keeps the slot a fresh stall period. */
  const restartActivityGoalStallClock = useCallback(
    (serviceConfigId: string) => {
      const clock = clockRef.current[serviceConfigId];
      if (clock) clock.since = Date.now();
    },
    [],
  );

  /** Auto-run started the instance: it gets a fresh clock and is no longer deferred. */
  const releaseOnStart = useCallback(
    (serviceConfigId: string) => {
      delete clockRef.current[serviceConfigId];
      releaseDeferred(serviceConfigId);
    },
    [releaseDeferred],
  );

  return {
    stalledInstances,
    trackActivityGoal,
    isActivityGoalStalled,
    isActivityGoalDeferred,
    deferStalledInstance,
    restartActivityGoalStallClock,
    releaseOnStart,
  };
};
