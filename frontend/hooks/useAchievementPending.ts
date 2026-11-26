import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { REACT_QUERY_KEYS } from '@/constants';

/**
 * Whether `AchievementModal` has an achievement to show or is showing one,
 * counting the load and the moment before it opens. Its achievement lives in
 * that component's own state, so it publishes this through the query cache
 * for the modals that must not cover it.
 */
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
