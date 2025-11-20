import { useQuery } from '@tanstack/react-query';
import { useContext, useMemo } from 'react';

import { TEN_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { OnlineStatusContext } from '@/context/OnlineStatusProvider';
import { BridgeService } from '@/service/Bridge';
import { BridgeRefillRequirementsRequest } from '@/types/Bridge';

export const useBridgeRefillRequirements = (
  params: BridgeRefillRequirementsRequest | null,
  canPoll: boolean = true,
  enabled: boolean = true,
  queryKeySuffix?: string,
) => {
  const { isOnline } = useContext(OnlineStatusContext);

  // Create a stable query key that includes the suffix
  // This ensures different amounts result in different queries
  const queryKey = useMemo(
    () =>
      REACT_QUERY_KEYS.BRIDGE_REFILL_REQUIREMENTS_KEY(params!, queryKeySuffix),
    [params, queryKeySuffix],
  );

  return useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      if (!params) {
        window.console.warn(
          'No parameters provided for bridge refill requirements',
        );
        return null;
      }

      if (!enabled && !canPoll) return null;

      const response = await BridgeService.getBridgeRefillRequirements(
        params,
        signal,
      );

      return response;
    },

    refetchInterval: enabled && canPoll ? TEN_SECONDS_INTERVAL : false,
    refetchOnWindowFocus: false,
    enabled: isOnline && !!params && !!enabled,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchIntervalInBackground: true,
  });
};
