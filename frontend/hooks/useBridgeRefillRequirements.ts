import { useQuery } from '@tanstack/react-query';
import { useContext } from 'react';

import { REACT_QUERY_KEYS, TEN_SECONDS_INTERVAL } from '@/constants';
import { OnlineStatusContext } from '@/context/OnlineStatusProvider';
import { BridgeService } from '@/service/Bridge';
import { BridgeRefillRequirementsRequest } from '@/types/Bridge';

export const useBridgeRefillRequirements = (
  params: BridgeRefillRequirementsRequest | null,
  canPoll: boolean = true,
  enabled: boolean = true,
  queryKeySuffix?: string,
  pollingInterval: number = TEN_SECONDS_INTERVAL,
) => {
  const { isOnline } = useContext(OnlineStatusContext);

  return useQuery({
    queryKey: REACT_QUERY_KEYS.BRIDGE_REFILL_REQUIREMENTS_KEY(
      params!,
      queryKeySuffix,
    ),
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

    refetchInterval: enabled && canPoll ? pollingInterval : false,
    refetchOnWindowFocus: false,
    enabled: isOnline && !!params && !!enabled,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
  });
};
