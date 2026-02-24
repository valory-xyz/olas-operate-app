import { ACHIEVEMENT_TYPE } from '@/constants';
import { AchievementWithConfig } from '@/types/Achievement';

import { PolystratPayoutAchievement } from './Payout';

type PolystratModalContentProps = {
  achievement: AchievementWithConfig;
  onShare?: () => void;
};

export const PolystratModalContent = ({
  achievement,
  onShare,
}: PolystratModalContentProps) => {
  if (achievement.achievement_type === ACHIEVEMENT_TYPE.POLYSTRAT_PAYOUT) {
    return (
      <PolystratPayoutAchievement achievement={achievement} onShare={onShare} />
    );
  }

  return null;
};
