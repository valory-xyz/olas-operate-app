import { ACTIVE_AGENTS } from '@/config/agents';
import { AgentType } from '@/constants';
import { MiddlewareServiceResponse } from '@/types';
import { isValidServiceId } from '@/utils';

/** Find an undeployed instance of the given agent type */
export const findUndeployedInstance = (
  agentType: AgentType,
  services: MiddlewareServiceResponse[],
): MiddlewareServiceResponse | undefined => {
  const agentConfig = ACTIVE_AGENTS.find(([type]) => type === agentType)?.[1];
  if (!agentConfig) return undefined;

  return services.find((service) => {
    if (
      service.service_public_id !== agentConfig.servicePublicId ||
      service.home_chain !== agentConfig.middlewareHomeChainId
    ) {
      return false;
    }
    const tokenId =
      service.chain_configs[service.home_chain]?.chain_data?.token;
    return !isValidServiceId(tokenId);
  });
};
