import { useQuery } from '@tanstack/react-query';
import { useContext } from 'react';

import { FIFTEEN_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { OnlineStatusContext } from '@/context/OnlineStatusProvider';
import { BridgeService } from '@/service/Bridge';
import { BridgeRefillRequirementsRequest } from '@/types/Bridge';

export const useBridgeRefillRequirements = (
  params: BridgeRefillRequirementsRequest | null,
) => {
  const { isOnline } = useContext(OnlineStatusContext);

  return useQuery({
    queryKey: REACT_QUERY_KEYS.BRIDGE_REFILL_REQUIREMENTS_KEY(params!),
    queryFn: async () => {
      if (!params) return null;

      const response = await BridgeService.getBridgeRefillRequirements(params);

      return response;
    },
    refetchInterval: FIFTEEN_SECONDS_INTERVAL,
    refetchOnWindowFocus: false,
    enabled: isOnline && !!params,
  });
};
