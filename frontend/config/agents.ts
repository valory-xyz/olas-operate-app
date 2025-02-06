import { formatUnits } from 'ethers/lib/utils';

import { MiddlewareChain } from '@/client';
import { MODIUS_SERVICE_TEMPLATE } from '@/constants/serviceTemplates';
import { AgentType } from '@/enums/Agent';
import { EvmChainId } from '@/enums/Chain';
import { TokenSymbol } from '@/enums/Token';
import { AgentsFunBaseService } from '@/service/agents/AgentsFunBase';
import { ModiusService } from '@/service/agents/Modius';
import { PredictTraderService } from '@/service/agents/PredictTrader';
import { LangchainService } from '@/service/agents/Langchain';
import { AgentConfig } from '@/types/Agent';

import { MODE_TOKEN_CONFIG } from './tokens';

const modiusFundRequirements =
  MODIUS_SERVICE_TEMPLATE.configurations[MiddlewareChain.MODE]
    .fund_requirements;
const modiusUsdcConfig =
  modiusFundRequirements?.[
    MODE_TOKEN_CONFIG[TokenSymbol.USDC].address as string
  ];

export const AGENT_CONFIG: {
  [key in AgentType]: AgentConfig;
} = {
  [AgentType.PredictTrader]: {
    name: 'Predict Trader',
    evmHomeChainId: EvmChainId.Gnosis,
    middlewareHomeChainId: MiddlewareChain.GNOSIS,
    requiresAgentSafesOn: [EvmChainId.Gnosis],
    requiresMasterSafesOn: [EvmChainId.Gnosis],
    serviceApi: PredictTraderService,
    displayName: 'Prediction agent',
    description: 'Participates in prediction markets.',
    isAgentEnabled: true,
  },
  [AgentType.Memeooorr]: {
    name: 'Agents.fun agent',
    evmHomeChainId: EvmChainId.Base,
    middlewareHomeChainId: MiddlewareChain.BASE,
    requiresAgentSafesOn: [EvmChainId.Base],
    requiresMasterSafesOn: [EvmChainId.Base],
    serviceApi: AgentsFunBaseService,
    displayName: 'Agents.fun agent - Base',
    description:
      'Autonomously posts to Twitter, creates and trades memecoins, and interacts with other agents. Agent is operating on Base chain.',
    isAgentEnabled: true,
  },
  [AgentType.Langchain]: {
    name: 'Basic Langchain agent',
    evmHomeChainId: EvmChainId.Gnosis,
    middlewareHomeChainId: MiddlewareChain.GNOSIS,
    requiresAgentSafesOn: [EvmChainId.Gnosis],
    requiresMasterSafesOn: [EvmChainId.Gnosis],
    serviceApi: LangchainService,
    displayName: 'Basic Langchain agent',
    description: 'Basic Langchain agent',
    isAgentEnabled: true,
  },
  [AgentType.Modius]: {
    name: 'Modius agent',
    evmHomeChainId: EvmChainId.Mode,
    middlewareHomeChainId: MiddlewareChain.MODE,
    requiresAgentSafesOn: [EvmChainId.Mode],
    additionalRequirements: {
      [EvmChainId.Mode]: {
        [TokenSymbol.USDC]: Number(
          formatUnits(
            modiusUsdcConfig?.safe || 0,
            MODE_TOKEN_CONFIG[TokenSymbol.USDC].decimals,
          ),
        ),
      },
    },
    requiresMasterSafesOn: [EvmChainId.Mode],
    serviceApi: ModiusService,
    displayName: 'Modius agent',
    description:
      'Invests crypto assets on your behalf and grows your portfolio.',
    isAgentEnabled: false,
  },
  // TODO: celo (check each key)
  [AgentType.AgentsFunCelo]: {
    name: 'Agents.fun agent (Celo)',
    evmHomeChainId: EvmChainId.Celo,
    middlewareHomeChainId: MiddlewareChain.CELO,
    requiresAgentSafesOn: [EvmChainId.Celo],
    requiresMasterSafesOn: [EvmChainId.Celo],
    serviceApi: AgentsFunBaseService,
    displayName: 'Agents.fun agent - Celo',
    description:
      'Autonomously posts to Twitter, creates and trades memecoins, and interacts with other agents. Agent is operating on Celo chain.',
    isAgentEnabled: false,
  },
};
