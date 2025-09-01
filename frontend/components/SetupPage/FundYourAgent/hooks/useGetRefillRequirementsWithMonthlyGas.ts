import { useEffect, useMemo, useRef } from 'react';

import { AddressBalanceRecord, MasterSafeBalanceRecord } from '@/client';
import { getTokenDetails } from '@/components/Bridge/utils';
import { ChainTokenConfig, TOKEN_CONFIG, TokenConfig } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { EvmChainId } from '@/constants/chains';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { TokenSymbolConfigMap, TokenSymbolMap } from '@/constants/token';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { Address } from '@/types/Address';
import { AgentConfig } from '@/types/Agent';
import { bigintMax } from '@/utils/calculations';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

import { useBeforeBridgeFunds } from '../../Create/SetupEoaFunding/useBeforeBridgeFunds';
import { TokenRequirement } from '../components/TokensRequirements';

const ICON_OVERRIDES: Record<string, string> = {
  [TokenSymbolMap['XDAI']]: '/tokens/wxdai-icon.png',
};

const getTokenMeta = (tokenAddress: Address, chainConfig: ChainTokenConfig) => {
  const tokenDetails = getTokenDetails(
    tokenAddress,
    chainConfig,
  ) as TokenConfig;

  return {
    symbol: tokenDetails.symbol,
    decimals: tokenDetails.decimals,
    iconSrc: TokenSymbolConfigMap[tokenDetails.symbol].image || '',
  };
};

const getTokensDetailsForFunding = (
  requirementsPerToken: { [tokenAddress: Address]: string },
  evmHomeChainId: EvmChainId,
  chainConfig: ChainTokenConfig,
) => {
  const tokenRequirements: TokenRequirement[] = Object.entries(
    requirementsPerToken,
  )
    .map(([tokenAddress, amount]) => {
      const { symbol, decimals, iconSrc } = getTokenMeta(
        tokenAddress as Address,
        chainConfig,
      );
      const parsedAmount = formatUnitsToNumber(amount, decimals);

      if (parsedAmount > 0) {
        return {
          amount: parsedAmount,
          symbol,
          iconSrc: ICON_OVERRIDES[symbol] || iconSrc,
        };
      }
    })
    .filter(Boolean) as TokenRequirement[];

  return tokenRequirements.sort((a, b) => b.amount - a.amount);
};

/**
 *
 * @warning A HOOK THAT SHOULD NEVER EXIST.
 * TODO: This hook is used because BE doesn't support monthly_gas_estimate in the refill requirements yet.
 * Remove the hook once it's supported.
 *
 * Hook to get the refill requirements for the selectedAgent — considers the monthly_gas_estimate
 * in order to evaluate the requirements.
 * @example
 * {
 *   tokenRequirements: [
 *     {
 *       amount: 0.5,
 *       symbol: "XDAI",
 *       iconSrc: "/tokens/wxdai-icon.png"
 *     },
 *     {
 *       amount: 100,
 *       symbol: "USDC",
 *       iconSrc: "/tokens/usdc-icon.png"
 *     }
 *   ],
 *   isLoading: false
 * }
 */
export const useGetRefillRequimentsWithMonthlyGas = ({
  selectedAgentConfig,
  shouldCreateDummyService = false,
}: {
  selectedAgentConfig: AgentConfig;
  shouldCreateDummyService?: boolean;
}): {
  tokenRequirements: TokenRequirement[];
  initialTokenRequirements: TokenRequirement[];
  isLoading: boolean;
} => {
  const updateBeforeBridgingFunds = useBeforeBridgeFunds();
  const {
    refillRequirements,
    balances,
    refetch,
    isBalancesAndFundingRequirementsLoading,
  } = useBalanceAndRefillRequirementsContext();
  const { masterEoa } = useMasterWalletContext();
  const initialTokenRequirementsRef = useRef<TokenRequirement[] | null>(null);

  useEffect(() => {
    const createDummyService = async () => {
      await updateBeforeBridgingFunds();
      await refetch?.();
    };
    if (shouldCreateDummyService) {
      createDummyService();
    }
  }, [updateBeforeBridgingFunds, refetch, shouldCreateDummyService]);

  const tokenRequirements = useMemo(() => {
    if (!masterEoa || isBalancesAndFundingRequirementsLoading) return [];

    const { evmHomeChainId, middlewareHomeChainId } = selectedAgentConfig;
    const chainConfig = TOKEN_CONFIG[evmHomeChainId];

    // refill_requirements_masterEOA
    const masterEoaRequirementAmount = (
      refillRequirements as AddressBalanceRecord
    )[masterEoa.address]?.[AddressZero];

    // monthly_gas_estimate
    const monthlyGasEstimate = BigInt(
      SERVICE_TEMPLATES.find(
        (template) => template.home_chain === middlewareHomeChainId,
      )?.configurations[middlewareHomeChainId]?.monthly_gas_estimate ?? 0,
    );

    // native_token_amount in master_safe
    const nativeTokenBalanceInMasterSafe = BigInt(
      (balances as MasterSafeBalanceRecord)?.['master_safe']?.[AddressZero],
    );

    const requirementsPerToken = {} as { [tokenAddress: Address]: string };

    Object.entries(
      (refillRequirements as MasterSafeBalanceRecord)['master_safe'],
    )?.forEach(([tokenAddress, amount]) => {
      if (tokenAddress === AddressZero) {
        /**
         * If monthly gas estimate is greater than master_safe requirements, then consider that
         * else, check the native tokens required to meet the gas requirements
         */
        const masterSafeRequirementAmount = BigInt(amount);
        const gasDeficit = monthlyGasEstimate - nativeTokenBalanceInMasterSafe;
        const amountNeededForGas = bigintMax(0n, gasDeficit);
        const nativeTotalRequired =
          bigintMax(masterSafeRequirementAmount, amountNeededForGas) +
          BigInt(masterEoaRequirementAmount ?? 0);

        requirementsPerToken[tokenAddress as Address] =
          nativeTotalRequired.toString();
      } else {
        requirementsPerToken[tokenAddress as Address] = amount.toString();
      }
    });

    return getTokensDetailsForFunding(
      requirementsPerToken,
      evmHomeChainId,
      chainConfig,
    );
  }, [
    refillRequirements,
    masterEoa,
    selectedAgentConfig,
    isBalancesAndFundingRequirementsLoading,
    balances,
  ]);

  // Capture the initial token requirements once, when they are first available
  useEffect(() => {
    if (!initialTokenRequirementsRef.current && tokenRequirements.length) {
      initialTokenRequirementsRef.current = tokenRequirements;
    }
  }, [tokenRequirements]);

  return {
    tokenRequirements,
    initialTokenRequirements:
      initialTokenRequirementsRef.current ?? tokenRequirements,
    isLoading: isBalancesAndFundingRequirementsLoading,
  };
};
