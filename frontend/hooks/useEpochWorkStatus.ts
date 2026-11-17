import { isNil } from 'lodash';
import { useMemo } from 'react';

import {
  deriveIsDoneForEpoch,
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
 *   goal is reached, with or without the staking KPI (`canReportNoMarketsLeft`)
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
  const { selectedService, selectedAgentConfig } = useServices();
  // As in Auto-run's poll, the goal decides done before the KPI only for an
  // agent that can report no markets left.
  const readsGoalBeforeKpi = !!selectedAgentConfig.canReportNoMarketsLeft;
  const { isEpochTargetMet, stakingRewardsDetails } = useRewardContext();
  const { activityGoal, isLoading, isUnavailable } = useActivityGoal(
    selectedService?.service_config_id,
  );
  const tsCheckpoint = stakingRewardsDetails?.tsCheckpoint;

  return useMemo(() => {
    if (isNil(isEpochTargetMet) || isNil(tsCheckpoint)) {
      return UNKNOWN_WORK_STATUS;
    }
    if (!isEpochTargetMet && !readsGoalBeforeKpi) {
      return { isDoneForEpoch: false, workStatus: 'working' };
    }
    // Once the KPI is met a failed read is unknown, as in Auto-run's poll.
    if (isLoading || isUnavailable) {
      return isEpochTargetMet
        ? UNKNOWN_WORK_STATUS
        : { isDoneForEpoch: false, workStatus: 'working' };
    }
    const isDoneForEpoch = deriveIsDoneForEpoch(
      isEpochTargetMet,
      activityGoal,
      tsCheckpoint,
    );
    if (!isDoneForEpoch) {
      return {
        isDoneForEpoch,
        workStatus: isEpochTargetMet ? 'goal-pending' : 'working',
      };
    }
    return {
      isDoneForEpoch,
      workStatus: deriveIsNoMarketsStandby(activityGoal, tsCheckpoint)
        ? 'no-markets-standby'
        : 'standby',
    };
  }, [
    activityGoal,
    isEpochTargetMet,
    isLoading,
    isUnavailable,
    readsGoalBeforeKpi,
    tsCheckpoint,
  ]);
};
