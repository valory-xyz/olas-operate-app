import { isNil } from 'lodash';
import { useMemo } from 'react';

import {
  deriveIsDoneForEpoch,
  deriveIsNoMarketsLeft,
  deriveIsNoMarketsStandby,
} from '@/utils/activityGoal';

import { useActivityGoal } from './useActivityGoal';
import { useRewardContext } from './useRewardContext';
import { useServices } from './useServices';

/**
 * - `working`: staking KPI not met yet (the goal may already be met)
 * - `goal-pending`: staking KPI met, activity goal not met yet
 * - `standby`: done for the epoch (both met, or no market left after the goal);
 *   the agent waits for the next epoch
 * - `no-markets-standby`: done because no market is left to try before the
 *   goal is reached, with or without the staking KPI
 */
export type EpochWorkStatus =
  | 'working'
  | 'goal-pending'
  | 'standby'
  | 'no-markets-standby';

type EpochWorkStatusResult = {
  isDoneForEpoch: boolean | undefined;
  workStatus: EpochWorkStatus | undefined;
};

const UNKNOWN_WORK_STATUS: EpochWorkStatusResult = {
  isDoneForEpoch: undefined,
  workStatus: undefined,
};

/**
 * Combines the selected instance's staking KPI with its activity goal into
 * the single "done for the epoch" signal used by the Overview strip and
 * Auto-run. Values are `undefined` while either side is unknown.
 */
export const useEpochWorkStatus = (): EpochWorkStatusResult => {
  const { selectedService } = useServices();
  const { isEpochTargetMet, stakingRewardsDetails } = useRewardContext();
  const { activityGoal, isLoading, isUnavailable } = useActivityGoal(
    selectedService?.service_config_id,
  );
  const tsCheckpoint = stakingRewardsDetails?.tsCheckpoint;

  return useMemo(() => {
    if (isNil(isEpochTargetMet) || isNil(tsCheckpoint)) {
      return UNKNOWN_WORK_STATUS;
    }
    const isGoalRead = !isLoading && !isUnavailable;
    // Same rule as `deriveIsDoneForEpoch`, so Auto-run agrees on done; the
    // standby kind only picks the row the Overview shows.
    if (isGoalRead && deriveIsNoMarketsLeft(activityGoal, tsCheckpoint)) {
      return {
        isDoneForEpoch: true,
        workStatus: deriveIsNoMarketsStandby(activityGoal, tsCheckpoint)
          ? 'no-markets-standby'
          : 'standby',
      };
    }
    if (!isEpochTargetMet) {
      return { isDoneForEpoch: false, workStatus: 'working' };
    }
    // A failed read is unknown, as in Auto-run's own poll, so the Overview
    // and Auto-run never disagree about the same instance.
    if (!isGoalRead) return UNKNOWN_WORK_STATUS;

    const isDoneForEpoch = deriveIsDoneForEpoch(
      isEpochTargetMet,
      activityGoal,
      tsCheckpoint,
    );
    return {
      isDoneForEpoch,
      workStatus: isDoneForEpoch ? 'standby' : 'goal-pending',
    };
  }, [activityGoal, isEpochTargetMet, isLoading, isUnavailable, tsCheckpoint]);
};
