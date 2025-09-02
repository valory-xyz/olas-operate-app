import { ValueOf } from '@/types/Util';

export const EvmChainIdMap = {
  Gnosis: 100,
  Base: 8453,
  Mode: 34443,
  Optimism: 10,
} as const;
export type EvmChainId = (typeof EvmChainIdMap)[keyof typeof EvmChainIdMap];

export const EvmChainName = {
  [EvmChainIdMap.Gnosis]: 'Gnosis',
  [EvmChainIdMap.Base]: 'Base',
  [EvmChainIdMap.Mode]: 'Mode',
  [EvmChainIdMap.Optimism]: 'Optimism',
} as const;

export const AllEvmChainIdMap = {
  Ethereum: 1,
  Gnosis: EvmChainIdMap.Gnosis,
  Base: EvmChainIdMap.Base,
  Mode: EvmChainIdMap.Mode,
  Optimism: EvmChainIdMap.Optimism,
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
} as const;
export type MiddlewareChain = ValueOf<typeof MiddlewareChainMap>;

const SupportedMiddlewareChainMap = {
  gnosis: MiddlewareChainMap.GNOSIS,
  optimism: MiddlewareChainMap.OPTIMISM,
  base: MiddlewareChainMap.BASE,
  mode: MiddlewareChainMap.MODE,
} as const;
export type SupportedMiddlewareChain = ValueOf<
  typeof SupportedMiddlewareChainMap
>;

/**
 * Map of middleware chains to EVM chain IDs for on-ramp purposes.
 * For example, If the agent is on Gnosis, the on-ramp will be done on Optimism.
 */
export const onRampChainMap: Record<SupportedMiddlewareChain, EvmChainId> = {
  [SupportedMiddlewareChainMap.gnosis]: EvmChainIdMap.Base,
  [SupportedMiddlewareChainMap.optimism]: EvmChainIdMap.Optimism,
  [SupportedMiddlewareChainMap.base]: EvmChainIdMap.Base,
  [SupportedMiddlewareChainMap.mode]: EvmChainIdMap.Optimism,
};
