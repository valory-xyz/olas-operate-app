import { AgentType } from '@/enums/Agent';
import { ChainId } from '@/enums/Chain';
import { PredictTraderService } from '@/service/agents/PredictTrader';

// TODO: complete this config
// TODO: add funding requirements

export const AGENT_CONFIG = {
  [AgentType.PredictTrader]: {
    name: 'Predict Trader',
    homeChainId: ChainId.Gnosis,
    requiresAgentSafesOn: [ChainId.Gnosis],
    agentSafeFundingRequirements: {
      [ChainId.Gnosis]: 100000000000000000,
    },
    requiresMasterSafesOn: [ChainId.Gnosis],
    serviceApi: PredictTraderService,
  },
  // [AgentType.Optimus]: {
  //   name: 'Optimus',
  //   homeChainId: ChainId.Optimism,
  //   requiresAgentSafesOn: [ChainId.Optimism, ChainId.Ethereum, ChainId.Base],
  //   requiresMasterSafesOn: [ChainId.Optimism, ChainId.Ethereum, ChainId.Base],
  //   serviceApi: OptimusService,
  // },
};
