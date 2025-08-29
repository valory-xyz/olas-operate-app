import { formatUnits } from 'ethers/lib/utils';
import { isNil } from 'lodash';
import { useMemo } from 'react';

import { AGENT_CONFIG } from '@/config/agents';
import { CHAIN_CONFIG } from '@/config/chains';
import {
  DEFAULT_STAKING_PROGRAM_IDS,
  STAKING_PROGRAMS,
} from '@/config/stakingPrograms';
import { getNativeTokenSymbol } from '@/config/tokens';
import { AgentType } from '@/constants/agent';
import { EvmChainId } from '@/constants/chains';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { TokenSymbolMap } from '@/constants/token';
import { asEvmChainId } from '@/utils/middlewareHelpers';

type ChainTokenSymbol = {
  [chainId in EvmChainId]: {
    [tokenSymbol: string]: number;
  };
};

/**
 * Hook to get the funding requirements for a given agent type.
 *
 * @example
 * { 100 : { XDAI: 11.5, OLAS: 40 }}
 */
export const useFundingRequirements = (agentType: AgentType) => {
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

        // Total native token requirement = monthly gas estimate + safe creation threshold
        const gasEstimate = config.monthly_gas_estimate;
        const monthlyGasEstimate = Number(formatUnits(`${gasEstimate}`, 18));
        const nativeTokenSymbol = getNativeTokenSymbol(evmChainId);
        const totalNativeAmount = monthlyGasEstimate + safeCreationThreshold;

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
