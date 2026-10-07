import { isNil } from 'lodash';
import { useMemo } from 'react';

import {
  deriveIsActivityGoalMet,
  deriveIsDoneForEpoch,
} from '@/utils/activityGoal';

import { useActivityGoal } from './useActivityGoal';
import { useRewardContext } from './useRewardContext';
import { useServices } from './useServices';

/**
 * - `working`: staking KPI not met yet (the goal may already be met)
 * - `goal-pending`: staking KPI met, activity goal not met yet
 * - `standby`: both met, the agent waits for the next epoch
 */
export type EpochWorkStatus = 'working' | 'goal-pending' | 'standby';

type EpochWorkStatusResult = {
  isEpochTargetMet: boolean | undefined;
  isActivityGoalMet: boolean | undefined;
  isDoneForEpoch: boolean | undefined;
  workStatus: EpochWorkStatus | undefined;
};

/**
 * Combines the selected instance's staking KPI with its activity goal into
 * the single "done for the epoch" signal used by the Overview strip and
 * Auto-run. Values are `undefined` while either side is still loading.
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
      return {
        isEpochTargetMet,
        isActivityGoalMet: undefined,
        isDoneForEpoch: undefined,
        workStatus: undefined,
      };
    }

    // A failed read counts as "goal not met", as in Auto-run's own poll, so
    // the Overview and Auto-run never disagree about the same instance.
    const isActivityGoalMet = isUnavailable
      ? false
      : deriveIsActivityGoalMet(activityGoal, tsCheckpoint);

    if (!isEpochTargetMet) {
      return {
        isEpochTargetMet,
        isActivityGoalMet,
        isDoneForEpoch: false,
        workStatus: 'working',
      };
    }

    if (isLoading) {
      return {
        isEpochTargetMet,
        isActivityGoalMet: undefined,
        isDoneForEpoch: undefined,
        workStatus: undefined,
      };
    }

    const isDoneForEpoch = isUnavailable
      ? false
      : deriveIsDoneForEpoch(isEpochTargetMet, activityGoal, tsCheckpoint);

    return {
      isEpochTargetMet,
      isActivityGoalMet,
      isDoneForEpoch,
      workStatus: isDoneForEpoch ? 'standby' : 'goal-pending',
    };
  }, [activityGoal, isEpochTargetMet, isLoading, isUnavailable, tsCheckpoint]);
};
