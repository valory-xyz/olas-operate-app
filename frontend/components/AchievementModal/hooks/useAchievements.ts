// BISECT: Stubbed to return empty achievements without API calls

import { AchievementWithConfig } from '@/types/Achievement';

/**
 * BISECT: Stubbed hook that returns empty achievements
 */
export const useAchievements = () => {
  return {
    achievements: [] as AchievementWithConfig[],
    isLoading: false,
    isError: false,
  };
};
