import { formatUnits } from 'ethers/lib/utils';
import { entries } from 'lodash';

import {
  EvmChainIdMap,
  MiddlewareChainMap,
  STAKING_PROGRAM_IDS,
} from '@/constants';
import { AgentMap, AgentType } from '@/constants/agent';
import {
  MODIUS_SERVICE_TEMPLATE,
  OPTIMUS_SERVICE_TEMPLATE,
} from '@/constants/serviceTemplates';
import { X402_ENABLED_FLAGS } from '@/constants/x402';
import { AgentsFunBaseService } from '@/service/agents/AgentsFunBase';
import { ModiusService } from '@/service/agents/Modius';
import { OptimismService } from '@/service/agents/Optimism';
import { PettAiService } from '@/service/agents/PettAi';
import { PredictTraderService } from '@/service/agents/PredictTrader';
import { Address } from '@/types/Address';
import { AgentConfig } from '@/types/Agent';

import {
  MODE_TOKEN_CONFIG,
  OPTIMISM_TOKEN_CONFIG,
  TokenSymbolMap,
} from './tokens';

const getModiusUsdcConfig = () => {
  const modiusFundRequirements =
    MODIUS_SERVICE_TEMPLATE.configurations[MiddlewareChainMap.MODE]
      ?.fund_requirements;
  const modiusUsdcConfig = MODE_TOKEN_CONFIG[TokenSymbolMap.USDC];

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
  const optimusUsdcConfig = OPTIMISM_TOKEN_CONFIG[TokenSymbolMap.USDC];

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
    evmHomeChainId: EvmChainIdMap.Gnosis,
    middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
    agentIds: [14, 25],
    defaultStakingProgramId: STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3,
    serviceApi: PredictTraderService,
    displayName: 'Omenstrat',
    description: 'Participates in prediction markets.',
    hasExternalFunds: false,
    doesChatUiRequireApiKey: true,
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
    evmHomeChainId: EvmChainIdMap.Optimism,
    middlewareHomeChainId: MiddlewareChainMap.OPTIMISM,
    agentIds: [40],
    additionalRequirements: {
      [EvmChainIdMap.Optimism]: {
        [TokenSymbolMap.USDC]: getOptimusUsdcConfig(),
      },
    },
    defaultStakingProgramId: STAKING_PROGRAM_IDS.OptimusAlpha2,
    serviceApi: OptimismService,
    displayName: 'Optimus',
    description:
      'Invests crypto assets on your behalf and grows your portfolio on Optimus network.',
    hasExternalFunds: true,
    doesChatUiRequireApiKey: true,
    category: 'DeFi',
    defaultBehavior:
      'Conservative volatile exposure across DEXs and lending markets with advanced functionalities enabled.',
    servicePublicId: 'valory/optimus:0.1.0',
  },
  [AgentMap.AgentsFun]: {
    isAgentEnabled: true,
    isUnderConstruction: false,
    isComingSoon: false,
    requiresSetup: true,
    isX402Enabled: X402_ENABLED_FLAGS[AgentMap.AgentsFun],
    name: 'Agents.fun',
    evmHomeChainId: EvmChainIdMap.Base,
    middlewareHomeChainId: MiddlewareChainMap.BASE,
    agentIds: [43],
    defaultStakingProgramId: STAKING_PROGRAM_IDS.AgentsFun1,
    serviceApi: AgentsFunBaseService,
    displayName: 'Agents.fun',
    description:
      'Autonomously posts to Twitter, creates and trades memecoins, and interacts with other agents. Agent is operating on Base chain.',
    hasExternalFunds: false,
    doesChatUiRequireApiKey: false,
    defaultBehavior: 'Autonomously posts to X based on the provided persona.',
    servicePublicId: 'dvilela/memeooorr:0.1.0',
  },
  [AgentMap.Modius]: {
    isAgentEnabled: true,
    isUnderConstruction: true,
    isComingSoon: false,
    requiresSetup: true,
    isX402Enabled: X402_ENABLED_FLAGS[AgentMap.Modius],
    name: 'Modius agent',
    evmHomeChainId: EvmChainIdMap.Mode,
    agentIds: [40],
    middlewareHomeChainId: MiddlewareChainMap.MODE,
    defaultStakingProgramId: STAKING_PROGRAM_IDS.ModiusAlpha,
    additionalRequirements: {
      [EvmChainIdMap.Mode]: { [TokenSymbolMap.USDC]: getModiusUsdcConfig() },
    },
    serviceApi: ModiusService,
    displayName: 'Modius',
    description:
      'Invests crypto assets on your behalf and grows your portfolio on Mode network.',
    hasExternalFunds: true,
    doesChatUiRequireApiKey: true,
    category: 'DeFi',
    defaultBehavior:
      'Conservative volatile exposure across DEXs and lending markets with advanced functionalities enabled.',
    servicePublicId: 'valory/optimus:0.1.0',
  },
  [AgentMap.PettAi]: {
    isAgentEnabled: true,
    isUnderConstruction: false,
    isComingSoon: false,
    requiresSetup: false,
    isX402Enabled: X402_ENABLED_FLAGS[AgentMap.PettAi],
    name: 'Pett.ai',
    evmHomeChainId: EvmChainIdMap.Base,
    agentIds: [80],
    middlewareHomeChainId: MiddlewareChainMap.BASE,
    defaultStakingProgramId: STAKING_PROGRAM_IDS.PettAiAgent3,
    serviceApi: PettAiService,
    displayName: 'PettBro by Pett.ai',
    description: 'Pett.ai autonomous agent service for virtual pet management.',
    hasExternalFunds: false,
    doesChatUiRequireApiKey: false,
    defaultBehavior:
      'Your agent nurtures your pet! Make sure you’re logged in to keep your pet safe.',
    servicePublicId: 'pettaidev/pett_agent:0.1.0',
    needsOpenProfileEachAgentRun: true,
    needsOpenProfileEachAgentRunAlert: {
      title: 'Log in to get your agent operating',
      message:
        'To operate, the agent must be linked to a pet. Link one in the Profile tab or press Connect below.',
    },
  },
};

export const ACTIVE_AGENTS = entries(AGENT_CONFIG).filter(([, agentConfig]) => {
  return !!agentConfig.isAgentEnabled;
});

export const AVAILABLE_FOR_ADDING_AGENTS = ACTIVE_AGENTS.filter(
  ([, agentConfig]) => !agentConfig.isUnderConstruction,
);
