import { useCallback, useEffect, useMemo, useState } from 'react';

import { AchievementWithConfig } from '@/types/Achievement';

import { useAchievements } from './useAchievements';

export const useCurrentAchievement = () => {
  const { achievements } = useAchievements();

  const [currentAchievement, setCurrentAchievement] =
    useState<AchievementWithConfig | null>(null);
  // Tracks shown achievements in order to not show them again
  const [shownAchievementIds, setShownAchievementIds] = useState<Set<string>>(
    new Set(),
  );

  const unshownAchievements = useMemo(() => {
    if (!achievements || achievements.length === 0) return [];

    return achievements.filter(
      (achievement) => !shownAchievementIds.has(achievement.achievement_id),
    );
  }, [achievements, shownAchievementIds]);

  const showNextAchievement = useCallback(() => {
    const nextAchievement = unshownAchievements[0] || null;
    setCurrentAchievement(nextAchievement);
  }, [unshownAchievements]);

  const markCurrentAchievementAsShown = useCallback(() => {
    if (!currentAchievement) return;
    setShownAchievementIds(
      (prev) => new Set([...prev, currentAchievement.achievement_id]),
    );
  }, [currentAchievement]);

  useEffect(() => {
    if (!currentAchievement && unshownAchievements.length > 0) {
      showNextAchievement();
    }
  }, [currentAchievement, unshownAchievements, showNextAchievement]);

  return {
    currentAchievement,
    markCurrentAchievementAsShown,
  };
};
