import { ValueOf } from '@/types/Util';

export const EvmChainId = {
  Gnosis: 100,
  Base: 8453,
  Mode: 34443,
  Celo: 42220,
  Optimism: 10,
} as const;

export const EvmChainName = {
  [EvmChainId.Gnosis]: 'Gnosis',
  [EvmChainId.Base]: 'Base',
  [EvmChainId.Mode]: 'Mode',
  [EvmChainId.Celo]: 'Celo',
  [EvmChainId.Optimism]: 'Optimism',
} as const;

export const AllEvmChainId = {
  Ethereum: 1,
  Gnosis: EvmChainId.Gnosis,
  Base: EvmChainId.Base,
  Mode: EvmChainId.Mode,
  Celo: EvmChainId.Celo,
  Optimism: EvmChainId.Optimism,
} as const;

/**
 * @note Use this enum to infer all the middleware chains existing in the system
 * else use the SupportedMiddlewareChain enum for the chains that are supported by the agents and to be strictly typed.
 *
 * @warning The value doesn’t actually represent the real chain name;
 * it reflects the open-autonomy internal name instead.
 */
export const MiddlewareChain = {
  ETHEREUM: 'ethereum',
  GOERLI: 'goerli',
  GNOSIS: 'gnosis',
  SOLANA: 'solana',
  OPTIMISM: 'optimistic', // @note "optimistic" and not "optimism"
  BASE: 'base',
  MODE: 'mode',
  CELO: 'celo',
} as const;

const MiddlewareChainsMap = {
  gnosis: MiddlewareChain.GNOSIS,
  optimism: MiddlewareChain.OPTIMISM,
  base: MiddlewareChain.BASE,
  mode: MiddlewareChain.MODE,
  celo: MiddlewareChain.CELO,
} as const;
export type SupportedMiddlewareChain = ValueOf<typeof MiddlewareChainsMap>;
