import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { AchievementWithConfig } from '@/types/Achievement';
import { ONE_MINUTE_IN_MS } from '@/utils';

import { useAchievements } from './useAchievements';

export const useCurrentAchievement = () => {
  const { achievements, isLoading, isError } = useAchievements();

  const [currentAchievement, setCurrentAchievement] =
    useState<AchievementWithConfig | null>(null);
  // Tracks shown achievements in order to not show them again
  const [shownAchievementIds, setShownAchievementIds] = useState<Set<string>>(
    new Set(),
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Wait for 1 minute before marking the current achievement as shown
    // This is to ensure that there is a small delay between showing achievements
    timeoutRef.current = setTimeout(() => {
      setCurrentAchievement(null);
      setShownAchievementIds(
        (prev) => new Set([...prev, currentAchievement.achievement_id]),
      );
      timeoutRef.current = null;
    }, ONE_MINUTE_IN_MS);
  }, [currentAchievement]);

  useUnmount(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  });

  useEffect(() => {
    if (!currentAchievement && unshownAchievements.length > 0) {
      showNextAchievement();
    }
  }, [currentAchievement, unshownAchievements, showNextAchievement]);

  return {
    currentAchievement,
    markCurrentAchievementAsShown,
    isLoading,
    isError,
  };
};
