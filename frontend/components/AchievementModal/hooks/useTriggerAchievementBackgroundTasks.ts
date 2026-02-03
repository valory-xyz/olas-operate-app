// BISECT: Stubbed to do nothing
import { useCallback } from 'react';

import { AchievementWithConfig } from '@/types/Achievement';

/**
 * BISECT: Stubbed hook that does nothing
 */
export const useTriggerAchievementBackgroundTasks = () => {
  const triggerAchievementBackgroundTasks = useCallback(
    (_currentAchievement: AchievementWithConfig) => {
      // BISECT: No-op
      console.log('BISECT: Background tasks trigger disabled');
    },
    [],
  );

  return triggerAchievementBackgroundTasks;
};
