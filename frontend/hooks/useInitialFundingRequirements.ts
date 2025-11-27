import { constants } from 'ethers';
import { isNil } from 'lodash';
import { useMemo } from 'react';

import { AGENT_CONFIG } from '@/config/agents';
import { CHAIN_CONFIG } from '@/config/chains';
import {
  DEFAULT_STAKING_PROGRAM_IDS,
  STAKING_PROGRAMS,
} from '@/config/stakingPrograms';
import { getNativeTokenSymbol, NATIVE_TOKEN_CONFIG } from '@/config/tokens';
import { AgentType } from '@/constants/agent';
import { EvmChainId } from '@/constants/chains';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { TokenSymbolMap } from '@/constants/token';
import { ConfigurationTemplate } from '@/types';
import { Address } from '@/types/Address';
import { formatUnitsToNumber } from '@/utils';
import { asEvmChainId } from '@/utils/middlewareHelpers';

type ChainTokenSymbol = {
  [chainId in EvmChainId]: {
    [tokenSymbol: string]: number;
  };
};

/**
 * Gets the native token initial gas requirement from fund_requirements config
 */
const getNativeInitialGasRequirement = (
  config: ConfigurationTemplate,
): bigint => {
  const fundRequirements = config?.fund_requirements;

  if (!fundRequirements) {
    return 0n;
  }

  const nativeRequirements = fundRequirements[constants.AddressZero as Address];

  if (!nativeRequirements) {
    return 0n;
  }

  const combinedRequirement =
    BigInt(nativeRequirements.safe || 0) +
    BigInt(nativeRequirements.agent || 0);

  return combinedRequirement;
};

/**
 * Amount of fund needed for agent deployment. In funding_requirements
 * endpoint this value is in protocol_asset_requirements
 */
const AGENT_DEPLOYMENT_GAS_REQUIREMENT_WEI = 2;

/**
 * Hook to get the initial funding requirements for a given agent type.
 * Computes static, configuration-based funding requirements from serviceTemplate config
 *
 * @example
 * { 100 : { XDAI: 11.5, OLAS: 40 }}
 */
export const useInitialFundingRequirements = (agentType: AgentType) => {
  const serviceTemplate = SERVICE_TEMPLATES.find(
    (template) => template.agentType === agentType,
  );
  const { additionalRequirements, evmHomeChainId } = AGENT_CONFIG[agentType];
  const stakingProgramId = DEFAULT_STAKING_PROGRAM_IDS[evmHomeChainId];

  return useMemo<ChainTokenSymbol>(() => {
    if (isNil(serviceTemplate)) return {} as ChainTokenSymbol;

    const results = {} as ChainTokenSymbol;

    Object.entries(serviceTemplate.configurations).forEach(
      ([middlewareChain, config]) => {
        const evmChainId = asEvmChainId(middlewareChain);
        const { safeCreationThreshold } = CHAIN_CONFIG[evmChainId];
        if (!stakingProgramId) return;

        // Total native token requirement = initial gas estimate + safe creation threshold
        const nativeTokenSymbol = getNativeTokenSymbol(evmChainId);
        const nativeTokenConfig =
          NATIVE_TOKEN_CONFIG[evmChainId]?.[nativeTokenSymbol];
        const monthlyGasEstimate = getNativeInitialGasRequirement(config);
        const agentDeploymentGas = BigInt(AGENT_DEPLOYMENT_GAS_REQUIREMENT_WEI);
        const totalNativeAmount = formatUnitsToNumber(
          monthlyGasEstimate + safeCreationThreshold + agentDeploymentGas,
          nativeTokenConfig.decimals,
        );

        // OLAS staking requirements
        const minimumStakedAmountRequired =
          STAKING_PROGRAMS[evmChainId]?.[stakingProgramId]
            ?.stakingRequirements?.[TokenSymbolMap.OLAS] || 0;

        // Additional tokens requirements
        const additionalTokens = additionalRequirements?.[evmChainId] ?? {};

        results[evmChainId] = {
          [TokenSymbolMap.OLAS]: minimumStakedAmountRequired,
          [nativeTokenSymbol]: totalNativeAmount,
          ...additionalTokens,
        };
      },
    );

    return results;
  }, [serviceTemplate, stakingProgramId, additionalRequirements]);
};
