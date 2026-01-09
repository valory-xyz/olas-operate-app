import { TOKEN_CONFIG, TokenSymbol, TokenSymbolMap } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import {
  AllEvmChainId,
  AllEvmChainIdMap,
  EvmChainId,
  EvmChainIdMap,
  MiddlewareChain,
  MiddlewareChainMap,
  SupportedMiddlewareChain,
} from '@/constants/chains';
import { Address } from '@/types/Address';

import { areAddressesEqual } from './address';

/**
 * Converts middleware chain enums to chain ids
 * @param chain
 * @returns ChainId
 * @throws Error
 * @example asEvmChainId('ethereum') => 1
 */
export const asEvmChainId = (
  chain?: SupportedMiddlewareChain | string,
): EvmChainId => {
  switch (chain) {
    case MiddlewareChainMap.GNOSIS:
      return EvmChainIdMap.Gnosis;
    case MiddlewareChainMap.BASE:
      return EvmChainIdMap.Base;
    case MiddlewareChainMap.MODE:
      return EvmChainIdMap.Mode;
    case MiddlewareChainMap.OPTIMISM:
      return EvmChainIdMap.Optimism;
    case MiddlewareChainMap.POLYGON:
      return EvmChainIdMap.Polygon;
  }
  throw new Error(`Invalid middleware chain enum: ${chain}`);
};

export const asAllEvmChainId = (chainId?: MiddlewareChain) => {
  if (MiddlewareChainMap.ETHEREUM === chainId) {
    return AllEvmChainIdMap.Ethereum;
  }
  return asEvmChainId(chainId);
};

export const asEvmChainDetails = (
  chain?: MiddlewareChain | string,
): {
  name: string;
  displayName: string;
  symbol: TokenSymbol;
  chainId: AllEvmChainId;
} => {
  switch (chain) {
    case MiddlewareChainMap.ETHEREUM:
      return {
        name: 'ethereum',
        displayName: 'Ethereum',
        symbol: TokenSymbolMap.ETH,
        chainId: AllEvmChainIdMap.Ethereum,
      };
    case MiddlewareChainMap.GNOSIS:
      return {
        name: 'gnosis',
        displayName: 'Gnosis',
        symbol: TokenSymbolMap.XDAI,
        chainId: AllEvmChainIdMap.Gnosis,
      };
    case MiddlewareChainMap.BASE:
      return {
        name: 'base',
        displayName: 'Base',
        symbol: TokenSymbolMap.ETH,
        chainId: AllEvmChainIdMap.Base,
      };
    case MiddlewareChainMap.MODE:
      return {
        name: 'mode',
        displayName: 'Mode',
        symbol: TokenSymbolMap.ETH,
        chainId: AllEvmChainIdMap.Mode,
      };
    case MiddlewareChainMap.OPTIMISM:
      return {
        name: 'optimism',
        displayName: 'Optimism',
        symbol: TokenSymbolMap.ETH,
        chainId: AllEvmChainIdMap.Optimism,
      };
    case MiddlewareChainMap.POLYGON:
      return {
        name: 'polygon',
        displayName: 'Polygon',
        symbol: TokenSymbolMap.POL,
        chainId: AllEvmChainIdMap.Polygon,
      };
  }
  throw new Error(`Invalid middleware chain enum: ${chain}`);
};

/**
 * Converts chain ids to middleware chain enums
 * @example asMiddlewareChain(1) => 'ethereum'
 */
export const asMiddlewareChain = (chainId?: EvmChainId | AllEvmChainId) => {
  switch (chainId) {
    case EvmChainIdMap.Gnosis:
      return MiddlewareChainMap.GNOSIS;
    case EvmChainIdMap.Base:
      return MiddlewareChainMap.BASE;
    case EvmChainIdMap.Mode:
      return MiddlewareChainMap.MODE;
    case EvmChainIdMap.Optimism:
      return MiddlewareChainMap.OPTIMISM;
    case EvmChainIdMap.Polygon:
      return MiddlewareChainMap.POLYGON;
  }
  throw new Error(`Invalid chain id: ${chainId}`);
};

export const asAllMiddlewareChain = (chainId?: AllEvmChainId) => {
  if (AllEvmChainIdMap.Ethereum === chainId) {
    return MiddlewareChainMap.ETHEREUM;
  }
  return asMiddlewareChain(chainId);
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
