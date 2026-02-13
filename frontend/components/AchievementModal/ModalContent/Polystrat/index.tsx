import { ACHIEVEMENT_TYPE } from '@/constants';
import { AchievementWithConfig } from '@/types/Achievement';

import { PolystratPayoutAchievement } from './Payout';

type PolystratModalContentProps = {
  achievement: AchievementWithConfig;
};

export const PolystratModalContent = ({
  achievement,
}: PolystratModalContentProps) => {
  if (achievement.achievement_type === ACHIEVEMENT_TYPE.POLYSTRAT_PAYOUT) {
    return <PolystratPayoutAchievement achievement={achievement} />;
  }

  return null;
};
