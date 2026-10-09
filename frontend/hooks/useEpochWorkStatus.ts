import { isNil } from 'lodash';
import { useMemo } from 'react';

import { deriveIsDoneForEpoch } from '@/utils/activityGoal';

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
    if (!isEpochTargetMet) {
      return { isDoneForEpoch: false, workStatus: 'working' };
    }
    // A failed read is unknown, as in Auto-run's own poll, so the Overview
    // and Auto-run never disagree about the same instance.
    if (isLoading || isUnavailable) return UNKNOWN_WORK_STATUS;

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
