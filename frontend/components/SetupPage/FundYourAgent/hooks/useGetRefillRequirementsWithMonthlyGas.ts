import { isEmpty } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AddressBalanceRecord, MasterSafeBalanceRecord } from '@/client';
import { getTokenDetails } from '@/components/Bridge/utils';
import { ChainTokenConfig, TOKEN_CONFIG, TokenConfig } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { TokenSymbolConfigMap, TokenSymbolMap } from '@/constants/token';
import { useServices } from '@/hooks';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { Address } from '@/types/Address';
import { bigintMax } from '@/utils/calculations';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

import { TokenRequirement } from '../components/TokensRequirements';
import { useBeforeBridgeFunds } from './useBeforeBridgeFunds';

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
  requirementsPerToken: { [tokenAddress: Address]: bigint },
  chainConfig: ChainTokenConfig,
) => {
  const currentTokenRequirements: TokenRequirement[] = Object.entries(
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

  return currentTokenRequirements.sort((a, b) => b.amount - a.amount);
};

type UseGetRefillRequirementsWithMonthlyGasProps = {
  shouldCreateDummyService?: boolean;
};

type UseGetRefillRequirementsWithMonthlyGasReturn = {
  /**
   * Total token requirements, doesn't consider the eoa balances. This is what we show on the
   * funding cards (fund your agent screen)
   */
  totalTokenRequirements: TokenRequirement[];
  /**
   * Initial token requirements, calculated when the funds are requested for the first time,
   * considers the eoa balances. This is the actual funds that user has to send in order to meet the
   * initial funding requirements.
   */
  initialTokenRequirements: TokenRequirement[];
  isLoading: boolean;
  resetTokenRequirements: () => void;
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
 *   totalTokenRequirements: [
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
 *   initialTokenRequirements: [...],
 *   isLoading: false
 * }
 */
export const useGetRefillRequirementsWithMonthlyGas = ({
  shouldCreateDummyService = false,
}: UseGetRefillRequirementsWithMonthlyGasProps = {}): UseGetRefillRequirementsWithMonthlyGasReturn => {
  const updateBeforeBridgingFunds = useBeforeBridgeFunds();
  const {
    totalRequirements,
    refillRequirements,
    balances,
    refetch,
    resetQueryCache,
    isBalancesAndFundingRequirementsLoading,
  } = useBalanceAndRefillRequirementsContext();
  const { masterEoa, getMasterSafeOf } = useMasterWalletContext();
  const { selectedAgentConfig, selectedAgentType } = useServices();

  const [isDummyServiceCreated, setIsDummyServiceCreated] = useState(false);
  const [initialTokenRequirements, setInitialTokenRequirements] = useState<
    TokenRequirement[] | null
  >(null);
  const [totalTokenRequirements, setTotalTokenRequirements] = useState<
    TokenRequirement[] | null
  >(null);

  const masterSafe = useMemo(
    () => getMasterSafeOf?.(selectedAgentConfig.evmHomeChainId),
    [getMasterSafeOf, selectedAgentConfig.evmHomeChainId],
  );

  const getRequirementsPerToken = useCallback(
    (
      requirements: AddressBalanceRecord | MasterSafeBalanceRecord | undefined,
    ) => {
      if (!masterEoa || isBalancesAndFundingRequirementsLoading) return [];
      if (!requirements) return [];

      const masterSafeRequirements = masterSafe
        ? (requirements as AddressBalanceRecord)?.[masterSafe.address]
        : (requirements as MasterSafeBalanceRecord)?.['master_safe'];

      if (!masterSafeRequirements) return [];

      const { evmHomeChainId, middlewareHomeChainId } = selectedAgentConfig;
      const chainConfig = TOKEN_CONFIG[evmHomeChainId];

      // refill_requirements_masterEOA
      const masterEoaRequirementAmount = (requirements as AddressBalanceRecord)[
        masterEoa.address
      ]?.[AddressZero];

      // monthly_gas_estimate
      const monthlyGasEstimate = BigInt(
        SERVICE_TEMPLATES.find(
          (template) => template.agentType === selectedAgentType,
        )?.configurations[middlewareHomeChainId]?.monthly_gas_estimate ?? 0,
      );

      /**
       * If master_safe for the chainID exists, get funds from there.
       */
      const nativeTokenBalanceInMasterSafe = masterSafe
        ? BigInt(balances?.[masterSafe.address]?.[AddressZero] ?? 0n)
        : 0n;

      const requirementsPerToken: { [tokenAddress: Address]: bigint } = {};

      Object.entries(masterSafeRequirements)?.forEach(
        ([tokenAddress, amount]) => {
          if (tokenAddress === AddressZero) {
            /**
             * No funds needed for master_safe, if it already exists
             */
            const masterSafeRequirementAmount = masterSafe
              ? 0n
              : BigInt(amount);
            const gasDeficit =
              monthlyGasEstimate - nativeTokenBalanceInMasterSafe;
            const amountNeededForGas = bigintMax(0n, gasDeficit);
            /**
             * If monthly gas estimate is greater than master_safe requirements, then consider that
             * else, check the native tokens required to meet the gas requirements
             */
            const nativeTotalRequired =
              bigintMax(masterSafeRequirementAmount, amountNeededForGas) +
              BigInt(masterEoaRequirementAmount ?? 0);

            requirementsPerToken[tokenAddress as Address] = nativeTotalRequired;
          } else {
            requirementsPerToken[tokenAddress as Address] = BigInt(amount);
          }
        },
      );

      return getTokensDetailsForFunding(requirementsPerToken, chainConfig);
    },
    [
      balances,
      isBalancesAndFundingRequirementsLoading,
      masterEoa,
      masterSafe,
      selectedAgentConfig,
      selectedAgentType,
    ],
  );

  useEffect(() => {
    const createDummyService = async () => {
      await updateBeforeBridgingFunds();
      await refetch();
      setIsDummyServiceCreated(true);
    };

    if (shouldCreateDummyService && !isDummyServiceCreated) {
      createDummyService();
    }
  }, [
    updateBeforeBridgingFunds,
    refetch,
    shouldCreateDummyService,
    isDummyServiceCreated,
  ]);

  /**
   * Reset the token requirements and query cache manually so the user
   * doesn't see stale values / values from other agents.
   */
  const resetTokenRequirements = useCallback(
    (resetCache = true) => {
      setTotalTokenRequirements(null);
      setInitialTokenRequirements(null);
      if (resetCache) resetQueryCache?.();
    },
    [resetQueryCache],
  );

  /**
   * @important Reset the token requirements when the selected agent type changes.
   */
  useEffect(() => {
    resetTokenRequirements(false);
  }, [selectedAgentType, resetTokenRequirements]);

  const currentTokenRequirements = useMemo(() => {
    return getRequirementsPerToken(refillRequirements);
  }, [getRequirementsPerToken, refillRequirements]);

  // Capture the initial token requirements once, when they are first available
  useEffect(() => {
    if (!initialTokenRequirements && currentTokenRequirements.length) {
      setInitialTokenRequirements(currentTokenRequirements);
    }
  }, [currentTokenRequirements, initialTokenRequirements]);

  // Get the total token requirements
  useEffect(() => {
    if (isEmpty(totalTokenRequirements)) {
      setTotalTokenRequirements(getRequirementsPerToken(totalRequirements));
    }
  }, [totalRequirements, getRequirementsPerToken, totalTokenRequirements]);

  return {
    isLoading:
      isBalancesAndFundingRequirementsLoading || !totalTokenRequirements,
    initialTokenRequirements:
      initialTokenRequirements ?? currentTokenRequirements,
    totalTokenRequirements: totalTokenRequirements || [],
    resetTokenRequirements,
  };
};
