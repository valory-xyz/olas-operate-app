import { TokenBalanceRecord } from '@/client';
import { getTokenDetails } from '@/components/Bridge/utils';
import { CHAIN_CONFIG } from '@/config/chains';
import { TOKEN_CONFIG } from '@/config/tokens';
import { EvmChainId } from '@/constants';
import { Address } from '@/types/Address';
import { formatUnitsToNumber } from '@/utils';

import { useBalanceAndRefillRequirementsContext } from './useBalanceAndRefillRequirementsContext';
import { useServices } from './useServices';

/**
 * Formats a record of required tokens into a human-readable string.
 *
 * @param tokenRequirements
 * @param evmHomeChainId
 * @returns A formatted string (e.g., "10 XDAI, 15 USDC and 100 OLAS on Gnosis chain") or null.
 */
const getFormattedTokensList = (
  tokenRequirements: TokenBalanceRecord,
  evmHomeChainId: EvmChainId,
): string | null => {
  const chainConfig = TOKEN_CONFIG[evmHomeChainId];

  const tokens = Object.entries(tokenRequirements)
    .map(([tokenAddress, amount]) => {
      const address = tokenAddress as Address;
      const tokenDetails = getTokenDetails(address, chainConfig);

      if (!tokenDetails) return null;
      const parsedAmount = formatUnitsToNumber(amount, tokenDetails.decimals);
      return `${parsedAmount} ${tokenDetails.symbol}`;
    })
    .filter((token) => token !== null); // Ensure the array is only strings

  if (tokens.length === 0) return null;

  const chainName = CHAIN_CONFIG[evmHomeChainId].name;
  // Formats the list as a sentence: "A, B, and C on ChainName chain"
  const tokenList =
    tokens.length === 1
      ? tokens[0]
      : `${tokens.slice(0, -1).join(', ')} and ${tokens.at(-1)}`;

  return `${tokenList} on ${chainName} chain`;
};

/**
 * Custom hook to consolidate and format the token funding requirements for all agent wallets.
 * It combines requirements across all individual agent wallets into a single list per token.
 *
 * @returns An object containing the loading state, raw/merged requirements, and a formatted string.
 */
export const useAgentFundingRequests = () => {
  const { selectedAgentConfig } = useServices();
  const { agentFundingRequests, isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();

  // Merges amounts for the same token address by summing their BigInt values.
  const agentTokenRequirements = agentFundingRequests
    ? Object.values(agentFundingRequests).reduce(
        (allBalanceRecords, balanceRecord) => {
          Object.entries(balanceRecord).forEach(([tokenAddress, amount]) => {
            const address = tokenAddress as Address;
            const currentAmount = allBalanceRecords[address] || '0';
            allBalanceRecords[address] = (
              BigInt(currentAmount) + BigInt(amount)
            ).toString();
          });
          return allBalanceRecords;
        },
        {} as TokenBalanceRecord,
      )
    : null;

  // Formatted string of the merged token requirements.
  const agentTokenRequirementsFormatted = agentTokenRequirements
    ? getFormattedTokensList(
        agentTokenRequirements,
        selectedAgentConfig.evmHomeChainId,
      )
    : null;

  // Check if any consolidated token requirement is greater than zero.
  const isAgentBalanceLow = agentTokenRequirements
    ? Object.values(agentTokenRequirements).some(
        (requirement) => BigInt(requirement) > BigInt(0),
      )
    : false;

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
