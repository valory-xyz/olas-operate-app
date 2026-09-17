import { ValueOf } from '@/types/Util';

export const EvmChainIdMap = {
  Gnosis: 100,
  Base: 8453,
  Mode: 34443,
  Optimism: 10,
  Polygon: 137,
  Robinhood: 4663,
} as const;
export type EvmChainId = (typeof EvmChainIdMap)[keyof typeof EvmChainIdMap];

export const EvmChainName = {
  [EvmChainIdMap.Gnosis]: 'Gnosis',
  [EvmChainIdMap.Base]: 'Base',
  [EvmChainIdMap.Mode]: 'Mode',
  [EvmChainIdMap.Optimism]: 'Optimism',
  [EvmChainIdMap.Polygon]: 'Polygon',
  [EvmChainIdMap.Robinhood]: 'Robinhood',
} as const;
export type EvmChainName = ValueOf<typeof EvmChainName>;

export const AllEvmChainIdMap = {
  Ethereum: 1,
  Gnosis: EvmChainIdMap.Gnosis,
  Base: EvmChainIdMap.Base,
  Mode: EvmChainIdMap.Mode,
  Optimism: EvmChainIdMap.Optimism,
  Polygon: EvmChainIdMap.Polygon,
  Robinhood: EvmChainIdMap.Robinhood,
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
  ROBINHOOD: 'robinhood',
} as const;
export type MiddlewareChain = ValueOf<typeof MiddlewareChainMap>;

export const SupportedMiddlewareChainMap = {
  gnosis: MiddlewareChainMap.GNOSIS,
  optimism: MiddlewareChainMap.OPTIMISM,
  base: MiddlewareChainMap.BASE,
  mode: MiddlewareChainMap.MODE,
  polygon: MiddlewareChainMap.POLYGON,
  robinhood: MiddlewareChainMap.ROBINHOOD,
} as const;
export type SupportedMiddlewareChain = ValueOf<
  typeof SupportedMiddlewareChainMap
>;

export const CHAIN_IMAGE_MAP = {
  [AllEvmChainIdMap.Ethereum]: '/chains/ethereum-chain.png',
  [EvmChainIdMap.Gnosis]: '/chains/gnosis-chain.png',
  [EvmChainIdMap.Base]: '/chains/base-chain.png',
  [EvmChainIdMap.Mode]: '/chains/mode-chain.png',
  [EvmChainIdMap.Optimism]: '/chains/optimism-chain.png',
  [EvmChainIdMap.Polygon]: '/chains/polygon-chain.png',
  [EvmChainIdMap.Robinhood]: '/chains/robinhood-chain.png',
} as const;

export type ChainImage = ValueOf<typeof CHAIN_IMAGE_MAP>;
