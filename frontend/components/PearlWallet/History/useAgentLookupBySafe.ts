import { useCallback } from 'react';

import { AGENT_CONFIG } from '@/config/agents';
import { AgentType } from '@/constants/agent';
import { EvmChainId } from '@/constants/chains';
import { useServices } from '@/hooks/useServices';
import { Address } from '@/types/Address';
import { generateAgentName } from '@/utils/generateAgentName';
import { asEvmChainId } from '@/utils/middlewareHelpers';

export type AgentLookupResult = {
  agentType: AgentType;
  displayName: string;
  nickname: string | null;
};

/**
 * Resolve an Agent Safe (multisig) address to its `agentType`, display name,
 * and Pearl-generated nickname. Returns null when the address doesn't match
 * any currently-loaded service.
 */
export const useAgentLookupBySafe = () => {
  const { services, getAgentTypeFromService } = useServices();

  return useCallback(
    (agentSafe: Address | null): AgentLookupResult | null => {
      if (!agentSafe || !services) return null;

      const target = agentSafe.toLowerCase();
      for (const service of services) {
        const configs = service.chain_configs ?? {};
        for (const chainKey of Object.keys(configs)) {
          const chainConfig = configs[chainKey];
          const multisig =
            chainConfig?.chain_data?.multisig?.toLowerCase() ?? null;
          if (multisig !== target) continue;

          const agentType = getAgentTypeFromService(service.service_config_id);
          if (!agentType) return null;

          const chainId = asEvmChainId(chainKey) as EvmChainId;
          const tokenId = chainConfig.chain_data.token;
          const nickname =
            chainId && typeof tokenId === 'number'
              ? generateAgentName(chainId, tokenId)
              : null;

          return {
            agentType,
            displayName: AGENT_CONFIG[agentType]?.displayName ?? 'Agent',
            nickname,
          };
        }
      }
      return null;
    },
    [services, getAgentTypeFromService],
  );
};
