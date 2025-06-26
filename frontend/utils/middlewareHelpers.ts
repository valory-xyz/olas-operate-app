import { MiddlewareChain } from '@/client';
import { TOKEN_CONFIG } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { EvmChainId } from '@/enums/Chain';
import { TokenSymbol } from '@/enums/Token';
import { Address } from '@/types/Address';

import { areAddressesEqual } from './address';

/**
 * Converts middleware chain enums to chain ids
 * @param chain
 * @returns ChainId
 * @throws Error
 * @example asEvmChainId('ethereum') => 1
 */
export const asEvmChainId = (chain?: MiddlewareChain | string): EvmChainId => {
  switch (chain) {
    case MiddlewareChain.GNOSIS:
      return EvmChainId.Gnosis;
    case MiddlewareChain.BASE:
      return EvmChainId.Base;
    case MiddlewareChain.MODE:
      return EvmChainId.Mode;
    case MiddlewareChain.OPTIMISM:
      return EvmChainId.Optimism;
    case MiddlewareChain.CELO:
      return EvmChainId.Celo;
  }
  throw new Error(`Invalid middleware chain enum: ${chain}`);
};

export const asEvmChainDetails = (
  chain?: MiddlewareChain | string,
): {
  name: string;
  displayName: string;
  symbol: TokenSymbol;
} => {
  switch (chain) {
    case MiddlewareChain.ETHEREUM:
      return {
        name: 'ethereum',
        displayName: 'Ethereum',
        symbol: TokenSymbol.ETH,
      };
    case MiddlewareChain.GNOSIS:
      return {
        name: 'gnosis',
        displayName: 'Gnosis',
        symbol: TokenSymbol.XDAI,
      };
    case MiddlewareChain.BASE:
      return { name: 'base', displayName: 'Base', symbol: TokenSymbol.ETH };
    case MiddlewareChain.CELO:
      return { name: 'celo', displayName: 'Celo', symbol: TokenSymbol.CELO };
    case MiddlewareChain.MODE:
      return { name: 'mode', displayName: 'Mode', symbol: TokenSymbol.ETH };
    case MiddlewareChain.OPTIMISM:
      return {
        name: 'optimism',
        displayName: 'Optimism',
        symbol: TokenSymbol.ETH,
      };
  }
  throw new Error(`Invalid middleware chain enum: ${chain}`);
};

/**
 * Converts chain ids to middleware chain enums
 * @example asMiddlewareChain(1) => 'ethereum'
 */
export const asMiddlewareChain = (chainId?: EvmChainId | number) => {
  switch (chainId) {
    case EvmChainId.Gnosis:
      return MiddlewareChain.GNOSIS;
    case EvmChainId.Base:
      return MiddlewareChain.BASE;
    case EvmChainId.Mode:
      return MiddlewareChain.MODE;
    case EvmChainId.Optimism:
      return MiddlewareChain.OPTIMISM;
    case EvmChainId.Celo:
      return MiddlewareChain.CELO;
  }
  throw new Error(`Invalid chain id: ${chainId}`);
};

/**
 * Converts token symbol to middleware chain enums
 */
export const toMiddlewareChainFromTokenSymbol = (
  tokenSymbol?: TokenSymbol,
): MiddlewareChain | undefined => {
  switch (tokenSymbol) {
    case 'ETH':
      return MiddlewareChain.ETHEREUM;
    case 'OLAS':
      return MiddlewareChain.GNOSIS;
    case 'CELO':
      return MiddlewareChain.CELO;
    case 'XDAI':
      return MiddlewareChain.GNOSIS;
    case 'WXDAI':
      return MiddlewareChain.GNOSIS;
  }

  throw new Error(`Invalid token symbol: ${tokenSymbol}`);
};

/**
 * To get token details based on the provided token address.
 *
 * For example, if the chain is Gnosis and the token address is AddressZero (native token),
 * it will return the details of the XDAI token such as symbol, decimals, and address.
 */
export const getTokenDetailsFromAddress = (
  chainId: MiddlewareChain,
  tokenAddress: Address,
) => {
  const chainConfigs = TOKEN_CONFIG[asEvmChainId(chainId)];
  const details = Object.values(chainConfigs).find((tokenInfo) => {
    if (tokenAddress === AddressZero && !tokenInfo.address) return true;
    return areAddressesEqual(tokenInfo.address, tokenAddress);
  });

  if (!details) {
    throw new Error(`Token details not found for address: ${tokenAddress}`);
  }

  return details;
};
