import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { isNil } from 'lodash';

import { FIVE_MINUTE_INTERVAL, REACT_QUERY_KEYS } from '@/constants';
import { ServicesService } from '@/service/Services';
import { asEvmChainId } from '@/utils';

import { useServices } from './useServices';

/**
 * Hook to get the agent performance data
 */
export const useAgentPerformance = () => {
  const { selectedService } = useServices();
  const chainId = selectedService?.home_chain;
  const serviceConfigId = selectedService?.service_config_id;

  return useQuery({
    queryKey: REACT_QUERY_KEYS.AGENT_PERFORMANCE_KEY(
      chainId ? asEvmChainId(chainId) : -1,
      serviceConfigId!,
    ),
    queryFn: async () => {
      if (!serviceConfigId) return null;

      return await ServicesService.getAgentPerformance({
        serviceConfigId,
      });
    },
    enabled: !isNil(chainId) && !isNil(serviceConfigId),
    refetchInterval: FIVE_MINUTE_INTERVAL,
    placeholderData: keepPreviousData,
  });
};
