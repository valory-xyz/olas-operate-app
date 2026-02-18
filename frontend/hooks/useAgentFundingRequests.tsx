import { isEmpty } from 'lodash';
import { useMemo } from 'react';

import { CHAIN_CONFIG } from '@/config/chains';
import { TOKEN_CONFIG } from '@/config/tokens';
import { EvmChainId } from '@/constants';
import { Address, TokenAmounts, TokenBalanceRecord } from '@/types';
import {
  formatUnitsToNumber,
  getTokenDetails,
  tokenBalancesToSentence,
} from '@/utils';

import { useBalanceAndRefillRequirementsContext } from './useBalanceAndRefillRequirementsContext';
import { useService } from './useService';
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

      acc[tokenDetails.symbol] = {
        ...acc[tokenDetails.symbol],
        amount: formatUnitsToNumber(amount, tokenDetails.decimals),
      };

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
  const { selectedAgentConfig, selectedService } = useServices();
  const { serviceEoa } = useService(selectedService?.service_config_id);
  const { agentFundingRequests, isAgentFundingRequestsStale } =
    useBalanceAndRefillRequirementsContext();

  /**
   * Merges amounts for the same token address by summing their BigInt values.
   * @example
   * {
   *   "address1": {"token1": "1", "token2": "2"},
   *   "address2": {"token1": "3"}
   * } => {"token1": "4", "token2": "2"}
   * */
  const agentTokenRequirements = useMemo(() => {
    if (!agentFundingRequests) return null;
    if (isAgentFundingRequestsStale) return null;

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
  }, [agentFundingRequests, isAgentFundingRequestsStale]);

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

  // Split requirements for Agent EOA wallet
  const eoaTokenRequirements = useMemo(() => {
    if (!agentFundingRequests) return null;
    if (isAgentFundingRequestsStale) return null;

    const eoaAddress = serviceEoa?.address;
    if (!eoaAddress) return null;

    return agentFundingRequests[eoaAddress] || null;
  }, [agentFundingRequests, isAgentFundingRequestsStale, serviceEoa?.address]);

  return {
    /** Consolidated requirements per token address: {[tokenAddress]: totalAmount} */
    agentTokenRequirements,
    /** Requirements for service EOA address only: {[tokenAddress]: amount} */
    eoaTokenRequirements,
    /** Formatted token requirements: "10 XDAI, 15 USDC and 100 OLAS" */
    agentTokenRequirementsFormatted,
    /** True if any required token amount is above zero, indicating a funding need. */
    isAgentBalanceLow,
  };
};
