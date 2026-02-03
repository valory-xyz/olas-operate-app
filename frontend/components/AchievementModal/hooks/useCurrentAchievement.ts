// BISECT: Stubbed to return no current achievement

import { useCallback } from 'react';

/**
 * BISECT: Stubbed hook that returns no current achievement
 */
export const useCurrentAchievement = () => {
  const markCurrentAchievementAsShown = useCallback(() => {
    // BISECT: No-op
  }, []);

  return {
    currentAchievement: null,
    markCurrentAchievementAsShown,
    isLoading: false,
    isError: false,
  };
};
