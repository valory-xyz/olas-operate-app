import { useQuery } from '@tanstack/react-query';
import { isNil } from 'lodash';
import { useContext } from 'react';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { EvmChainId, REACT_QUERY_KEYS, StakingProgramId } from '@/constants';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { OnlineStatusContext } from '@/context/OnlineStatusProvider';
import { useServices } from '@/hooks/useServices';
import { Address } from '@/types';
import { AgentConfig } from '@/types/Agent';
import { Maybe, Nullable } from '@/types/Util';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';
import { isValidServiceId } from '@/utils/service';
import { fetchAgentStakingRewardsInfo } from '@/utils/stakingRewards';

import { useDynamicRefetchInterval } from './useDynamicRefetchInterval';

type CreateStakingRewardsQueryParams = {
  chainId: EvmChainId;
  serviceConfigId: Maybe<string>;
  stakingProgramId: Nullable<StakingProgramId>;
  multisig: Maybe<string>;
  serviceNftTokenId: Maybe<number>;
  agentConfig: AgentConfig;
  isOnline: boolean;
  refetchInterval: number;
};
export const createStakingRewardsQuery = ({
  chainId,
  serviceConfigId,
  stakingProgramId,
  multisig,
  serviceNftTokenId,
  agentConfig,
  isOnline,
}: CreateStakingRewardsQueryParams) => {
  const hasStakingProgram =
    !!stakingProgramId && !!STAKING_PROGRAMS[chainId]?.[stakingProgramId];
  return {
    queryKey: REACT_QUERY_KEYS.REWARDS_KEY(
      chainId,
      serviceConfigId!,
      stakingProgramId!,
      multisig!,
      serviceNftTokenId!,
    ),
    queryFn: async () => {
      if (!hasStakingProgram) return null;
      return fetchAgentStakingRewardsInfo({
        chainId,
        serviceNftTokenId: serviceNftTokenId!,
        stakingProgramId: stakingProgramId!,
        multisig: multisig! as Address,
        agentConfig,
        onError: (error) =>
          console.error('Error getting staking rewards info', error),
      });
    },
    enabled:
      !!isOnline &&
      !!serviceConfigId &&
      hasStakingProgram &&
      !!multisig &&
      isValidServiceId(serviceNftTokenId),
    refetchInterval: (isOnline ? FIVE_SECONDS_INTERVAL : false) as
      | number
      | false,
    refetchOnWindowFocus: false,
  };
};

/**
 * Hook to fetch staking rewards details of a service on a given chain.
 */
export const useAgentStakingRewardsDetails = (
  chainId: EvmChainId,
  stakingProgramId: Nullable<StakingProgramId>,
  agentConfig: AgentConfig,
) => {
  const refetchInterval = useDynamicRefetchInterval(FIVE_SECONDS_INTERVAL);
  const { isOnline } = useContext(OnlineStatusContext);
  const { services, selectedAgentConfig } = useServices();
  const service = services?.find(
    (s) =>
      s.service_public_id === selectedAgentConfig.servicePublicId &&
      s.home_chain === asMiddlewareChain(chainId),
  );

  const serviceConfigId = service?.service_config_id;
  const chainConfigs = service?.chain_configs;
  const chainDetails = isNil(chainConfigs)
    ? null
    : chainConfigs[asMiddlewareChain(chainId)]?.chain_data;
  const multisig = chainDetails?.multisig;
  const serviceNftTokenId = chainDetails?.token;

  return useQuery(
    createStakingRewardsQuery({
      chainId,
      serviceConfigId,
      stakingProgramId,
      multisig,
      serviceNftTokenId,
      agentConfig,
      isOnline,
      refetchInterval,
    }),
  );
};
