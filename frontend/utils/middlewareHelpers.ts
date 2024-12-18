import { MiddlewareChain } from '@/client';
import { EvmChainId } from '@/enums/Chain';

/**
 * Converts middleware chain enums to chain ids
 * @param chain
 * @returns ChainId
 * @throws Error
 */
export const asEvmChainId = (chain?: MiddlewareChain | string): EvmChainId => {
  switch (chain) {
    case MiddlewareChain.ETHEREUM:
      return EvmChainId.Ethereum;
    case MiddlewareChain.OPTIMISM:
      return EvmChainId.Optimism;
    case MiddlewareChain.GNOSIS:
      return EvmChainId.Gnosis;
    case MiddlewareChain.BASE:
      return EvmChainId.Base;
    case MiddlewareChain.MODE:
      return EvmChainId.Mode;
  }
  throw new Error(`Invalid middleware chain enum: ${chain}`);
};

export const asMiddlewareChain = (chainId?: EvmChainId | number) => {
  switch (chainId) {
    case EvmChainId.Ethereum:
      return MiddlewareChain.ETHEREUM;
    case EvmChainId.Optimism:
      return MiddlewareChain.OPTIMISM;
    case EvmChainId.Gnosis:
      return MiddlewareChain.GNOSIS;
    case EvmChainId.Base:
      return MiddlewareChain.BASE;
    case EvmChainId.Mode:
      return MiddlewareChain.MODE;
  }
  throw new Error(`Invalid chain id: ${chainId}`);
};
