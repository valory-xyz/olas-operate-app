/**
 * Chain configurations
 * - add new chains to the CHAIN_CONFIGS object
 */
import { MiddlewareChain as MiddlewareChainId } from '@/client';
import { TokenSymbol } from '@/enums';
import { EvmChainId } from '@/enums/Chain';

import { TOKEN_CONFIG, TokenConfig } from './tokens';

type HttpUrl = `http${'s' | ''}://${string}`;

export type ChainConfig = {
  name: string;
  nativeToken: TokenConfig;
  evmChainId: EvmChainId;
  middlewareChain: MiddlewareChainId;
  rpc: HttpUrl;
  color: `#${string}`;
  // TODO: the values are hardcoded, should be fetched from the backend
  /**
   * Least amount of native token required to create a Safe.
   * @example for gnosis chain, 1.5 XDAI is required to create a Safe.
   * For new chains, ask middleware team for the value.
   */
  safeCreationThreshold: number;
};

const GNOSIS_CHAIN_CONFIG: ChainConfig = {
  evmChainId: EvmChainId.Gnosis,
  name: 'Gnosis',
  nativeToken: TOKEN_CONFIG[EvmChainId.Gnosis][TokenSymbol.ETH] as TokenConfig,
  middlewareChain: MiddlewareChainId.GNOSIS,
  rpc: process.env.GNOSIS_RPC as HttpUrl,
  safeCreationThreshold: 1.5,
  color: '#04795B0F',
} as const;

const BASE_CHAIN_CONFIG: ChainConfig = {
  evmChainId: EvmChainId.Base,
  name: 'Base',
  nativeToken: TOKEN_CONFIG[EvmChainId.Base][TokenSymbol.ETH] as TokenConfig,
  middlewareChain: MiddlewareChainId.BASE,
  rpc: process.env.BASE_RPC as HttpUrl,
  safeCreationThreshold: 0.005,
  color: '#0052FF12',
} as const;

const MODE_CHAIN_CONFIG: ChainConfig = {
  evmChainId: EvmChainId.Mode,
  name: 'Mode',
  nativeToken: TOKEN_CONFIG[EvmChainId.Mode][TokenSymbol.ETH] as TokenConfig,
  middlewareChain: MiddlewareChainId.MODE,
  rpc: process.env.MODE_RPC as HttpUrl,
  safeCreationThreshold: 0.0005,
  color: '#DFFE0029',
} as const;

const OPTIMISM_CHAIN_CONFIG: ChainConfig = {
  evmChainId: EvmChainId.Optimism,
  name: 'Optimism',
  nativeToken: TOKEN_CONFIG[EvmChainId.Optimism][
    TokenSymbol.ETH
  ] as TokenConfig,
  middlewareChain: MiddlewareChainId.OPTIMISM,
  rpc: process.env.OPTIMISM_RPC as HttpUrl,
  safeCreationThreshold: 0.005,
  color: '#FF042012',
} as const;

export const CHAIN_CONFIG: {
  [evmChainId in EvmChainId]: ChainConfig;
} = {
  [EvmChainId.Base]: BASE_CHAIN_CONFIG,
  [EvmChainId.Gnosis]: GNOSIS_CHAIN_CONFIG,
  [EvmChainId.Mode]: MODE_CHAIN_CONFIG,
  [EvmChainId.Optimism]: OPTIMISM_CHAIN_CONFIG,
} as const;
