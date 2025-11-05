import { formatUnits } from 'ethers/lib/utils';
import { entries } from 'lodash';

import { MiddlewareChainMap } from '@/constants';
import { AgentMap, AgentType } from '@/constants/agent';
import {
  MODIUS_SERVICE_TEMPLATE,
  OPTIMUS_SERVICE_TEMPLATE,
} from '@/constants/serviceTemplates';
import { X402_ENABLED_FLAGS } from '@/constants/x402';
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
    MODIUS_SERVICE_TEMPLATE.configurations[MiddlewareChainMap.MODE]
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
    OPTIMUS_SERVICE_TEMPLATE.configurations[MiddlewareChainMap.OPTIMISM]
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
    isX402Enabled: X402_ENABLED_FLAGS[AgentMap.PredictTrader],
    name: 'Predict Trader',
    evmHomeChainId: EvmChainId.Gnosis,
    middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
    agentIds: [14, 25],
    requiresAgentSafesOn: [EvmChainId.Gnosis],
    requiresMasterSafesOn: [EvmChainId.Gnosis],
    serviceApi: PredictTraderService,
    displayName: 'Prediction Trader',
    description: 'Participates in prediction markets.',
    hasExternalFunds: false,
    hasChatUI: true,
    category: 'Prediction Markets',
    defaultBehavior:
      'Adopting a conservative strategy with small, high-confidence bets.',
    servicePublicId: 'valory/trader_pearl:0.1.0',
  },
  [AgentMap.Optimus]: {
    isAgentEnabled: true,
    isComingSoon: false,
    requiresSetup: true,
    isX402Enabled: X402_ENABLED_FLAGS[AgentMap.Optimus],
    name: 'Optimus agent',
    evmHomeChainId: EvmChainId.Optimism,
    middlewareHomeChainId: MiddlewareChainMap.OPTIMISM,
    agentIds: [40],
    requiresAgentSafesOn: [EvmChainId.Optimism],
    additionalRequirements: {
      [EvmChainId.Optimism]: { [TokenSymbol.USDC]: getOptimusUsdcConfig() },
    },
    requiresMasterSafesOn: [EvmChainId.Optimism],
    serviceApi: OptimismService,
    displayName: 'Optimus',
    description:
      'Invests crypto assets on your behalf and grows your portfolio on Optimus network.',
    hasExternalFunds: true,
    hasChatUI: true,
    category: 'DeFi',
    defaultBehavior:
      'Conservative volatile exposure across DEXs and lending markets with advanced functionalities enabled.',
    servicePublicId: 'valory/optimus:0.1.0',
  },
  [AgentMap.AgentsFun]: {
    isAgentEnabled: true,
    isUnderConstruction: true,
    isComingSoon: false,
    requiresSetup: true,
    isX402Enabled: X402_ENABLED_FLAGS[AgentMap.AgentsFun],
    name: 'Agents.fun',
    evmHomeChainId: EvmChainId.Base,
    middlewareHomeChainId: MiddlewareChainMap.BASE,
    agentIds: [43],
    requiresAgentSafesOn: [EvmChainId.Base],
    requiresMasterSafesOn: [EvmChainId.Base],
    serviceApi: AgentsFunBaseService,
    displayName: 'Agents.fun',
    description:
      'Autonomously posts to Twitter, creates and trades memecoins, and interacts with other agents. Agent is operating on Base chain.',
    hasExternalFunds: false,
    hasChatUI: false,
    defaultBehavior: '',
    servicePublicId: 'dvilela/memeooorr:0.1.0',
  },
  [AgentMap.Modius]: {
    isAgentEnabled: true,
    isUnderConstruction: true,
    isComingSoon: false,
    requiresSetup: true,
    isX402Enabled: X402_ENABLED_FLAGS[AgentMap.Modius],
    name: 'Modius agent',
    evmHomeChainId: EvmChainId.Mode,
    agentIds: [40],
    middlewareHomeChainId: MiddlewareChainMap.MODE,
    requiresAgentSafesOn: [EvmChainId.Mode],
    additionalRequirements: {
      [EvmChainId.Mode]: { [TokenSymbol.USDC]: getModiusUsdcConfig() },
    },
    requiresMasterSafesOn: [EvmChainId.Mode],
    serviceApi: ModiusService,
    displayName: 'Modius',
    description:
      'Invests crypto assets on your behalf and grows your portfolio on Mode network.',
    hasExternalFunds: true,
    hasChatUI: true,
    category: 'DeFi',
    defaultBehavior:
      'Conservative volatile exposure across DEXs and lending markets with advanced functionalities enabled.',
    servicePublicId: 'valory/optimus:0.1.0',
  },
};

export const ACTIVE_AGENTS = entries(AGENT_CONFIG).filter(([, agentConfig]) => {
  return !!agentConfig.isAgentEnabled;
});

export const AVAILABLE_FOR_ADDING_AGENTS = ACTIVE_AGENTS.filter(
  ([, agentConfig]) => !agentConfig.isUnderConstruction,
);
