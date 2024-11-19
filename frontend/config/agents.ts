import { AgentType } from '@/enums/Agent';
import { ChainId } from '@/enums/Chain';
import { PredictTraderService } from '@/service/agents/PredictTrader';
// import { OptimusService } from '@/service/agents/Optimus';
import { AgentConfig } from '@/types/Agent';

// TODO: complete this config
// TODO: add funding requirements

export const AGENT_CONFIG: {
  [key in AgentType]: AgentConfig;
} = {
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
  // TODO: check optimus config
  // [AgentType.Optimus]: {
  //   name: 'Optimus',
  //   homeChainId: ChainId.Optimism,
  //   requiresAgentSafesOn: [ChainId.Optimism, ChainId.Ethereum, ChainId.Base],
  //   requiresMasterSafesOn: [ChainId.Optimism, ChainId.Ethereum, ChainId.Base],
  //   agentSafeFundingRequirements: {
  //     [ChainId.Optimism]: 100000000000000000,
  //     [ChainId.Ethereum]: 100000000000000000,
  //     [ChainId.Base]: 100000000000000000,
  //   },
  //   serviceApi: OptimusService,
  // },
};
