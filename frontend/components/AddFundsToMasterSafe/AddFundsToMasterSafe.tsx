import { uniq } from 'lodash';

import { AddressBalanceRecord } from '@/client';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useServices } from '@/hooks/useServices';
import { Address } from '@/types/Address';
import { getTokenDetailsFromAddress } from '@/utils/middlewareHelpers';

/**
 *
 * Generate inputs to add funds for bridging.
 *
 * Example: If the chain is Gnosis, user can add OLAS and XDAI.
 * This function will return an array of objects with tokenAddress, symbol, and amount set to 0.
 */
export const useGenerateInputsToAddFundsToMasterSafe = () => {
  const { selectedAgentConfig } = useServices();
  const toMiddlewareChain = selectedAgentConfig.middlewareHomeChainId;
  const { totalRequirements: untypedTotalRequirements } =
    useBalanceAndRefillRequirementsContext();
  const totalRequirements = untypedTotalRequirements as AddressBalanceRecord;

  if (!totalRequirements) return [];

  // master_safe and master_eoa addresses in general.
  const allAddresses = Object.keys(totalRequirements) as Address[];

  const duplicateTokenAddresses = allAddresses.map((address: Address) => {
    if (!(address in totalRequirements)) return null;

    return Object.keys(totalRequirements[address]) as Address[];
  });

  const tokenAddresses = uniq(
    duplicateTokenAddresses.flat().filter(Boolean),
  ) as Address[];

  return tokenAddresses.map((tokenAddress: Address) => {
    const symbol = getTokenDetailsFromAddress(
      toMiddlewareChain,
      tokenAddress,
    ).symbol;

    // amount is set to 0 and can be updated as per user input.
    return { tokenAddress, symbol, amount: 0 };
  });
};
