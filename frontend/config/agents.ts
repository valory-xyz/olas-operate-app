import { ethers } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';

import { MiddlewareChain } from '@/client';
import {
  MEMEOOORR_BASE_TEMPLATE,
  MODIUS_SERVICE_TEMPLATE,
  PREDICT_SERVICE_TEMPLATE,
} from '@/constants/serviceTemplates';
import { AgentType } from '@/enums/Agent';
import { EvmChainId } from '@/enums/Chain';
import { TokenSymbol } from '@/enums/Token';
import { WalletOwnerType, WalletType } from '@/enums/Wallet';
import { MemeooorBaseService } from '@/service/agents/Memeooor';
import { ModiusService } from '@/service/agents/Modius';
import { PredictTraderService } from '@/service/agents/PredictTrader';
import { AgentConfig } from '@/types/Agent';
import { formatEther } from '@/utils/numberFormatters';

import { MODE_TOKEN_CONFIG } from './tokens';

const traderFundRequirements =
  PREDICT_SERVICE_TEMPLATE.configurations[MiddlewareChain.GNOSIS]
    .fund_requirements[ethers.constants.AddressZero];

const memeooorrRequirements =
  MEMEOOORR_BASE_TEMPLATE.configurations[MiddlewareChain.BASE]
    .fund_requirements[ethers.constants.AddressZero];

const modiusFundRequirements =
  MODIUS_SERVICE_TEMPLATE.configurations[MiddlewareChain.MODE]
    .fund_requirements;

export const AGENT_CONFIG: {
  [key in AgentType]: AgentConfig;
} = {
  [AgentType.PredictTrader]: {
    name: 'Predict Trader',
    evmHomeChainId: EvmChainId.Gnosis,
    middlewareHomeChainId: MiddlewareChain.GNOSIS,
    requiresAgentSafesOn: [EvmChainId.Gnosis],
    operatingThresholds: {
      [WalletOwnerType.Master]: {
        [WalletType.Safe]: {
          [TokenSymbol.XDAI]: 2,
        },
        [WalletType.EOA]: {
          [TokenSymbol.XDAI]: 0.1, // TODO: should come from the template
        },
      },
      [WalletOwnerType.Agent]: {
        [WalletType.Safe]: {
          [TokenSymbol.XDAI]: Number(
            formatEther(`${traderFundRequirements.agent}`),
          ),
        },
      },
    },
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
    operatingThresholds: {
      [WalletOwnerType.Master]: {
        [WalletType.Safe]: {
          [TokenSymbol.ETH]: Number(
            formatEther(`${memeooorrRequirements.safe}`),
          ),
        },
        [WalletType.EOA]: {
          [TokenSymbol.ETH]: 0.0025,
        },
      },
      [WalletOwnerType.Agent]: {
        [WalletType.Safe]: {
          [TokenSymbol.ETH]: Number(
            formatEther(`${memeooorrRequirements.agent}`),
          ),
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
    additionalRequirements: {
      [EvmChainId.Mode]: {
        [TokenSymbol.USDC]: Number(
          formatUnits(
            modiusFundRequirements[
              MODE_TOKEN_CONFIG[TokenSymbol.USDC].address as string
            ].safe,
            MODE_TOKEN_CONFIG[TokenSymbol.USDC].decimals,
          ),
        ),
      },
    },
    operatingThresholds: {
      [WalletOwnerType.Master]: {
        [WalletType.Safe]: {
          [TokenSymbol.ETH]: Number(
            formatEther(
              `${modiusFundRequirements[ethers.constants.AddressZero].agent}`, // TODO: should be 0.0055, temp fix to avoid low balance alerts until the refund is fixed in the middleware
            ),
          ),
        },
        [WalletType.EOA]: {
          [TokenSymbol.ETH]: 0.0002,
        },
      },
      [WalletOwnerType.Agent]: {
        [WalletType.Safe]: {
          [TokenSymbol.ETH]: Number(
            formatEther(
              `${modiusFundRequirements[ethers.constants.AddressZero].agent}`,
            ),
          ),
        },
      },
    },
    requiresMasterSafesOn: [EvmChainId.Mode],
    serviceApi: ModiusService,
    displayName: 'Modius agent',
    description:
      'Invests crypto assets on your behalf and grows your portfolio.',
    isAgentEnabled: true,
  },
};
