import { constants } from 'ethers';
import { isNil } from 'lodash';
import { useMemo } from 'react';

import { AGENT_CONFIG } from '@/config/agents';
import { CHAIN_CONFIG } from '@/config/chains';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import {
  getNativeTokenSymbol,
  NATIVE_TOKEN_CONFIG,
  TokenSymbolMap,
} from '@/config/tokens';
import { AgentType } from '@/constants/agent';
import { EvmChainId } from '@/constants/chains';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { ConfigurationTemplate } from '@/types';
import { Address } from '@/types/Address';
import { formatUnitsToNumber } from '@/utils';
import { asEvmChainId } from '@/utils/middlewareHelpers';

import { useMasterWalletContext } from './useWallet';

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

  if (!fundRequirements) return 0n;
  const nativeRequirements = fundRequirements[constants.AddressZero as Address];

  if (!nativeRequirements) return 0n;
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
  const agentConfig = AGENT_CONFIG[agentType];
  const serviceTemplate = SERVICE_TEMPLATES.find(
    (template) => template.agentType === agentType,
  );
  const { additionalRequirements } = AGENT_CONFIG[agentType];
  const stakingProgramId = agentConfig.defaultStakingProgramId;

  const { getMasterSafeOf, isFetched: isMasterWalletsFetched } =
    useMasterWalletContext();

  return useMemo<ChainTokenSymbol>(() => {
    const results = {} as ChainTokenSymbol;

    if (isNil(serviceTemplate) || isNil(getMasterSafeOf)) return results;
    if (!isMasterWalletsFetched) return results;

    Object.entries(serviceTemplate.configurations).forEach(
      ([middlewareChain, config]) => {
        const evmChainId = asEvmChainId(middlewareChain);
        const masterSafe = getMasterSafeOf(evmChainId);
        const { safeCreationThreshold: defaultSafeCreationThreshold } =
          CHAIN_CONFIG[evmChainId];
        // If Master safe exists, no need to count it in total requirements
        const safeCreationThreshold = isNil(masterSafe)
          ? defaultSafeCreationThreshold
          : 0n;

        if (!stakingProgramId) return;

        // Total native token requirement =
        // initial gas estimate +
        // safe creation threshold +
        // agent deployment gas requirement
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
  }, [
    serviceTemplate,
    getMasterSafeOf,
    isMasterWalletsFetched,
    stakingProgramId,
    additionalRequirements,
  ]);
};
