import { formatUnits } from 'ethers/lib/utils';

import { MiddlewareChain } from '@/client';
import {
  MODIUS_SERVICE_TEMPLATE,
  OPTIMUS_SERVICE_TEMPLATE,
} from '@/constants/serviceTemplates';
import { AgentType } from '@/enums/Agent';
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
  const usdcSafeRequirement =
    modiusFundRequirements?.[modiusUsdcConfig.address as Address]?.safe || 0;
  return Number(formatUnits(usdcSafeRequirement, modiusUsdcConfig.decimals));
};

const getOptimusUsdcConfig = () => {
  const optimusFundRequirements =
    OPTIMUS_SERVICE_TEMPLATE.configurations[MiddlewareChain.OPTIMISM]
      ?.fund_requirements;
  const optimusUsdcConfig = OPTIMISM_TOKEN_CONFIG[TokenSymbol.USDC];
  const usdcSafeRequirement =
    optimusFundRequirements?.[optimusUsdcConfig.address as Address]?.safe || 0;

  return Number(formatUnits(usdcSafeRequirement, optimusUsdcConfig.decimals));
};

export const AGENT_CONFIG: {
  [key in AgentType]: AgentConfig;
} = {
  [AgentType.PredictTrader]: {
    isAgentEnabled: true,
    requiresSetup: false,
    name: 'Predict Trader',
    evmHomeChainId: EvmChainId.Gnosis,
    middlewareHomeChainId: MiddlewareChain.GNOSIS,
    requiresAgentSafesOn: [EvmChainId.Gnosis],
    requiresMasterSafesOn: [EvmChainId.Gnosis],
    serviceApi: PredictTraderService,
    displayName: 'Prediction agent',
    description: 'Participates in prediction markets.',
    hasExternalFunds: false,
  },
  [AgentType.Optimus]: {
    isAgentEnabled: true,
    isComingSoon: false,
    requiresSetup: true,
    name: 'Optimus agent',
    evmHomeChainId: EvmChainId.Optimism,
    middlewareHomeChainId: MiddlewareChain.OPTIMISM,
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
  },
  [AgentType.Modius]: {
    isAgentEnabled: true,
    isUnderConstruction: true,
    isComingSoon: false,
    requiresSetup: true,
    name: 'Modius agent',
    evmHomeChainId: EvmChainId.Mode,
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
  },
  [AgentType.AgentsFun]: {
    isAgentEnabled: true,
    isUnderConstruction: true,
    isComingSoon: false,
    requiresSetup: true,
    name: 'Agents.fun agent',
    evmHomeChainId: EvmChainId.Base,
    middlewareHomeChainId: MiddlewareChain.BASE,
    requiresAgentSafesOn: [EvmChainId.Base],
    requiresMasterSafesOn: [EvmChainId.Base],
    serviceApi: AgentsFunBaseService,
    displayName: 'Agents.fun agent - Base',
    description:
      'Autonomously posts to Twitter, creates and trades memecoins, and interacts with other agents. Agent is operating on Base chain.',
    hasExternalFunds: false,
  },
};
