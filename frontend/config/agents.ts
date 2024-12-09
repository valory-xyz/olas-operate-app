import { MiddlewareChain } from '@/client';
import { AgentType } from '@/enums/Agent';
import { EvmChainId } from '@/enums/Chain';
import { MemeooorBaseService } from '@/service/agents/Memeooor';
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
    evmHomeChainId: EvmChainId.Gnosis,
    middlewareHomeChainId: MiddlewareChain.GNOSIS,
    requiresAgentSafesOn: [EvmChainId.Gnosis],
    agentSafeFundingRequirements: {
      [EvmChainId.Gnosis]: 100000000000000000,
    },
    requiresMasterSafesOn: [EvmChainId.Gnosis],
    serviceApi: PredictTraderService,
    displayName: 'Prediction agent',
    description: 'Participates in prediction markets.',
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
  [AgentType.Memeooorr]: {
    name: 'Memeooorr agent',
    evmHomeChainId: EvmChainId.Base,
    middlewareHomeChainId: MiddlewareChain.BASE,
    requiresAgentSafesOn: [EvmChainId.Base],
    agentSafeFundingRequirements: {
      [EvmChainId.Base]: 1000000000000000, // 0.001 eth
    },
    requiresMasterSafesOn: [EvmChainId.Base],
    serviceApi: MemeooorBaseService,
    displayName: 'Memeooorr agent',
    description:
      'Autonomously post to Twitter, create and trade memecoins, and interact with other agents.',
  },
};
