import { isNil } from 'lodash';
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
 * (older agent builds) or malformed; `onInvalid` receives a malformed block's
 * validation issues. Never throws.
 */
export const parseActivityGoal = (
  raw: unknown,
  onInvalid?: (issues: string) => void,
): ActivityGoal | null => {
  if (isNil(raw)) return null;
  const result = ActivityGoalSchema.safeParse(raw);
  if (result.success) return result.data;
  onInvalid?.(
    result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; '),
  );
  return null;
};

/**
 * A block counts only when it belongs to the current period: for a staking
 * agent one that started at or after the epoch's `tsCheckpoint`, for Connect
 * one written by the process Auto-run last started. A leftover block reads as
 * "goal not met".
 */
export const isActivityGoalCurrent = (
  goal: ActivityGoal,
  periodStartFloor: number,
) => goal.period_start >= periodStartFloor;

/**
 * The activity-goal half of "done": met only when the block is current and
 * reports `is_met`. `undefined` when the agent publishes no block.
 */
export const deriveIsActivityGoalMet = (
  goal: ActivityGoal | null,
  periodStartFloor: number,
): boolean | undefined => {
  if (!goal) return undefined;
  return isActivityGoalCurrent(goal, periodStartFloor) && goal.is_met;
};

/**
 * "Done for the epoch" for a staking agent: both the staking KPI and the
 * activity goal are met. Without a block it falls back to the staking KPI
 * alone, so older agent builds behave as before. An agent Auto-run found
 * stalled on its goal reads as done, so it rotates away like a finished one.
 *
 * @example
 * deriveIsDoneForEpoch(true, null, 1000) // => true (fallback)
 * deriveIsDoneForEpoch(true, { ...goal, period_start: 900, is_met: true }, 1000) // => false (stale)
 * deriveIsDoneForEpoch(true, { ...goal, is_met: false }, 1000, true) // => true (stalled)
 */
export const deriveIsDoneForEpoch = (
  epochTargetMet: boolean,
  goal: ActivityGoal | null,
  tsCheckpoint: number,
  isStalled?: boolean,
): boolean =>
  epochTargetMet &&
  (!!isStalled || (deriveIsActivityGoalMet(goal, tsCheckpoint) ?? true));

export type ActivityGoalProgress = Pick<
  ActivityGoal,
  'progress' | 'target' | 'unit'
>;

/**
 * Progress toward the goal for this period. A block from an earlier period
 * counts as no progress, since its `progress` belongs to that period.
 */
export const getActivityGoalProgress = (
  goal: ActivityGoal,
  periodStartFloor: number,
): ActivityGoalProgress => ({
  progress: isActivityGoalCurrent(goal, periodStartFloor) ? goal.progress : 0,
  target: goal.target,
  unit: goal.unit,
});

/**
 * @example
 * formatActivityGoalProgress({ progress: 3, target: 8, unit: 'trades' }) // => '3 of 8 trades'
 * formatActivityGoalProgress({ progress: 0, target: 1, unit: 'trades' }) // => '0 of 1 trade'
 */
export const formatActivityGoalProgress = ({
  progress,
  target,
  unit,
}: ActivityGoalProgress) =>
  `${progress} of ${target} ${target === 1 ? unit.slice(0, -1) : unit}`;
