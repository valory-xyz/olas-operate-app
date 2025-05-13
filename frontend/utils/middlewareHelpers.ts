import { MiddlewareChain } from '@/client';
import { EvmChainId } from '@/enums/Chain';
import { EvmChainName } from '@/types/Chain';

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

export const asEvmChainName = (chain?: MiddlewareChain | string): string =>
  EvmChainName[asEvmChainId(chain)];

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
