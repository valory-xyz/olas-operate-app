import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { REACT_QUERY_KEYS } from '@/constants';

/** Whether AchievementModal has an achievement pending, published through the query cache. */
export const useAchievementPending = () => {
  const queryClient = useQueryClient();

  const { data: isAchievementPending } = useQuery<boolean>({
    queryKey: REACT_QUERY_KEYS.ACHIEVEMENT_PENDING_KEY,
    // Never fetched — written by `AchievementModal`.
    queryFn: () => false,
    enabled: false,
    initialData: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const setAchievementPending = useCallback(
    (isPending: boolean) =>
      queryClient.setQueryData(
        REACT_QUERY_KEYS.ACHIEVEMENT_PENDING_KEY,
        isPending,
      ),
    [queryClient],
  );

  return { isAchievementPending, setAchievementPending };
};
