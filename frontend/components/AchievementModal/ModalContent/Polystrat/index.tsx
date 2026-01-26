import { AchievementWithConfig } from '@/types/Achievement';

import { PolystratPayoutAchievement } from './Payout';

type PolystratModalContentProps = {
  achievement: AchievementWithConfig;
};

export const PolystratModalContent = ({
  achievement,
}: PolystratModalContentProps) => {
  if (achievement.data.type === 'polystrat/payout') {
    return <PolystratPayoutAchievement achievement={achievement} />;
  }

  return null;
};
