import { Flex, Skeleton } from 'antd';

import { FireNoStreak } from '@/components/custom-icons/FireNoStreak';
import { FireV1 } from '@/components/custom-icons/FireV1';
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
    contractCheckpoints,
    recentStakingContractAddress,
  } = useRewardsHistory();

  // Graph does not account for the current day,
  // so we need to add 1 to the streak, if the user is eligible for rewards
  const optimisticStreak = (isEligibleForRewards ? streak + 1 : streak) + 9;

  // If rewards history is loading for the first time
  // or balances are not fetched yet - show loading state
  if (isRewardsHistoryLoading || !isBalanceLoaded) {
    return <Skeleton.Input active size="small" />;
  }
  const checkpoints =
    contractCheckpoints && recentStakingContractAddress
      ? [recentStakingContractAddress]
      : [];
  console.log('checkpoints', {
    contractCheckpoints,
    recentStakingContractAddress,
    checkpoints,
  });

  // const currentEpochLifetime = useMemo(() => {
  //   if (checkpoints.length === 0) return '00:00:00';
  //   const currentEpoch = contractCheckpoints?.[checkpoints[0]]?.[0];
  //   if (!currentEpoch) return '00:00:00';

  //   const now = Math.floor(Date.now() / 1000);
  //   const secondsPassed = now - currentEpoch.epochStartTimeStamp;
  //   const secondsInEpoch =
  //     currentEpoch.epochEndTimeStamp - currentEpoch.epochStartTimeStamp;
  //   const secondsLeft = secondsInEpoch - secondsPassed;

  //   const hours = Math.floor(secondsLeft / 3600)
  //     .toString()
  //     .padStart(2, '0');
  //   const minutes = Math.floor((secondsLeft % 3600) / 60)
  //     .toString()
  //     .padStart(2, '0');
  //   const seconds = Math.floor(secondsLeft % 60)
  //     .toString()
  //     .padStart(2, '0');

  //   return `${hours}:${minutes}:${seconds}`;
  // }, [checkpoints, contractCheckpoints]);

  if (isError) return NA;

  return (
    <Flex gap={8} align="center">
      {optimisticStreak === 0 ? (
        <>
          <FireNoStreak /> No streak
        </>
      ) : (
        <>
          <FireV1 />
          {optimisticStreak}
        </>
      )}
    </Flex>
  );
};
