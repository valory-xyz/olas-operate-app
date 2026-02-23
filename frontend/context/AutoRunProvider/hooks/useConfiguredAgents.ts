import { useMemo } from 'react';

import { Service } from '@/types';

import { AgentMeta } from '../types';
import { getAgentFromService } from '../utils';

export const useConfiguredAgents = (services?: Service[]) => {
  return useMemo(() => {
    if (!services) return [] as AgentMeta[];

    return services.reduce<AgentMeta[]>((acc, service) => {
      const agentEntry = getAgentFromService(service);
      if (!agentEntry) return acc;

      const [agentType, agentConfig] = agentEntry;
      const chainConfig = service.chain_configs?.[service.home_chain];
      if (!chainConfig) return acc;

      const stakingProgramId =
        chainConfig.chain_data.user_params.staking_program_id ||
        agentConfig.defaultStakingProgramId;

      acc.push({
        agentType,
        agentConfig,
        service,
        serviceConfigId: service.service_config_id,
        chainId: agentConfig.evmHomeChainId,
        stakingProgramId,
        multisig: chainConfig.chain_data.multisig,
        serviceNftTokenId: chainConfig.chain_data.token,
      });
      return acc;
    }, []);
  }, [services]);
};
