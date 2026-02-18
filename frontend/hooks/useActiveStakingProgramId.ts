import { useQuery } from '@tanstack/react-query';
import { isNil } from 'lodash';

import { AGENT_CONFIG } from '@/config/agents';
import {
  EvmChainId,
  FIVE_SECONDS_INTERVAL,
  REACT_QUERY_KEYS,
} from '@/constants';
import { useServices } from '@/hooks/useServices';
import { AgentConfig } from '@/types/Agent';
import { Maybe } from '@/types/Util';
import { isValidServiceId } from '@/utils';

import { useDynamicRefetchInterval } from './useDynamicRefetchInterval';

type CreateActiveStakingProgramIdQueryParams = {
  evmHomeChainId: EvmChainId;
  serviceNftTokenId: Maybe<number>;
  serviceApi: (typeof AGENT_CONFIG)[keyof typeof AGENT_CONFIG]['serviceApi'];
  isServicesLoaded: Maybe<boolean>;
  refetchInterval: number;
};

export const createActiveStakingProgramIdQuery = ({
  evmHomeChainId,
  serviceNftTokenId,
  serviceApi,
  isServicesLoaded,
  refetchInterval,
}: CreateActiveStakingProgramIdQueryParams) => {
  return {
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
      !!isServicesLoaded &&
      isValidServiceId(serviceNftTokenId),
    refetchInterval,
  };
};

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
  const refetchInterval = useDynamicRefetchInterval(FIVE_SECONDS_INTERVAL);

  return useQuery(
    createActiveStakingProgramIdQuery({
      evmHomeChainId,
      serviceNftTokenId,
      serviceApi,
      isServicesLoaded,
      refetchInterval,
    }),
  );
};
