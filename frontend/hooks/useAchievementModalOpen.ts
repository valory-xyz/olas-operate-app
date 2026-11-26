import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { REACT_QUERY_KEYS } from '@/constants';

/**
 * Whether `AchievementModal` is showing an achievement. Its achievement lives
 * in that component's own state, so it publishes this through the query cache
 * for the modals that must not cover it.
 */
export const useAchievementModalOpen = () => {
  const queryClient = useQueryClient();

  const { data: isAchievementModalOpen } = useQuery<boolean>({
    queryKey: REACT_QUERY_KEYS.ACHIEVEMENT_MODAL_OPEN_KEY,
    // Never fetched — written by `AchievementModal`.
    queryFn: () => false,
    enabled: false,
    initialData: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const setAchievementModalOpen = useCallback(
    (isOpen: boolean) =>
      queryClient.setQueryData(
        REACT_QUERY_KEYS.ACHIEVEMENT_MODAL_OPEN_KEY,
        isOpen,
      ),
    [queryClient],
  );

  return { isAchievementModalOpen, setAchievementModalOpen };
};
