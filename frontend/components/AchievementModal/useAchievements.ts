import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { FIVE_MINUTE_INTERVAL, REACT_QUERY_KEYS } from '@/constants';
import { useServices } from '@/hooks';
import { getAllServicesAchievements } from '@/service/Achievement';
import { AchievementType, AchievementWithType } from '@/types/Achievement';

export const useAchievements = () => {
  const { availableServiceConfigIds } = useServices();

  const serviceConfigIds = useMemo(() => {
    return availableServiceConfigIds.map(({ configId }) => configId);
  }, [availableServiceConfigIds]);

  const { data: achievements } = useQuery({
    queryKey: REACT_QUERY_KEYS.ACHIEVEMENTS_KEY(serviceConfigIds),
    queryFn: async ({ signal }) => {
      const allServicesAchievements = await getAllServicesAchievements({
        serviceConfigIds,
        signal,
      });

      /**
       * Flattened Achievements array with serviceConfigId and achievementType
       */
      const achievements: AchievementWithType[] = [];

      Object.entries(allServicesAchievements).forEach(
        ([serviceConfigId, serviceAchievements]) => {
          Object.entries(serviceAchievements).forEach(
            ([achievementType, achievement]) => {
              achievements.push({
                ...achievement,
                serviceConfigId,
                achievementType: achievementType as AchievementType,
              });
            },
          );
        },
      );

      return achievements;
    },
    refetchInterval: FIVE_MINUTE_INTERVAL,
  });

  return {
    achievements,
  };
};
