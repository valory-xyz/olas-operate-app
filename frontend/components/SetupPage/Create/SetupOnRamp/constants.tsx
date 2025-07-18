import {
  EvmChainId,
  EvmChainIdMap,
  MiddlewareChain,
  SupportedMiddlewareChain,
} from '@/constants/chains';

/**
 * Map of middleware chains to EVM chain IDs for on-ramp purposes.
 * For example, If the agent is on Gnosis, the on-ramp will be done on Optimism.
 */
export const onRampChainMap: Record<SupportedMiddlewareChain, EvmChainId> = {
  [MiddlewareChain.GNOSIS]: EvmChainIdMap.Optimism,
  [MiddlewareChain.OPTIMISM]: EvmChainIdMap.Optimism,
  [MiddlewareChain.BASE]: EvmChainIdMap.Base,
  [MiddlewareChain.MODE]: EvmChainIdMap.Optimism,
  [MiddlewareChain.CELO]: EvmChainIdMap.Celo,
};
