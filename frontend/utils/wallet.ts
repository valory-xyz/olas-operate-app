import { ChainTokenConfig, TokenSymbol } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { Address } from '@/types/Address';
import { TokenAmounts } from '@/types/Wallet';
import { areAddressesEqual } from '@/utils/address';

import { formatNumber } from './numberFormatters';

/**
 * Mapping of bridged token symbols to their source token symbols on Ethereum.
 * Used to resolve tokens when bridging between chains.
 * Example: USDC.e on Polygon bridges to USDC on Ethereum
 *
 * IMPORTANT: This mapping is Ethereum-specific and assumes Ethereum as the source chain.
 * It is designed for the current use cases (Setup Bridge and Pearl Deposit), which both
 * bridge FROM Ethereum TO other chains. If you need to support bridging from a different
 * source chain in the future, you will need to either:
 * 1. Create a separate mapping for that source chain, or
 * 2. Refactor this to a multi-dimensional mapping that includes the source chain as a key
 */
const BRIDGED_TOKEN_SOURCE_MAP: Partial<Record<TokenSymbol, TokenSymbol>> = {
  'USDC.e': 'USDC',
};

/**
 * To format token amounts into a human-readable string.
 * @example: { ETH: 0.5, DAI: 100 } => "0.5 ETH and 100 DAI"
 */
export function tokenBalancesToSentence(tokenAmounts: TokenAmounts): string {
  const entries = Object.entries(tokenAmounts).filter(
    ([, { amount: value }]) => value !== 0,
  );
  if (entries.length === 0) return '';

  const formatted = entries.map(
    ([symbol, { amount }]) => `${formatNumber(amount, 4)} ${symbol}`,
  );

  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return formatted.join(' and ');
  return `${formatted.slice(0, -1).join(', ')} and ${formatted.at(-1)}`;
}

/**
 * Get the token details from the token address.
 * Example: if tokenAddress is USDC, it will return the USDC details from the chainConfig.
 */
export const getTokenDetails = (
  tokenAddress: Address,
  chainConfig: ChainTokenConfig,
) => {
  if (areAddressesEqual(tokenAddress, AddressZero)) {
    const nativeToken = Object.values(chainConfig).find(
      (configToken) => configToken.tokenType === 'native',
    );
    return {
      symbol: (nativeToken?.symbol ?? 'ETH') as TokenSymbol,
      decimals: nativeToken?.decimals ?? 18,
    };
  }

  return Object.values(chainConfig).find((configToken) =>
    areAddressesEqual(configToken.address, tokenAddress),
  );
};

const getTokenSymbol = (tokenAddress: Address, chainConfig: ChainTokenConfig) =>
  getTokenDetails(tokenAddress, chainConfig)?.symbol;

export const getTokenDecimal = (
  tokenAddress: Address,
  chainConfig: ChainTokenConfig,
) => getTokenDetails(tokenAddress, chainConfig)?.decimals;

/**
 * Helper to get source token address.
 *
 * Example, if tokenAddress is USDC on the destination chain,
 * it will return the USDC address on the fromChain (Ethereum).
 * For bridged tokens like USDC.e, it resolves to the native token on the source chain (USDC).
 */
export const getFromToken = (
  tokenAddress: Address,
  fromChainConfig: ChainTokenConfig,
  toChainConfig: ChainTokenConfig,
): Address => {
  if (areAddressesEqual(tokenAddress, AddressZero)) return AddressZero;

  const tokenSymbol = getTokenSymbol(tokenAddress, toChainConfig);

  if (!tokenSymbol) {
    throw new Error(
      `Failed to get token symbol for the destination token: ${tokenAddress}`,
    );
  }

  // Resolve bridged tokens to their source token symbol
  const sourceTokenSymbol =
    BRIDGED_TOKEN_SOURCE_MAP[tokenSymbol] ?? tokenSymbol;

  if (!fromChainConfig[sourceTokenSymbol]?.address) {
    throw new Error(
      `Failed to get source token for the destination token: ${tokenAddress}`,
    );
  }

  return fromChainConfig[sourceTokenSymbol]?.address as Address;
};
