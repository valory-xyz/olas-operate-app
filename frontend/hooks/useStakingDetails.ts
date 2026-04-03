import { BigNumber } from 'ethers';
import { useMemo } from 'react';

import { useBalanceContext } from './useBalanceContext';
import { useRewardContext } from './useRewardContext';
import { useRewardsHistory } from './useRewardsHistory';

export const useStakingDetails = () => {
  const { isLoading: isBalanceLoading } = useBalanceContext();
  const {
    isEligibleForRewards,
    stakingRewardsDetails,
    isStakingRewardsDetailsLoading,
  } = useRewardContext();
  const {
    latestRewardStreak: streak,
    isLoading: isRewardsHistoryLoading,
    isError,
  } = useRewardsHistory();

  // Graph does not account for the current day,
  // so we need to add 1 to the streak, if the user is eligible for rewards
  const optimisticStreak = isEligibleForRewards ? streak + 1 : streak;

  // Calculate the time remaining in the current epoch
  const currentEpochLifetime = useMemo(() => {
    const lastEpochEndTime = stakingRewardsDetails?.tsCheckpoint;
    const livenessPeriod = stakingRewardsDetails?.livenessPeriod;
    if (
      !stakingRewardsDetails ||
      isStakingRewardsDetailsLoading ||
      !lastEpochEndTime ||
      !livenessPeriod
    )
      return;

    try {
      const currentEpochEndTime =
        (lastEpochEndTime + BigNumber.from(livenessPeriod).toNumber()) * 1000;

      // When the epoch is already overdue and auto-run is waiting on an on-chain
      // checkpoint, avoid rendering a frozen 00:00:00 countdown.
      if (currentEpochEndTime <= Date.now()) return;

      return currentEpochEndTime;
    } catch {
      return;
    }
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
