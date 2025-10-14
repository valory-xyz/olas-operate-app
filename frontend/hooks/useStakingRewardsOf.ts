import { isNil } from 'lodash';
import { useMemo } from 'react';

import { ACTIVE_AGENTS, AGENT_CONFIG } from '@/config/agents';
import { DEFAULT_STAKING_PROGRAM_IDS } from '@/config/stakingPrograms';
import { AgentType, EvmChainId } from '@/constants';
import { AgentConfig } from '@/types/Agent';
import { assertRequired, Maybe } from '@/types/Util';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';

import { useActiveStakingProgramId } from './useActiveStakingProgramId';
import { useAgentStakingRewardsDetails } from './useAgentStakingRewardsDetails';
import { useServices } from './useServices';

/**
 * Hook to fetch staking rewards details of a service on a given chain.
 */
export const useStakingRewardsOf = (chainId: EvmChainId) => {
  const { services } = useServices();
  const service = services?.find(
    (s) => s.home_chain === asMiddlewareChain(chainId),
  );

  // Find an active agent for the given chainId.
  // TODO: the logic needs to be updated once multiple agent in single chain is supported
  const agent = ACTIVE_AGENTS.find(
    ([, agentConfig]) => agentConfig.evmHomeChainId === chainId,
  );
  assertRequired(agent, 'Agent not found for the given chainId.');
  const agentType = agent[0] as AgentType;

  const agentConfig: Maybe<AgentConfig> = useMemo(
    () => AGENT_CONFIG[agentType],
    [agentType],
  );

  const chainConfigs = service?.chain_configs;
  const chainDetails = isNil(chainConfigs)
    ? null
    : chainConfigs[asMiddlewareChain(chainId)]?.chain_data;
  const serviceNftTokenId = chainDetails?.token;

  const { isLoading, data: activeStakingProgramId } = useActiveStakingProgramId(
    serviceNftTokenId,
    agentConfig,
  );

  const selectedStakingProgramId = useMemo(() => {
    const defaultStakingProgramId =
      DEFAULT_STAKING_PROGRAM_IDS[agentConfig.evmHomeChainId];
    return isLoading ? null : activeStakingProgramId || defaultStakingProgramId;
  }, [agentConfig.evmHomeChainId, isLoading, activeStakingProgramId]);

  return useAgentStakingRewardsDetails(
    chainId,
    selectedStakingProgramId,
    agentConfig,
  );
};
