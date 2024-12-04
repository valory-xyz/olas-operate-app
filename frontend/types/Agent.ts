import { MiddlewareChain } from '@/client';
import { EvmChainId } from '@/enums/Chain';
import { PredictTraderService } from '@/service/agents/PredictTrader';

export type StakedAgentServiceInstance = PredictTraderService;
export type AgentConfig = {
  name: string;
  evmHomeChainId: EvmChainId;
  middlewareHomeChainId: MiddlewareChain;
  requiresAgentSafesOn: EvmChainId[];
  agentSafeFundingRequirements: Record<string, number>;
  requiresMasterSafesOn: EvmChainId[];
  serviceApi: typeof PredictTraderService;
};
