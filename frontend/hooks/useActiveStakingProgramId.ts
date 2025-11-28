import { useQuery } from '@tanstack/react-query';
import { isNil } from 'lodash';

import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { useServices } from '@/hooks/useServices';
import { AgentConfig } from '@/types/Agent';
import { Maybe } from '@/types/Util';
import { isValidServiceId } from '@/utils';

/**
 * Hook to get the active staking program id.
 * If there is no active staking program, it returns null.
 */
export const useActiveStakingProgramId = (
  serviceNftTokenId: Maybe<number>,
  agentConfig: AgentConfig,
) => {
  const { isFetched: isServicesLoaded } = useServices();
  const { serviceApi, evmHomeChainId } = agentConfig;

  return useQuery({
    queryKey: REACT_QUERY_KEYS.STAKING_PROGRAM_KEY(
      evmHomeChainId,
      serviceNftTokenId!,
    ),
    queryFn: async () => {
      if (!isValidServiceId(serviceNftTokenId)) return null;

      const currentStakingProgramId =
        await serviceApi.getCurrentStakingProgramByServiceId(
          serviceNftTokenId,
          evmHomeChainId,
        );

      return currentStakingProgramId;
    },
    enabled:
      !isNil(evmHomeChainId) &&
      isServicesLoaded &&
      isValidServiceId(serviceNftTokenId),
    refetchInterval: FIVE_SECONDS_INTERVAL,
    refetchIntervalInBackground: true,
  });
};
