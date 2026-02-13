import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { FIVE_MINUTE_INTERVAL, REACT_QUERY_KEYS } from '@/constants';
import { useAgentRunning } from '@/hooks';
import { getServiceAchievements } from '@/service/Achievement';

export const useAchievements = () => {
  const { runningServiceConfigId } = useAgentRunning();

  const {
    data: achievements,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: REACT_QUERY_KEYS.ACHIEVEMENTS_KEY(runningServiceConfigId),
    queryFn: async ({ signal }) => {
      if (!runningServiceConfigId) return [];

      const serviceAchievements = await getServiceAchievements({
        serviceConfigId: runningServiceConfigId,
        signal,
      });

      return serviceAchievements.map((achievement) => ({
        ...achievement,
        serviceConfigId: runningServiceConfigId,
      }));
    },
    enabled: !!runningServiceConfigId,
    refetchInterval: FIVE_MINUTE_INTERVAL,
  });

  useEffect(() => {
    if (isError && error) {
      console.error('Failed to fetch achievements:', error);
    }
  }, [isError, error]);

  return {
    achievements,
    isLoading,
    isError,
  };
};
