import { useQuery } from '@tanstack/react-query';
import { useContext } from 'react';

import { TEN_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { OnlineStatusContext } from '@/context/OnlineStatusProvider';
import { BridgeService } from '@/service/Bridge';
import { BridgeRefillRequirementsRequest } from '@/types/Bridge';
import { delayInSeconds } from '@/utils/delay';

export const useBridgeRefillRequirements = (
  params: BridgeRefillRequirementsRequest | null,
) => {
  const { isOnline } = useContext(OnlineStatusContext);

  return useQuery({
    queryKey: REACT_QUERY_KEYS.BRIDGE_REFILL_REQUIREMENTS_KEY(params!),
    queryFn: async () => {
      await delayInSeconds(1);
      const response = await BridgeService.getBridgeRefillRequirements(params!);

      await delayInSeconds(4);
      return response;
    },
    refetchInterval: TEN_SECONDS_INTERVAL,
    refetchOnWindowFocus: false,
    enabled: isOnline && !!params,
  });
};
