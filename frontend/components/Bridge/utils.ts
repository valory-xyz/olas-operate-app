import { ChainTokenConfig } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { Address } from '@/types/Address';
import { areAddressesEqual } from '@/utils/address';

/**
 * Helper to get source token address.
 *
 * Example, if tokenAddress is USDC on the destination chain,
 * it will return the USDC address on the fromChain (Ethereum).
 */
export const getFromToken = (
  tokenAddress: string,
  fromChainConfig: ChainTokenConfig,
  toChainConfig: ChainTokenConfig,
): Address => {
  if (tokenAddress.toLowerCase() === AddressZero) {
    return AddressZero;
  }

  const tokenSymbol = Object.values(toChainConfig).find((configToken) =>
    areAddressesEqual(configToken.address, tokenAddress),
  )?.symbol;

  if (!tokenSymbol || !fromChainConfig[tokenSymbol]?.address) {
    throw new Error(
      `Failed to get source token for the destination token: ${tokenAddress}`,
    );
  }

  return fromChainConfig[tokenSymbol].address as Address;
};
