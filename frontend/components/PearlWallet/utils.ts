import { entries, find, findKey } from 'lodash';

import { AddressBalanceRecord, TokenBalanceRecord } from '@/client';
import { TOKEN_CONFIG, TokenType } from '@/config/tokens';
import { AddressZero, EvmChainId, TokenSymbol } from '@/constants';
import { Address } from '@/types/Address';
import { Optional } from '@/types/Util';
import { TokenAmounts } from '@/types/Wallet';
import { areAddressesEqual, formatUnitsToNumber } from '@/utils';

export const getAddressBalance = (
  data: AddressBalanceRecord,
  address: string,
): Optional<TokenBalanceRecord> => {
  const matchedKey = findKey(data, (_, key) => areAddressesEqual(key, address));

  return matchedKey
    ? data[matchedKey as keyof AddressBalanceRecord]
    : undefined;
};

export const getInitialDepositValues = (
  chainId: EvmChainId,
  masterSafeRefillRequirement: TokenBalanceRecord,
  nativeTokenSymbol: TokenSymbol,
) => {
  const chainConfig = TOKEN_CONFIG[chainId];
  return entries(masterSafeRefillRequirement).reduce(
    (acc, [untypedAddress, amountInWei]) => {
      const tokenAddress = untypedAddress as Address;

      // Handle ERC-20 tokens by matching address from chain config
      const tokenDetails = find(chainConfig, (config) =>
        areAddressesEqual(config.address ?? AddressZero, tokenAddress),
      );
      if (!tokenDetails) return acc;

      const amount = formatUnitsToNumber(
        `${amountInWei}`,
        tokenDetails.decimals,
        6,
      );
      if (!amount) return acc;

      // Handle native token (ETH, xDAI, etc.)
      const isNativeToken = tokenDetails.tokenType === TokenType.NativeGas;
      if (isNativeToken) {
        acc[nativeTokenSymbol] = amount;
        return acc;
      }

      // Handle ERC-20 tokens by matching address from chain config
      const matchingTokenSymbol = findKey(chainConfig, (config) =>
        areAddressesEqual(config.address, tokenAddress),
      );

      if (matchingTokenSymbol) {
        acc[matchingTokenSymbol as TokenSymbol] = amount;
      }

      return acc;
    },
    {} as TokenAmounts,
  );
};
