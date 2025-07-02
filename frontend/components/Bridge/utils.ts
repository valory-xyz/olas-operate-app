import { ChainTokenConfig } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { Address } from '@/types/Address';
import { areAddressesEqual } from '@/utils/address';

/** Get the token details from the token address */
const getTokenDetails = (
  tokenAddress: string,
  chainConfig: ChainTokenConfig,
) => {
  const token = Object.values(chainConfig).find((configToken) =>
    areAddressesEqual(configToken.address, tokenAddress),
  );
  return token;
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
