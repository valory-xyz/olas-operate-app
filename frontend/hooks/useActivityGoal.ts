import { useQuery } from '@tanstack/react-query';
import { isNil } from 'lodash';

import { ONE_MINUTE_INTERVAL, REACT_QUERY_KEYS } from '@/constants';
import { ServicesService } from '@/service/Services';
import { AgentPerformance } from '@/types';
import { Maybe } from '@/types/Util';
import { asEvmChainId } from '@/utils';
import { parseActivityGoal } from '@/utils/activityGoal';

import { useServices } from './useServices';

/**
 * Activity-goal block of one service instance, read from its agent
 * performance report. Shares the query cache with the Overview performance
 * card. `activityGoal` is `null` when the agent publishes no (valid) block
 * or no report could be read.
 */
export const useActivityGoal = (serviceConfigId: Maybe<string>) => {
  const { services } = useServices();
  const homeChain = services?.find(
    (service) => service.service_config_id === serviceConfigId,
  )?.home_chain;

  const { data, isLoading, isError } = useQuery({
    queryKey: REACT_QUERY_KEYS.AGENT_PERFORMANCE_KEY(
      homeChain ? asEvmChainId(homeChain) : -1,
      serviceConfigId!,
    ),
    queryFn: async (): Promise<AgentPerformance | null> => {
      if (!serviceConfigId) return null;
      return await ServicesService.getAgentPerformance({ serviceConfigId });
    },
    enabled: !isNil(homeChain) && !isNil(serviceConfigId),
    refetchInterval: ONE_MINUTE_INTERVAL,
    select: (performance) => parseActivityGoal(performance?.activity_goal),
  });

  return {
    activityGoal: data ?? null,
    isLoading,
    /** No report could be read at all (a failed refetch keeps the last one). */
    isUnavailable: isError && data === undefined,
  };
};
