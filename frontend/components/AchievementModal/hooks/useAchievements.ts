import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { FIVE_MINUTE_INTERVAL, REACT_QUERY_KEYS } from '@/constants';
import { useServices } from '@/hooks';
import { getAllServicesAchievements } from '@/service/Achievement';
import { AchievementWithConfig } from '@/types/Achievement';

export const useAchievements = () => {
  const { availableServiceConfigIds } = useServices();

  const serviceConfigIds = useMemo(() => {
    return availableServiceConfigIds.map(({ configId }) => configId);
  }, [availableServiceConfigIds]);

  const {
    data: achievements,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: REACT_QUERY_KEYS.ACHIEVEMENTS_KEY(serviceConfigIds),
    queryFn: async ({ signal }) => {
      const allServicesAchievements = await getAllServicesAchievements({
        serviceConfigIds,
        signal,
      });

      /**
       * Flattened Achievements array with serviceConfigId
       */
      const achievements: AchievementWithConfig[] = [];

      Object.entries(allServicesAchievements).forEach(
        ([serviceConfigId, serviceAchievements]) => {
          serviceAchievements.forEach((achievement) => {
            achievements.push({
              ...achievement,
              serviceConfigId,
            });
          });
        },
      );

      return achievements;
    },
    refetchInterval: FIVE_MINUTE_INTERVAL,
  });

  return {
    achievements,
    isLoading,
    error,
    isError,
  };
};
