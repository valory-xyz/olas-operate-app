import { useQuery } from '@tanstack/react-query';
import { isNil } from 'lodash';
import { useContext, useMemo } from 'react';

import { ACTIVE_AGENTS, AGENT_CONFIG } from '@/config/agents';
import { AgentType, EvmChainId } from '@/constants';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { OnlineStatusContext } from '@/context/OnlineStatusProvider';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useServices } from '@/hooks/useServices';
import { AgentConfig } from '@/types/Agent';
import { StakingRewardsInfoSchema } from '@/types/Autonolas';
import { assertRequired, Maybe } from '@/types/Util';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';
import { isValidServiceId } from '@/utils/service';

/**
 * hook to fetch staking rewards details of a service on a given chain.
 */
export const useStakingRewardsOf = (
  chainId: EvmChainId,
  stakingProgramId: StakingProgramId,
) => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { services } = useServices();
  const service = services?.find(
    (s) => s.home_chain === asMiddlewareChain(chainId),
  );

  // Find an active agent for the given chainId.
  // NOTE: the logic needs to be updated once multiple agent in single chain is supported
  const agent = ACTIVE_AGENTS.find(
    ([, agentConfig]) => agentConfig.evmHomeChainId === chainId,
  );
  assertRequired(agent, 'Agent not found for the given chainId.');
  const agentType = agent[0] as AgentType;

  const agentConfig = useMemo(() => {
    const config: Maybe<AgentConfig> = AGENT_CONFIG[agentType];
    return config;
  }, [agentType]);

  const serviceConfigId = service?.service_config_id;
  const chainConfigs = service?.chain_configs;
  const chainDetails = isNil(chainConfigs)
    ? null
    : chainConfigs[asMiddlewareChain(chainId)]?.chain_data;
  const multisig = chainDetails?.multisig;
  const serviceNftTokenId = chainDetails?.token;

  return useQuery({
    queryKey: REACT_QUERY_KEYS.REWARDS_KEY(
      chainId,
      serviceConfigId!,
      stakingProgramId!,
      multisig!,
      serviceNftTokenId!,
    ),
    queryFn: async () => {
      try {
        const response =
          await agentConfig.serviceApi.getAgentStakingRewardsInfo({
            agentMultisigAddress: multisig!,
            serviceId: serviceNftTokenId!,
            stakingProgramId: stakingProgramId!,
            chainId,
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
      !!stakingProgramId &&
      !!multisig &&
      isValidServiceId(serviceNftTokenId),
    refetchInterval: isOnline ? FIVE_SECONDS_INTERVAL : false,
    refetchOnWindowFocus: false,
  });
};
