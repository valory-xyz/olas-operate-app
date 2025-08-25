import { MiddlewareChain } from '@/client';
import { TOKEN_CONFIG } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import {
  AllEvmChainId,
  AllEvmChainIdMap,
  EvmChainId,
  EvmChainIdMap,
} from '@/constants/chains';
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
      return EvmChainIdMap.Gnosis;
    case MiddlewareChain.BASE:
      return EvmChainIdMap.Base;
    case MiddlewareChain.MODE:
      return EvmChainIdMap.Mode;
    case MiddlewareChain.OPTIMISM:
      return EvmChainIdMap.Optimism;
  }
  throw new Error(`Invalid middleware chain enum: ${chain}`);
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
    case MiddlewareChain.ETHEREUM:
      return {
        name: 'ethereum',
        displayName: 'Ethereum',
        symbol: TokenSymbol.ETH,
        chainId: AllEvmChainIdMap.Ethereum,
      };
    case MiddlewareChain.GNOSIS:
      return {
        name: 'gnosis',
        displayName: 'Gnosis',
        symbol: TokenSymbol.XDAI,
        chainId: AllEvmChainIdMap.Gnosis,
      };
    case MiddlewareChain.BASE:
      return {
        name: 'base',
        displayName: 'Base',
        symbol: TokenSymbol.ETH,
        chainId: AllEvmChainIdMap.Base,
      };
    case MiddlewareChain.MODE:
      return {
        name: 'mode',
        displayName: 'Mode',
        symbol: TokenSymbol.ETH,
        chainId: AllEvmChainIdMap.Mode,
      };
    case MiddlewareChain.OPTIMISM:
      return {
        name: 'optimism',
        displayName: 'Optimism',
        symbol: TokenSymbol.ETH,
        chainId: AllEvmChainIdMap.Optimism,
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
      return MiddlewareChain.GNOSIS;
    case EvmChainIdMap.Base:
      return MiddlewareChain.BASE;
    case EvmChainIdMap.Mode:
      return MiddlewareChain.MODE;
    case EvmChainIdMap.Optimism:
      return MiddlewareChain.OPTIMISM;
  }
  throw new Error(`Invalid chain id: ${chainId}`);
};

export const asAllMiddlewareChain = (chainId?: AllEvmChainId) => {
  if (AllEvmChainIdMap.Ethereum === chainId) {
    return MiddlewareChain.ETHEREUM;
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
