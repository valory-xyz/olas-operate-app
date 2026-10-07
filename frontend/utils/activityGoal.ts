import { z } from 'zod';

import { ActivityGoal } from '@/types/Agent';

const nonNegativeInt = z.number().int().nonnegative();

const ActivityGoalSchema: z.ZodType<ActivityGoal> = z.object({
  unit: z.enum(['trades', 'rounds', 'minutes']),
  target: nonNegativeInt,
  progress: nonNegativeInt,
  is_met: z.boolean(),
  period_start: nonNegativeInt,
  last_met_at: nonNegativeInt.nullable(),
  updated_at: nonNegativeInt,
});

/**
 * Returns the agent's `activity_goal` block, or `null` when it is absent
 * (older agent builds) or malformed. Never throws.
 */
export const parseActivityGoal = (raw: unknown): ActivityGoal | null => {
  const result = ActivityGoalSchema.safeParse(raw);
  return result.success ? result.data : null;
};

/**
 * A staking agent's block counts only when it belongs to the current epoch;
 * one left over from an earlier epoch reads as "goal not met".
 */
export const isActivityGoalCurrent = (
  goal: ActivityGoal,
  tsCheckpoint: number,
) => goal.period_start >= tsCheckpoint;

/**
 * The activity-goal half for a staking agent: met only when the block is
 * current and reports `is_met`. `undefined` when the agent publishes no block.
 */
export const deriveIsActivityGoalMet = (
  goal: ActivityGoal | null,
  tsCheckpoint: number,
): boolean | undefined => {
  if (!goal) return undefined;
  return isActivityGoalCurrent(goal, tsCheckpoint) && goal.is_met;
};

/**
 * "Done for the epoch" for a staking agent: both the staking KPI and the
 * activity goal are met. Without a block it falls back to the staking KPI
 * alone, so older agent builds behave as before.
 *
 * @example
 * deriveIsDoneForEpoch(true, null, 1000) // => true (fallback)
 * deriveIsDoneForEpoch(true, { ...goal, period_start: 900, is_met: true }, 1000) // => false (stale)
 */
export const deriveIsDoneForEpoch = (
  epochTargetMet: boolean,
  goal: ActivityGoal | null,
  tsCheckpoint: number,
): boolean => {
  if (!epochTargetMet) return false;
  return deriveIsActivityGoalMet(goal, tsCheckpoint) ?? epochTargetMet;
};

/**
 * Whether Connect has completed a run since `sinceSeconds` (unix seconds):
 * it stamps `last_met_at` at the end of each run window. A `0`-minute target
 * is always met, so it always counts as completed.
 */
export const hasConnectRunCompletedSince = (
  goal: ActivityGoal | null,
  sinceSeconds: number,
): boolean => {
  if (!goal) return false;
  if (goal.target === 0 && goal.is_met) return true;
  return goal.last_met_at !== null && goal.last_met_at > sinceSeconds;
};
