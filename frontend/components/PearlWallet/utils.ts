import { entries, find, findKey } from 'lodash';

import { TOKEN_CONFIG, TokenType } from '@/config/tokens';
import { AddressZero, EvmChainId } from '@/constants';
import {
  Address,
  AddressBalanceRecord,
  Maybe,
  Nullable,
  Optional,
  TokenAmounts,
  TokenBalanceRecord,
} from '@/types';
import { areAddressesEqual, formatUnitsToNumber } from '@/utils';

const getAddressBalance = (
  data: AddressBalanceRecord,
  address: string,
): Optional<TokenBalanceRecord> => {
  const matchedKey = findKey(data, (_, key) => areAddressesEqual(key, address));

  return matchedKey
    ? data[matchedKey as keyof AddressBalanceRecord]
    : undefined;
};

/**
 * Get the initial deposit values required for a master safe on a specific chain.
 *
 * @example
 * Given:
 * chainId: 100
 * masterSafeRefillRequirement: {
 *   "0x0000000000000000000000000000000000000000": "1000000000000000000", // 1 XDAI
 *   "0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f": "500000000000000000000" // 500 OLAS
 * }
 * nativeTokenSymbol: "XDAI"
 *
 * Returns:
 * { XDAI: 1, OLAS: 500 }
 */
const getInitialDepositValues = (
  chainId: EvmChainId,
  masterSafeRefillRequirement: TokenBalanceRecord,
) => {
  const chainConfig = TOKEN_CONFIG[chainId];
  return entries(masterSafeRefillRequirement).reduce(
    (acc, [untypedAddress, amountInWei]) => {
      const tokenAddress = untypedAddress as Address;

      const tokenDetails = find(chainConfig, (config) => {
        const isNative = config?.tokenType === TokenType.NativeGas;
        const address = isNative ? AddressZero : config?.address;
        return areAddressesEqual(address, tokenAddress);
      });
      if (!tokenDetails) return acc;

      const amount = formatUnitsToNumber(
        `${amountInWei}`,
        tokenDetails.decimals,
        6,
      );
      if (!amount) return acc;

      acc[tokenDetails.symbol] = { ...acc[tokenDetails.symbol], amount };

      return acc;
    },
    {} as TokenAmounts,
  );
};

/**
 * Get the initial deposit amounts required for a
 * given master safe address on a specific wallet chain.
 */
export const getInitialDepositForMasterSafe = (
  walletChainId: EvmChainId,
  masterSafeAddress: Nullable<Address>,
  getRefillRequirementsOf: (chainId: EvmChainId) => Maybe<AddressBalanceRecord>,
) => {
  if (!masterSafeAddress) return;

  // Get the refill requirements for the current chain
  const refillRequirements = getRefillRequirementsOf(walletChainId);
  if (!refillRequirements) return;

  // Find the refill requirement for the master safe
  const masterSafeRefillRequirement = getAddressBalance(
    refillRequirements,
    masterSafeAddress,
  );

  if (!masterSafeRefillRequirement) return;

  return getInitialDepositValues(walletChainId, masterSafeRefillRequirement);
};
