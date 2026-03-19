import { compact } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ChainTokenConfig,
  TOKEN_CONFIG,
  TokenConfig,
  TokenSymbolConfigMap,
  TokenSymbolMap,
} from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { MASTER_SAFE_REFILL_PLACEHOLDER } from '@/constants/defaults';
import { useServices } from '@/hooks';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useMasterWalletContext } from '@/hooks/useWallet';
import {
  AddressBalanceRecord,
  MasterSafeBalanceRecord,
  TokenRequirement,
} from '@/types';
import { Address } from '@/types/Address';
import { getTokenDetails } from '@/utils';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

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
  const currentTokenRequirements: TokenRequirement[] = compact(
    Object.entries(requirementsPerToken).map(([tokenAddress, amount]) => {
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
    }),
  ) satisfies TokenRequirement[];

  return currentTokenRequirements.sort((a, b) => b.amount - a.amount);
};

type UseGetRefillRequirementsReturn = {
  /**
   * Total token requirements — the full amount needed regardless of current balances.
   */
  totalTokenRequirements: TokenRequirement[];
  /**
   * Refill token requirements — the actual shortfall (total minus current balances).
   * This is what should be shown on the funding cards.
   */
  refillTokenRequirements: TokenRequirement[];
  isLoading: boolean;
  resetTokenRequirements: () => void;
};

/**
 *
 * Hook to get the refill requirements for the selectedAgent.
 *
 * Computes actual refill/funding amounts based on refill/total
 * requirements from BE taking into account current balances on agent's chain
 *
 * Creates dummy service if needed
 *
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
export const useGetRefillRequirements = (): UseGetRefillRequirementsReturn => {
  const {
    totalRequirements,
    refillRequirements,
    resetQueryCache,
    isBalancesAndFundingRequirementsLoading,
  } = useBalanceAndRefillRequirementsContext();
  const {
    masterEoa,
    getMasterSafeOf,
    isFetched: isMasterWalletsFetched,
  } = useMasterWalletContext();
  const { selectedAgentConfig, selectedServiceConfigId } = useServices();

  const [totalTokenRequirements, setTotalTokenRequirements] = useState<
    TokenRequirement[] | null
  >(null);
  const [refillTokenRequirements, setRefillTokenRequirements] = useState<
    TokenRequirement[] | null
  >(null);

  const masterSafe = useMemo(
    () => getMasterSafeOf?.(selectedAgentConfig.evmHomeChainId),
    [getMasterSafeOf, selectedAgentConfig.evmHomeChainId],
  );

  const getRequirementsPerToken = useCallback(
    (requirements?: AddressBalanceRecord | MasterSafeBalanceRecord) => {
      if (
        isBalancesAndFundingRequirementsLoading ||
        !requirements ||
        !masterEoa ||
        !isMasterWalletsFetched
      ) {
        return null;
      }

      const chainConfig = TOKEN_CONFIG[selectedAgentConfig.evmHomeChainId];

      // master safe requirements
      const masterSafePlaceholder = (requirements as MasterSafeBalanceRecord)?.[
        MASTER_SAFE_REFILL_PLACEHOLDER
      ];
      const masterSafeRequirements = masterSafe
        ? (requirements as AddressBalanceRecord)?.[masterSafe.address]
        : masterSafePlaceholder;
      if (!masterSafeRequirements) return [];

      // Refill requirements for masterEOA
      const masterEoaRequirementAmount = (requirements as AddressBalanceRecord)[
        masterEoa.address
      ]?.[AddressZero];

      const requirementsPerToken: { [tokenAddress: Address]: bigint } = {};

      Object.entries(masterSafeRequirements)?.forEach(
        ([tokenAddress, amount]) => {
          if (tokenAddress === AddressZero) {
            // Refill requirements for masterSafe
            const masterSafeRequirementAmount = BigInt(amount);
            // Calculate the total native token requirement for gas (master safe + master EOA)
            const nativeTotalRequired =
              masterSafeRequirementAmount +
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
      isBalancesAndFundingRequirementsLoading,
      isMasterWalletsFetched,
      masterEoa,
      masterSafe,
      selectedAgentConfig,
    ],
  );

  /**
   * Reset the token requirements and query cache manually so the user
   * doesn't see stale values / values from other agents.
   */
  const resetTokenRequirements = useCallback(
    (resetCache = true) => {
      setTotalTokenRequirements(null);
      setRefillTokenRequirements(null);
      if (resetCache) resetQueryCache?.();
    },
    [resetQueryCache],
  );

  /**
   * @important Reset the token requirements when the selected service changes.
   */
  useEffect(() => {
    resetTokenRequirements(false);
  }, [selectedServiceConfigId, resetTokenRequirements]);

  // Get the total token requirements
  useEffect(() => {
    if (totalTokenRequirements === null) {
      setTotalTokenRequirements(getRequirementsPerToken(totalRequirements));
    }
  }, [totalRequirements, getRequirementsPerToken, totalTokenRequirements]);

  // Get the refill token requirements
  useEffect(() => {
    if (refillTokenRequirements === null) {
      setRefillTokenRequirements(getRequirementsPerToken(refillRequirements));
    }
  }, [refillRequirements, getRequirementsPerToken, refillTokenRequirements]);

  return {
    isLoading:
      isBalancesAndFundingRequirementsLoading || !totalTokenRequirements,
    totalTokenRequirements: totalTokenRequirements || [],
    refillTokenRequirements: refillTokenRequirements || [],
    resetTokenRequirements,
  };
};
