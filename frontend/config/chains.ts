/**
 * Chain configurations
 * - add new chains to the CHAIN_CONFIGS object
 */
import {
  EvmChainId,
  EvmChainIdMap,
  MiddlewareChain,
  MiddlewareChainMap,
} from '@/constants/chains';
import { parseEther } from '@/utils';

import { TOKEN_CONFIG, TokenConfig, TokenSymbolMap } from './tokens';

type HttpUrl = `http${'s' | ''}://${string}`;

export type ChainConfig = {
  name: string;
  nativeToken: TokenConfig;
  evmChainId: EvmChainId;
  middlewareChain: MiddlewareChain;
  rpc: HttpUrl;
  /**
   * Least amount of native token required to create a Safe in wei
   * @example for gnosis chain, 1.5 XDAI is required to create a Safe.
   * For new chains, ask middleware team for the value.
   */
  safeCreationThreshold: bigint;
};

const GNOSIS_CHAIN_CONFIG: ChainConfig = {
  evmChainId: EvmChainIdMap.Gnosis,
  name: 'Gnosis',
  nativeToken: TOKEN_CONFIG[EvmChainIdMap.Gnosis][
    TokenSymbolMap.XDAI
  ] as TokenConfig,
  middlewareChain: MiddlewareChainMap.GNOSIS,
  rpc: process.env.GNOSIS_RPC as HttpUrl,
  safeCreationThreshold: BigInt(parseEther(1.5)),
} as const;

const BASE_CHAIN_CONFIG: ChainConfig = {
  evmChainId: EvmChainIdMap.Base,
  name: 'Base',
  nativeToken: TOKEN_CONFIG[EvmChainIdMap.Base][
    TokenSymbolMap.ETH
  ] as TokenConfig,
  middlewareChain: MiddlewareChainMap.BASE,
  rpc: process.env.BASE_RPC as HttpUrl,
  safeCreationThreshold: BigInt(parseEther(0.005)),
} as const;

const MODE_CHAIN_CONFIG: ChainConfig = {
  evmChainId: EvmChainIdMap.Mode,
  name: 'Mode',
  nativeToken: TOKEN_CONFIG[EvmChainIdMap.Mode][
    TokenSymbolMap.ETH
  ] as TokenConfig,
  middlewareChain: MiddlewareChainMap.MODE,
  rpc: process.env.MODE_RPC as HttpUrl,
  safeCreationThreshold: BigInt(parseEther(0.0005)),
} as const;

const OPTIMISM_CHAIN_CONFIG: ChainConfig = {
  evmChainId: EvmChainIdMap.Optimism,
  name: 'Optimism',
  nativeToken: TOKEN_CONFIG[EvmChainIdMap.Optimism][
    TokenSymbolMap.ETH
  ] as TokenConfig,
  middlewareChain: MiddlewareChainMap.OPTIMISM,
  rpc: process.env.OPTIMISM_RPC as HttpUrl,
  safeCreationThreshold: BigInt(parseEther(0.005)),
} as const;

const POLYGON_CHAIN_CONFIG: ChainConfig = {
  evmChainId: EvmChainIdMap.Polygon,
  name: 'Polygon',
  nativeToken: TOKEN_CONFIG[EvmChainIdMap.Polygon][
    TokenSymbolMap.POL
  ] as TokenConfig,
  middlewareChain: MiddlewareChainMap.POLYGON,
  rpc: process.env.POLYGON_RPC as HttpUrl,
  safeCreationThreshold: BigInt(parseEther(16)),
} as const;

export const CHAIN_CONFIG: {
  [evmChainId in EvmChainId]: ChainConfig;
} = {
  [EvmChainIdMap.Base]: BASE_CHAIN_CONFIG,
  [EvmChainIdMap.Gnosis]: GNOSIS_CHAIN_CONFIG,
  [EvmChainIdMap.Mode]: MODE_CHAIN_CONFIG,
  [EvmChainIdMap.Optimism]: OPTIMISM_CHAIN_CONFIG,
  [EvmChainIdMap.Polygon]: POLYGON_CHAIN_CONFIG,
} as const;
