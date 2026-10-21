import { Flex, Skeleton } from 'antd';

import { FireV1 } from '@/components/custom-icons';
import { useContentTransitionValue } from '@/components/ui';
import { NA } from '@/constants/symbols';
import { useRewardContext } from '@/hooks';
import { useStakingDetails } from '@/hooks/useStakingDetails';

// The width of the loaded flame and count, so a tight row doesn't overflow.
const COMPACT_SKELETON_STYLE = { width: 48, minWidth: 48 };

type StreakProps = { isCompact?: boolean };

export const Streak = ({ isCompact }: StreakProps) => {
  const {
    isStreakLoading,
    isStreakError,
    optimisticStreak: rawStreak,
  } = useStakingDetails();
  const { isEpochTargetMet: rawIsEpochTargetMet } = useRewardContext();
  const optimisticStreak = useContentTransitionValue(rawStreak);
  const isEpochTargetMet = useContentTransitionValue(rawIsEpochTargetMet);

  if (isStreakLoading) {
    return (
      <Skeleton.Input
        active
        size="small"
        style={isCompact ? COMPACT_SKELETON_STYLE : undefined}
      />
    );
  }
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
