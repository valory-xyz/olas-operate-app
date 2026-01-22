import { AchievementWithType } from '@/types/Achievement';

import { PolystratPayoutAchievement } from './Payout';

type PolystratModalContentProps = {
  achievement: AchievementWithType;
};

export const PolystratModalContent = ({
  achievement,
}: PolystratModalContentProps) => {
  if (achievement.achievementType === 'payout') {
    return <PolystratPayoutAchievement payoutData={achievement} />;
  }

  return null;
};
