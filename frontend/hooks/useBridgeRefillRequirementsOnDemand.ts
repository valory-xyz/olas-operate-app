import { useQuery } from '@tanstack/react-query';

import { REACT_QUERY_KEYS } from '@/constants';
import { BridgeService } from '@/service/Bridge';
import { BridgeRefillRequirementsRequest } from '@/types/Bridge';

/**
 * Hook to fetch bridge refill requirements on demand, always returning fresh data.
 */
export const useBridgeRefillRequirementsOnDemand = (
  params: BridgeRefillRequirementsRequest | null,
) => {
  return useQuery({
    queryKey: [
      REACT_QUERY_KEYS.BRIDGE_REFILL_REQUIREMENTS_KEY_ON_DEMAND,
      params!,
    ],
    queryFn: async ({ signal }) => {
      if (!params) {
        window.console.warn(
          'No parameters provided for bridge refill requirements',
        );
        return null;
      }

      const response = await BridgeService.getBridgeRefillRequirements(
        params,
        signal,
      );
      return response;
    },
    enabled: false,
    retry: false,
    staleTime: 0,
  });
};
