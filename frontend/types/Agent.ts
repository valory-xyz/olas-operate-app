import { ChainId } from '@/enums/Chain';
import { PredictTraderService } from '@/service/agents/PredictTrader';

export type StakedAgentServiceInstance = PredictTraderService;
export type AgentConfig = {
  name: string;
  homeChainId: ChainId;
  requiresAgentSafesOn: ChainId[];
  agentSafeFundingRequirements: Record<string, number>;
  requiresMasterSafesOn: ChainId[];
  serviceApi: typeof PredictTraderService;
};
