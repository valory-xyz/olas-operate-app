import { ValueOf } from '@/types/Util';

export const EvmChainIdMap = {
  Gnosis: 100,
  Base: 8453,
  Mode: 34443,
  Optimism: 10,
  Polygon: 137,
} as const;
export type EvmChainId = (typeof EvmChainIdMap)[keyof typeof EvmChainIdMap];

export const EvmChainName = {
  [EvmChainIdMap.Gnosis]: 'Gnosis',
  [EvmChainIdMap.Base]: 'Base',
  [EvmChainIdMap.Mode]: 'Mode',
  [EvmChainIdMap.Optimism]: 'Optimism',
  [EvmChainIdMap.Polygon]: 'Polygon',
} as const;
export type EvmChainName = ValueOf<typeof EvmChainName>;

export const AllEvmChainIdMap = {
  Ethereum: 1,
  Gnosis: EvmChainIdMap.Gnosis,
  Base: EvmChainIdMap.Base,
  Mode: EvmChainIdMap.Mode,
  Optimism: EvmChainIdMap.Optimism,
  Polygon: EvmChainIdMap.Polygon,
} as const;
export type AllEvmChainId =
  (typeof AllEvmChainIdMap)[keyof typeof AllEvmChainIdMap];

/**
 * @note Use this enum to infer all the middleware chains existing in the system
 * else use the SupportedMiddlewareChain enum for the chains that are supported by the agents and to be strictly typed.
 *
 * @warning The value doesn’t actually represent the real chain name;
 * it reflects the open-autonomy internal name instead.
 */
export const MiddlewareChainMap = {
  ETHEREUM: 'ethereum',
  GOERLI: 'goerli',
  GNOSIS: 'gnosis',
  SOLANA: 'solana',
  OPTIMISM: 'optimism',
  BASE: 'base',
  MODE: 'mode',
  POLYGON: 'polygon',
} as const;
export type MiddlewareChain = ValueOf<typeof MiddlewareChainMap>;

export const SupportedMiddlewareChainMap = {
  gnosis: MiddlewareChainMap.GNOSIS,
  optimism: MiddlewareChainMap.OPTIMISM,
  base: MiddlewareChainMap.BASE,
  mode: MiddlewareChainMap.MODE,
  polygon: MiddlewareChainMap.POLYGON,
} as const;
export type SupportedMiddlewareChain = ValueOf<
  typeof SupportedMiddlewareChainMap
>;

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

export const CHAIN_IMAGE_MAP = {
  [AllEvmChainIdMap.Ethereum]: '/chains/ethereum-chain.png',
  [EvmChainIdMap.Gnosis]: '/chains/gnosis-chain.png',
  [EvmChainIdMap.Base]: '/chains/base-chain.png',
  [EvmChainIdMap.Mode]: '/chains/mode-chain.png',
  [EvmChainIdMap.Optimism]: '/chains/optimism-chain.png',
  [EvmChainIdMap.Polygon]: '/chains/polygon-chain.png',
} as const;

export type ChainImage = ValueOf<typeof CHAIN_IMAGE_MAP>;
