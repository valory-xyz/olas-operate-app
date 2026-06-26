import { Flex, Skeleton } from 'antd';

import { FireV1 } from '@/components/custom-icons';
import { useContentTransitionValue } from '@/components/ui';
import { NA } from '@/constants/symbols';
import { useRewardContext } from '@/hooks';
import { useStakingDetails } from '@/hooks/useStakingDetails';

export const Streak = () => {
  const {
    isStreakLoading,
    isStreakError,
    optimisticStreak: rawStreak,
  } = useStakingDetails();
  const { isEpochTargetMet: rawIsEpochTargetMet } = useRewardContext();
  const optimisticStreak = useContentTransitionValue(rawStreak);
  const isEpochTargetMet = useContentTransitionValue(rawIsEpochTargetMet);

  if (isStreakLoading) return <Skeleton.Input active size="small" />;
  if (isStreakError) return NA;

  const isFlameActive = optimisticStreak > 0 && isEpochTargetMet;

  return (
    <Flex gap={6} align="center">
      {optimisticStreak === 0 ? (
        <>
          <FireV1 /> No streak
        </>
      ) : (
        <>
          <FireV1 isActive={isFlameActive} />
          {optimisticStreak}
        </>
      )}
    </Flex>
  );
};
