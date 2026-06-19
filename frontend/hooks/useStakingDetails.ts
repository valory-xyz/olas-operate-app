import { useMemo } from 'react';

import { ONE_DAY_IN_S } from '@/utils/time';

import { useBalanceContext } from './useBalanceContext';
import { useRewardContext } from './useRewardContext';
import { useRewardsHistory } from './useRewardsHistory';

export const useStakingDetails = () => {
  const { isLoading: isBalanceLoading } = useBalanceContext();
  const {
    isEpochTargetMet,
    stakingRewardsDetails,
    isStakingRewardsDetailsLoading,
  } = useRewardContext();
  const {
    latestRewardStreak: streak,
    isLoading: isRewardsHistoryLoading,
    isError,
  } = useRewardsHistory();

  // Graph does not account for the current day, so we add 1 to the streak once
  // the agent has done its epoch work (target met).
  const optimisticStreak = isEpochTargetMet ? streak + 1 : streak;

  // Calculate the time remaining in the current epoch
  const currentEpochLifetime = useMemo(() => {
    const lastEpochEndTime = stakingRewardsDetails?.tsCheckpoint;
    if (
      !stakingRewardsDetails ||
      isStakingRewardsDetailsLoading ||
      !lastEpochEndTime
    )
      return;

    return (lastEpochEndTime + ONE_DAY_IN_S) * 1000;
  }, [stakingRewardsDetails, isStakingRewardsDetailsLoading]);

  // If rewards history is loading for the first time
  // or balances are not fetched yet - show loading state
  const isStreakLoading = isBalanceLoading || isRewardsHistoryLoading;

  return {
    isStreakLoading,
    isStreakError: isError,
    optimisticStreak,
    currentEpochLifetime,
  };
};
