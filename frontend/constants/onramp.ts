import {
  EvmChainId,
  EvmChainIdMap,
  SupportedMiddlewareChain,
  SupportedMiddlewareChainMap,
} from './chains';

/**
 * Minimum amount in USD required for on-ramping with credit/debit card
 */
export const MIN_ONRAMP_AMOUNT = 5;

/**
 * Map of middleware chains to EVM chain IDs for on-ramp purposes.
 * For example, If the agent is on Gnosis, the on-ramp will be done on Optimism.
 */
export const ON_RAMP_CHAIN_MAP: Record<
  SupportedMiddlewareChain,
  { chain: EvmChainId; cryptoCurrency: 'ETH' | 'POL' }
> = {
  [SupportedMiddlewareChainMap.gnosis]: {
    chain: EvmChainIdMap.Base,
    cryptoCurrency: 'ETH',
  },
  [SupportedMiddlewareChainMap.optimism]: {
    chain: EvmChainIdMap.Optimism,
    cryptoCurrency: 'ETH',
  },
  [SupportedMiddlewareChainMap.base]: {
    chain: EvmChainIdMap.Base,
    cryptoCurrency: 'ETH',
  },
  [SupportedMiddlewareChainMap.mode]: {
    chain: EvmChainIdMap.Optimism,
    cryptoCurrency: 'ETH',
  },
  [SupportedMiddlewareChainMap.polygon]: {
    chain: EvmChainIdMap.Polygon,
    cryptoCurrency: 'POL',
  },
};
