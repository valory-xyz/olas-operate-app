import { Flex, Skeleton } from 'antd';

import { FireNoStreak } from '@/components/custom-icons/FireNoStreak';
import { FireStreak } from '@/components/custom-icons/FireStreak';
import { NA } from '@/constants/symbols';
import { useBalanceContext } from '@/hooks/useBalanceContext';
import { useRewardContext } from '@/hooks/useRewardContext';
import { useRewardsHistory } from '@/hooks/useRewardsHistory';

export const Streak = () => {
  const { isLoaded: isBalanceLoaded } = useBalanceContext();
  const { isEligibleForRewards } = useRewardContext();
  const {
    latestRewardStreak: streak,
    isLoading: isRewardsHistoryLoading,
    isError,
  } = useRewardsHistory();

  // Graph does not account for the current day,
  // so we need to add 1 to the streak, if the user is eligible for rewards
  const optimisticStreak = (isEligibleForRewards ? streak + 1 : streak) + 10;

  // If rewards history is loading for the first time
  // or balances are not fetched yet - show loading state
  if (isRewardsHistoryLoading || !isBalanceLoaded) {
    return <Skeleton.Input active size="small" />;
  }

  if (isError) return NA;

  return (
    <Flex gap={8} align="center">
      {optimisticStreak === 0 ? (
        <>
          <FireNoStreak /> No streak
        </>
      ) : (
        <>
          <FireStreak /> {optimisticStreak} day streak
        </>
      )}
    </Flex>
  );
};
