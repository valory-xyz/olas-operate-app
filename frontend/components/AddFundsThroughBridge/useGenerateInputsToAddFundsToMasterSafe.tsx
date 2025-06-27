import { uniq } from 'lodash';

import { AddressBalanceRecord } from '@/client';
import { TokenSymbol } from '@/enums/Token';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useServices } from '@/hooks/useServices';
import { Address } from '@/types/Address';
import { getTokenDetailsFromAddress } from '@/utils/middlewareHelpers';

export type GeneratedInput = {
  tokenAddress: Address;
  symbol: TokenSymbol;
  amount: number;
};

/**
 * Generate inputs to add funds for bridging.
 *
 * Example: If the chain is Gnosis, user can add OLAS and XDAI.
 * This function will return an array of objects with tokenAddress, symbol, and amount set to 0.
 */
export const useGenerateInputsToAddFundsToMasterSafe = (): GeneratedInput[] => {
  const { selectedAgentConfig } = useServices();
  const toMiddlewareChain = selectedAgentConfig.middlewareHomeChainId;
  const { totalRequirements: untypedTotalRequirements } =
    useBalanceAndRefillRequirementsContext();
  const totalRequirements = untypedTotalRequirements as AddressBalanceRecord;

  if (!totalRequirements) return [];

  // master_safe and master_eoa addresses in general.
  const allAddresses = Object.keys(totalRequirements) as Address[];

  // all token addresses that can be used to add funds to the master safe.
  const tokenAddresses = allAddresses.reduce<Address[]>((acc, address) => {
    const tokens = totalRequirements[address];
    if (tokens) {
      acc.push(...(Object.keys(tokens) as Address[]));
    }
    return acc;
  }, []);

  return uniq(tokenAddresses).map((tokenAddress: Address) => {
    const symbol = getTokenDetailsFromAddress(
      toMiddlewareChain,
      tokenAddress,
    ).symbol;

    // amount is set to 0 and can be updated as per user input.
    return { tokenAddress, symbol, amount: 0 };
  });
};
