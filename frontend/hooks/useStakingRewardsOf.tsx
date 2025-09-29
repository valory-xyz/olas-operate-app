import { useQuery } from '@tanstack/react-query';
import { isNil } from 'lodash';
import { useContext, useMemo } from 'react';

import { ACTIVE_AGENTS, AGENT_CONFIG } from '@/config/agents';
import { DEFAULT_STAKING_PROGRAM_IDS } from '@/config/stakingPrograms';
import { AgentType, EvmChainId } from '@/constants';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { OnlineStatusContext } from '@/context/OnlineStatusProvider';
import { useServices } from '@/hooks/useServices';
import { AgentConfig } from '@/types/Agent';
import { StakingRewardsInfoSchema } from '@/types/Autonolas';
import { assertRequired, Maybe } from '@/types/Util';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';
import { isValidServiceId } from '@/utils/service';

/**
 * hook to fetch staking rewards details of a service on a given chain.
 */
export const useStakingRewardsDetails = (chainId: EvmChainId) => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { isFetched: isServicesLoaded, services } = useServices();
  const service = services?.find(
    (s) => s.home_chain === asMiddlewareChain(chainId),
  );

  const agent = ACTIVE_AGENTS.find(
    ([, agentConfig]) => agentConfig.evmHomeChainId === chainId,
  );
  assertRequired(agent, 'Agent not found for the given chainId');
  const agentType = agent[0] as AgentType;

  const agentConfig = useMemo(() => {
    const config: Maybe<AgentConfig> = AGENT_CONFIG[agentType];
    return config;
  }, [agentType]);

  const serviceConfigId = service?.service_config_id;
  const currentChainId = agentConfig.evmHomeChainId;
  const serviceNftTokenId = isNil(service?.chain_configs)
    ? null
    : service.chain_configs?.[service?.home_chain]?.chain_data?.token;

  // fetch chain data from the selected service
  const chainData = !isNil(service?.chain_configs)
    ? service?.chain_configs?.[asMiddlewareChain(currentChainId)]?.chain_data
    : null;
  const multisig = chainData?.multisig;
  const token = chainData?.token;

  const { isLoading, data: activeStakingProgramId } = useQuery({
    queryKey: REACT_QUERY_KEYS.STAKING_PROGRAM_KEY(chainId, serviceNftTokenId!),
    queryFn: async () => {
      if (!serviceNftTokenId) return null;
      if (!Number(serviceNftTokenId)) return null;

      const currentStakingProgramId =
        await agentConfig.serviceApi.getCurrentStakingProgramByServiceId(
          serviceNftTokenId,
          chainId,
        );

      return (
        currentStakingProgramId ||
        DEFAULT_STAKING_PROGRAM_IDS[agentConfig.evmHomeChainId]
      );
    },
    enabled: !isNil(chainId) && isServicesLoaded && !!serviceNftTokenId,
    refetchInterval: FIVE_SECONDS_INTERVAL,
  });

  const selectedStakingProgramId = isLoading
    ? null
    : activeStakingProgramId ||
      DEFAULT_STAKING_PROGRAM_IDS[agentConfig.evmHomeChainId];

  return useQuery({
    queryKey: REACT_QUERY_KEYS.REWARDS_KEY(
      currentChainId,
      serviceConfigId!,
      selectedStakingProgramId!,
      multisig!,
      token!,
    ),
    queryFn: async () => {
      try {
        const response =
          await agentConfig.serviceApi.getAgentStakingRewardsInfo({
            agentMultisigAddress: multisig!,
            serviceId: token!,
            stakingProgramId: selectedStakingProgramId!,
            chainId: currentChainId,
          });

        if (!response) return null;

        try {
          const parsed = StakingRewardsInfoSchema.parse(response);
          return parsed;
        } catch (e) {
          console.error('Error parsing staking rewards info', e);
        }
      } catch (e) {
        console.error('Error getting staking rewards info', e);
      }

      return null;
    },
    enabled:
      !!isOnline &&
      !!serviceConfigId &&
      !!selectedStakingProgramId &&
      !!multisig &&
      isValidServiceId(token),
    refetchInterval: isOnline ? FIVE_SECONDS_INTERVAL : false,
    refetchOnWindowFocus: false,
  });
};
