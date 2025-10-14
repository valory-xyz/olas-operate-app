import { isEmpty } from 'lodash';
import { useMemo } from 'react';

import { TokenBalanceRecord } from '@/client';
import { getTokenDetails } from '@/components/Bridge/utils';
import { CHAIN_CONFIG } from '@/config/chains';
import { TOKEN_CONFIG } from '@/config/tokens';
import { EvmChainId } from '@/constants';
import { TokenAmounts } from '@/types';
import { Address } from '@/types/Address';
import { formatUnitsToNumber, tokenBalancesToSentence } from '@/utils';

import { useBalanceAndRefillRequirementsContext } from './useBalanceAndRefillRequirementsContext';
import { useServices } from './useServices';

/**
 * Formats a record of required tokens into a human-readable string.
 *
 * @returns A formatted string (e.g., "10 XDAI, 15 USDC and 100 OLAS on Gnosis chain") or null.
 */
const getFormattedTokensList = (
  tokenRequirements: TokenBalanceRecord,
  evmHomeChainId: EvmChainId,
): string | null => {
  const chainConfig = TOKEN_CONFIG[evmHomeChainId];
  const chainName = CHAIN_CONFIG[evmHomeChainId].name;

  const tokens = Object.entries(tokenRequirements).reduce(
    (acc, [untypedTokenAddress, amount]) => {
      const tokenAddress = untypedTokenAddress as Address;
      const tokenDetails = getTokenDetails(tokenAddress, chainConfig);

      if (!tokenDetails) return acc;

      acc[tokenDetails.symbol] = formatUnitsToNumber(
        amount,
        tokenDetails.decimals,
      );

      return acc;
    },
    {} as TokenAmounts,
  );

  if (isEmpty(tokens)) return null;
  return `${tokenBalancesToSentence(tokens)} on ${chainName} chain`;
};

/**
 * To consolidate and format the token funding requirements for all agent wallets.
 * It combines requirements across all individual agent wallets into a single list per token.
 *
 * @returns An object containing the loading state, raw/merged requirements, and a formatted string.
 */
export const useAgentFundingRequests = () => {
  const { selectedAgentConfig } = useServices();
  const {
    agentFundingRequests,
    isBalancesAndFundingRequirementsLoading,
    isAgentFundingRequestsUnreliable,
  } = useBalanceAndRefillRequirementsContext();

  /**
   * Merges amounts for the same token address by summing their BigInt values.
   * @example {"address1": {"token1": "1", "token2": "2"}, "address2": {"token1": "3"}} -> {"token1": "4", "token2": "2"}
   * */
  const agentTokenRequirements = useMemo(() => {
    if (!agentFundingRequests) return null;
    if (isAgentFundingRequestsUnreliable) return null;
    return Object.values(agentFundingRequests).reduce(
      (allBalanceRecords, balanceRecord) => {
        Object.entries(balanceRecord).forEach(
          ([untypedTokenAddress, amount]) => {
            const tokenAddress = untypedTokenAddress as Address;
            const currentAmount = allBalanceRecords[tokenAddress] || '0';
            allBalanceRecords[tokenAddress] = (
              BigInt(currentAmount) + BigInt(amount)
            ).toString();
          },
        );
        return allBalanceRecords;
      },
      {} as TokenBalanceRecord,
    );
  }, [agentFundingRequests, isAgentFundingRequestsUnreliable]);

  // Formatted string of the merged token requirements.
  const agentTokenRequirementsFormatted = useMemo(() => {
    if (!agentTokenRequirements) return null;
    return getFormattedTokensList(
      agentTokenRequirements,
      selectedAgentConfig.evmHomeChainId,
    );
  }, [agentTokenRequirements, selectedAgentConfig.evmHomeChainId]);

  // Check if any consolidated token requirement is greater than zero.
  const isAgentBalanceLow = useMemo(() => {
    if (!agentTokenRequirements) return null;
    return Object.values(agentTokenRequirements).some(
      (requirement) => BigInt(requirement) > BigInt(0),
    );
  }, [agentTokenRequirements]);

  return {
    isLoading: isBalancesAndFundingRequirementsLoading,
    /** All requirements, organized by wallet then by token address: {[walletAddress]: {[tokenAddress]: amount}} */
    agentFundingRequests,
    /** Consolidated requirements per token address: {[tokenAddress]: totalAmount} */
    agentTokenRequirements,
    /** Formatted token requirements: "10 XDAI, 15 USDC and 100 OLAS" */
    agentTokenRequirementsFormatted,
    /** True if any required token amount is above zero, indicating a funding need. */
    isAgentBalanceLow,
  };
};
