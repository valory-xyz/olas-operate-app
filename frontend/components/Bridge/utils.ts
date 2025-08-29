import { ChainTokenConfig } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { Address } from '@/types/Address';
import { areAddressesEqual } from '@/utils/address';

/**
 * Get the token details from the token address.
 * Example: if tokenAddress is USDC, it will return the USDC details from the chainConfig.
 */
export const getTokenDetails = (
  tokenAddress: string,
  chainConfig: ChainTokenConfig,
) => {
  if (areAddressesEqual(tokenAddress, AddressZero)) {
    const nativeToken = Object.values(chainConfig).find(
      (configToken) => configToken.tokenType === 'native',
    );
    return {
      symbol: nativeToken?.symbol ?? 'ETH',
      decimals: nativeToken?.decimals ?? 18,
    };
  }

  return Object.values(chainConfig).find((configToken) =>
    areAddressesEqual(configToken.address, tokenAddress),
  );
};

const getTokenSymbol = (tokenAddress: string, chainConfig: ChainTokenConfig) =>
  getTokenDetails(tokenAddress, chainConfig)?.symbol;

export const getTokenDecimal = (
  tokenAddress: string,
  chainConfig: ChainTokenConfig,
) => getTokenDetails(tokenAddress, chainConfig)?.decimals;

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
  if (areAddressesEqual(tokenAddress, AddressZero)) return AddressZero;

  const tokenSymbol = getTokenSymbol(tokenAddress, toChainConfig);
  if (!tokenSymbol || !fromChainConfig[tokenSymbol]?.address) {
    throw new Error(
      `Failed to get source token for the destination token: ${tokenAddress}`,
    );
  }

  return fromChainConfig[tokenSymbol].address as Address;
};
