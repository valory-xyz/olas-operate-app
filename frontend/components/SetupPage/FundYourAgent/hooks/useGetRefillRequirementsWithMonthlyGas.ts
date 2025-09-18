import { useCallback, useEffect, useMemo, useRef } from 'react';

import { AddressBalanceRecord, MasterSafeBalanceRecord } from '@/client';
import { getTokenDetails } from '@/components/Bridge/utils';
import { ChainTokenConfig, TOKEN_CONFIG, TokenConfig } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
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
  selectedAgentConfig: AgentConfig;
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
  /**
   * Current token requirements, used to get the token requirements at any moment
   * @warning Shouldn't be used ideally, as it can be unreliable in the case of
   * native tokens as monthly_gas is not accounted in the BE.
   */
  currentTokenRequirements: TokenRequirement[];
  isLoading: boolean;
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
 *   currentTokenRequirements: [...],
 *   isLoading: false
 * }
 */
export const useGetRefillRequirementsWithMonthlyGas = ({
  selectedAgentConfig,
  shouldCreateDummyService = false,
}: UseGetRefillRequirementsWithMonthlyGasProps): UseGetRefillRequirementsWithMonthlyGasReturn => {
  const updateBeforeBridgingFunds = useBeforeBridgeFunds();
  const {
    totalRequirements,
    refillRequirements,
    balances,
    refetch,
    isBalancesAndFundingRequirementsLoading,
  } = useBalanceAndRefillRequirementsContext();
  const { masterEoa, masterSafes } = useMasterWalletContext();

  const totalTokenRequirementsRef = useRef<TokenRequirement[] | null>(null);
  const initialTokenRequirementsRef = useRef<TokenRequirement[] | null>(null);

  const masterSafe = useMemo(() => {
    return (masterSafes || []).find(
      ({ evmChainId }) => evmChainId === selectedAgentConfig.evmHomeChainId,
    );
  }, [masterSafes, selectedAgentConfig.evmHomeChainId]);

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
          (template) => template.home_chain === middlewareHomeChainId,
        )?.configurations[middlewareHomeChainId]?.monthly_gas_estimate ?? 0,
      );

      /**
       * If master_safe for the chainID exists, get funds from there.
       */
      const nativeTokenBalanceInMasterSafe = masterSafe
        ? BigInt(balances?.[masterSafe.address]?.[AddressZero] ?? 0n)
        : 0n;

      const requirementsPerToken = {} as { [tokenAddress: Address]: string };

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

            requirementsPerToken[tokenAddress as Address] =
              nativeTotalRequired.toString();
          } else {
            requirementsPerToken[tokenAddress as Address] = amount.toString();
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
    ],
  );

  useEffect(() => {
    const createDummyService = async () => {
      await updateBeforeBridgingFunds();
      await refetch?.();
    };
    if (shouldCreateDummyService) {
      createDummyService();
    }
  }, [updateBeforeBridgingFunds, refetch, shouldCreateDummyService]);

  // Reset cached requirements when the selected agent changes
  useEffect(() => {
    totalTokenRequirementsRef.current = null;
    initialTokenRequirementsRef.current = null;
    refetch?.();
  }, [selectedAgentConfig, refetch]);

  const currentTokenRequirements = useMemo(() => {
    return getRequirementsPerToken(refillRequirements);
  }, [getRequirementsPerToken, refillRequirements]);

  // Capture the initial token requirements once, when they are first available
  useEffect(() => {
    if (
      !initialTokenRequirementsRef.current &&
      currentTokenRequirements.length
    ) {
      initialTokenRequirementsRef.current = currentTokenRequirements;
    }
  }, [currentTokenRequirements]);

  // Get the total token requirements, using "totalRequirements" from BE, instead of "refillRequirements"
  useEffect(() => {
    if (!totalTokenRequirementsRef.current && totalRequirements) {
      totalTokenRequirementsRef.current =
        getRequirementsPerToken(totalRequirements);
    }
  }, [totalRequirements, getRequirementsPerToken]);

  return {
    totalTokenRequirements: totalTokenRequirementsRef.current ?? [],
    currentTokenRequirements,
    initialTokenRequirements:
      initialTokenRequirementsRef.current ?? currentTokenRequirements,
    isLoading:
      isBalancesAndFundingRequirementsLoading ||
      !totalTokenRequirementsRef.current,
  };
};
