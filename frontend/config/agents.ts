import { ethers } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';

import { MiddlewareChain } from '@/client';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { AgentType } from '@/enums/Agent';
import { EvmChainId } from '@/enums/Chain';
import { TokenSymbol } from '@/enums/Token';
import { WalletOwnerType, WalletType } from '@/enums/Wallet';
import { MemeooorBaseService } from '@/service/agents/Memeooor';
import { ModiusService } from '@/service/agents/Modius';
import { PredictTraderService } from '@/service/agents/PredictTrader';
// import { OptimusService } from '@/service/agents/Optimus';
import { AgentConfig } from '@/types/Agent';
import { formatEther } from '@/utils/numberFormatters';

import { MODE_TOKEN_CONFIG } from './tokens';

// TODO: complete this config
// TODO: add funding requirements

const traderFundRequirements = SERVICE_TEMPLATES.find(
  (template) => template.agentType === AgentType.PredictTrader,
)?.configurations[MiddlewareChain.GNOSIS].fund_requirements;

const modiusFundRequirements = SERVICE_TEMPLATES.find(
  (template) => template.agentType === AgentType.Modius,
)?.configurations[MiddlewareChain.MODE].fund_requirements;

export const AGENT_CONFIG: {
  [key in AgentType]: AgentConfig;
} = {
  [AgentType.PredictTrader]: {
    name: 'Predict Trader',
    evmHomeChainId: EvmChainId.Gnosis,
    middlewareHomeChainId: MiddlewareChain.GNOSIS,
    requiresAgentSafesOn: [EvmChainId.Gnosis],
    agentSafeFundingRequirements: {
      [EvmChainId.Gnosis]: 0.1,
    },
    operatingThresholds: {
      [WalletOwnerType.Master]: {
        [WalletType.EOA]: {
          [TokenSymbol.XDAI]: 0.1,
        },
        [WalletType.Safe]: {
          [TokenSymbol.XDAI]: Number(
            formatEther(
              `${
                (traderFundRequirements?.[ethers.constants.AddressZero]
                  ?.agent ?? 0) +
                (traderFundRequirements?.[ethers.constants.AddressZero]?.safe ??
                  0)
              }`,
            ),
          ),
        },
      },
      [WalletOwnerType.Agent]: {
        [WalletType.EOA]: {
          [TokenSymbol.XDAI]: 0.1,
        },
        [WalletType.Safe]: {
          [TokenSymbol.XDAI]: 0.1,
        },
      },
    },
    requiresMasterSafesOn: [EvmChainId.Gnosis],
    serviceApi: PredictTraderService,
    displayName: 'Prediction agent',
    description: 'Participates in prediction markets.',
  },
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
    name: 'Agents.fun agent',
    evmHomeChainId: EvmChainId.Base,
    middlewareHomeChainId: MiddlewareChain.BASE,
    requiresAgentSafesOn: [EvmChainId.Base],
    agentSafeFundingRequirements: {
      [EvmChainId.Base]: 0.03,
    },
    operatingThresholds: {
      [WalletOwnerType.Master]: {
        [WalletType.EOA]: {
          [TokenSymbol.ETH]: 0.0001,
        },
        [WalletType.Safe]: {
          [TokenSymbol.ETH]: 0.0001,
        },
      },
      [WalletOwnerType.Agent]: {
        [WalletType.EOA]: {
          [TokenSymbol.ETH]: 0.0001,
        },
        [WalletType.Safe]: {
          [TokenSymbol.ETH]: 0.0001,
        },
      },
    },
    requiresMasterSafesOn: [EvmChainId.Base],
    serviceApi: MemeooorBaseService,
    displayName: 'Agents.fun agent',
    description:
      'Autonomously post to Twitter, create and trade memecoins, and interact with other agents.',
    isAgentEnabled: false,
  },
  [AgentType.Modius]: {
    name: 'Modius agent',
    evmHomeChainId: EvmChainId.Mode,
    middlewareHomeChainId: MiddlewareChain.MODE,
    requiresAgentSafesOn: [EvmChainId.Mode],
    agentSafeFundingRequirements: {
      [EvmChainId.Mode]: 0.0005,
    },
    additionalRequirements: {
      [EvmChainId.Mode]: {
        [TokenSymbol.USDC]: Number(
          formatUnits(
            modiusFundRequirements?.[
              MODE_TOKEN_CONFIG[TokenSymbol.USDC].address as string
            ]?.safe ?? 0,
            MODE_TOKEN_CONFIG[TokenSymbol.USDC].decimals,
          ),
        ),
      },
    },
    operatingThresholds: {
      [WalletOwnerType.Master]: {
        [WalletType.EOA]: {
          [TokenSymbol.ETH]: 0.0002,
        },
        [WalletType.Safe]: {
          [TokenSymbol.ETH]: 0.0055,
        },
      },
      [WalletOwnerType.Agent]: {
        [WalletType.EOA]: {
          [TokenSymbol.ETH]: 0.0005,
        },
        [WalletType.Safe]: {
          [TokenSymbol.ETH]: 0.005,
        },
      },
    },
    requiresMasterSafesOn: [EvmChainId.Mode],
    serviceApi: ModiusService,
    displayName: 'Modius agent',
    description:
      'Invests crypto assets on your behalf and grows your portfolio.',
  },
};
