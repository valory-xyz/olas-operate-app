import { formatUnits } from 'ethers/lib/utils';
import { entries } from 'lodash';

import { MiddlewareChain } from '@/client';
import { AgentMap, AgentType } from '@/constants/agent';
import {
  MODIUS_SERVICE_TEMPLATE,
  OPTIMUS_SERVICE_TEMPLATE,
} from '@/constants/serviceTemplates';
import { EvmChainId } from '@/enums/Chain';
import { TokenSymbol } from '@/enums/Token';
import { AgentsFunBaseService } from '@/service/agents/AgentsFunBase';
import { ModiusService } from '@/service/agents/Modius';
import { OptimismService } from '@/service/agents/Optimism';
import { PredictTraderService } from '@/service/agents/PredictTrader';
import { Address } from '@/types/Address';
import { AgentConfig } from '@/types/Agent';

import { MODE_TOKEN_CONFIG, OPTIMISM_TOKEN_CONFIG } from './tokens';

const getModiusUsdcConfig = () => {
  const modiusFundRequirements =
    MODIUS_SERVICE_TEMPLATE.configurations[MiddlewareChain.MODE]
      ?.fund_requirements;
  const modiusUsdcConfig = MODE_TOKEN_CONFIG[TokenSymbol.USDC];

  if (!modiusUsdcConfig) {
    throw new Error('Modius USDC config not found');
  }

  const usdcSafeRequirement =
    modiusFundRequirements?.[modiusUsdcConfig.address as Address]?.safe || 0;
  return Number(formatUnits(usdcSafeRequirement, modiusUsdcConfig.decimals));
};

const getOptimusUsdcConfig = () => {
  const optimusFundRequirements =
    OPTIMUS_SERVICE_TEMPLATE.configurations[MiddlewareChain.OPTIMISM]
      ?.fund_requirements;
  const optimusUsdcConfig = OPTIMISM_TOKEN_CONFIG[TokenSymbol.USDC];

  if (!optimusUsdcConfig) {
    throw new Error('Optimus USDC config not found');
  }

  const usdcSafeRequirement =
    optimusFundRequirements?.[optimusUsdcConfig.address as Address]?.safe || 0;

  return Number(formatUnits(usdcSafeRequirement, optimusUsdcConfig.decimals));
};

export const AGENT_CONFIG: {
  [key in AgentType]: AgentConfig;
} = {
  [AgentMap.PredictTrader]: {
    isAgentEnabled: true,
    requiresSetup: true,
    name: 'Predict Trader',
    evmHomeChainId: EvmChainId.Gnosis,
    middlewareHomeChainId: MiddlewareChain.GNOSIS,
    agentIds: [14, 25],
    requiresAgentSafesOn: [EvmChainId.Gnosis],
    requiresMasterSafesOn: [EvmChainId.Gnosis],
    serviceApi: PredictTraderService,
    displayName: 'Prediction agent',
    description: 'Participates in prediction markets.',
    hasExternalFunds: false,
    hasChatUI: true,
    category: 'Prediction Markets',
    defaultBehavior:
      'Adopting a conservative strategy with small, high-confidence bets.',
  },
  [AgentMap.Optimus]: {
    isAgentEnabled: true,
    isComingSoon: false,
    requiresSetup: true,
    name: 'Optimus agent',
    evmHomeChainId: EvmChainId.Optimism,
    middlewareHomeChainId: MiddlewareChain.OPTIMISM,
    agentIds: [40],
    requiresAgentSafesOn: [EvmChainId.Optimism],
    additionalRequirements: {
      [EvmChainId.Optimism]: { [TokenSymbol.USDC]: getOptimusUsdcConfig() },
    },
    requiresMasterSafesOn: [EvmChainId.Optimism],
    serviceApi: OptimismService,
    displayName: 'Optimus agent',
    description:
      'Invests crypto assets on your behalf and grows your portfolio on Optimus network.',
    hasExternalFunds: true,
    hasChatUI: true,
    category: 'DeFi',
    defaultBehavior:
      'Conservative volatile exposure across DEXs and lending markets with advanced functionalities enabled.',
  },
  [AgentMap.AgentsFun]: {
    isAgentEnabled: true,
    isUnderConstruction: true,
    isComingSoon: false,
    requiresSetup: true,
    name: 'Agents.fun agent',
    evmHomeChainId: EvmChainId.Base,
    middlewareHomeChainId: MiddlewareChain.BASE,
    agentIds: [43],
    requiresAgentSafesOn: [EvmChainId.Base],
    requiresMasterSafesOn: [EvmChainId.Base],
    serviceApi: AgentsFunBaseService,
    displayName: 'Agents.fun agent - Base',
    description:
      'Autonomously posts to Twitter, creates and trades memecoins, and interacts with other agents. Agent is operating on Base chain.',
    hasExternalFunds: false,
    hasChatUI: false,
    defaultBehavior: '',
  },
  [AgentMap.Modius]: {
    isAgentEnabled: true,
    isUnderConstruction: true,
    isComingSoon: false,
    requiresSetup: true,
    name: 'Modius agent',
    evmHomeChainId: EvmChainId.Mode,
    agentIds: [40],
    middlewareHomeChainId: MiddlewareChain.MODE,
    requiresAgentSafesOn: [EvmChainId.Mode],
    additionalRequirements: {
      [EvmChainId.Mode]: { [TokenSymbol.USDC]: getModiusUsdcConfig() },
    },
    requiresMasterSafesOn: [EvmChainId.Mode],
    serviceApi: ModiusService,
    displayName: 'Modius agent',
    description:
      'Invests crypto assets on your behalf and grows your portfolio on Mode network.',
    hasExternalFunds: true,
    hasChatUI: true,
    category: 'DeFi',
    defaultBehavior:
      'Conservative volatile exposure across DEXs and lending markets with advanced functionalities enabled.',
  },
};

export const ACTIVE_AGENTS = entries(AGENT_CONFIG).filter(([, agentConfig]) => {
  return !!agentConfig.isAgentEnabled;
});

export const AVAILABLE_FOR_ADDING_AGENTS = ACTIVE_AGENTS.filter(
  ([, agentConfig]) => !agentConfig.isUnderConstruction,
);
