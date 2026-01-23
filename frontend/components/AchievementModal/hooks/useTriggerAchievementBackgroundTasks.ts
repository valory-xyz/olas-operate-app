import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
  acknowledgeServiceAchievement,
  triggerAchievementImageGeneration,
} from '@/service/Achievement';
import { AchievementWithConfig } from '@/types/Achievement';

const RETRY_COUNT = 3;

/**
 * Returns the id that's required to fetch the achievement details.
 * For eg: betId in case of a payout.
 */
const getAchievementDataIdFromType = (achievement: AchievementWithConfig) => {
  switch (achievement.type) {
    case 'polystrat/payout':
      return achievement.betId;
    default:
      return null;
  }
};

/**
 * Hook to trigger background tasks for an achievement.
 * This includes acknowledging the achievement and triggering the achievement image generation.
 */
export const useTriggerAchievementBackgroundTasks = () => {
  const { mutate: acknowledgeCurrentAchievement } = useMutation({
    mutationFn: acknowledgeServiceAchievement,
    retry: RETRY_COUNT,
    onError: (error) =>
      console.error('Failed to acknowledge achievement', error),
  });
  const { mutate: triggerImageGeneration } = useMutation({
    mutationFn: triggerAchievementImageGeneration,
    retry: RETRY_COUNT,
    onError: (error) =>
      console.error('Failed to trigger image generation', error),
  });

  const triggerAchievementBackgroundTasks = useCallback(
    (currentAchievement: AchievementWithConfig) => {
      if (!currentAchievement) return;

      const { serviceConfigId, achievement_id } = currentAchievement;
      const [agent, type] = currentAchievement.type.split('/');
      const dataId = getAchievementDataIdFromType(currentAchievement);

      if (!dataId) {
        console.error('Failed to get achievement data id');
        return;
      }

      acknowledgeCurrentAchievement({
        serviceConfigId,
        achievementId: achievement_id,
      });
      triggerImageGeneration({
        agent,
        type,
        id: dataId,
      });
    },
    [acknowledgeCurrentAchievement, triggerImageGeneration],
  );

  return triggerAchievementBackgroundTasks;
};
