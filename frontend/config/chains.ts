/**
 * Chain configurations
 * - add new chains to the CHAIN_CONFIGS object
 */
import { MiddlewareChain as MiddlewareChainId } from '@/client';
import { EvmChainId } from '@/enums/Chain';
import { TokenSymbol } from '@/enums/Token';

import { TOKEN_CONFIG, TokenConfig } from './tokens';

type HttpUrl = `http${'s' | ''}://${string}`;

export type ChainConfig = {
  name: string;
  nativeToken: TokenConfig;
  evmChainId: EvmChainId;
  middlewareChain: MiddlewareChainId;
  rpc: HttpUrl;
  // TODO: the values are hardcoded, should be fetched from the backend
  /**
   * Least amount of native token required to create a Safe
   * @example for gnosis chain, 1.5 XDAI is required to create a Safe
   */
  safeCreationThreshold: number;
};

export const GNOSIS_CHAIN_CONFIG: ChainConfig = {
  evmChainId: EvmChainId.Gnosis,
  name: 'Gnosis',
  nativeToken: TOKEN_CONFIG[EvmChainId.Gnosis][TokenSymbol.XDAI],
  middlewareChain: MiddlewareChainId.GNOSIS,
  rpc: process.env.GNOSIS_RPC as HttpUrl,
  safeCreationThreshold: 1.5,
} as const;

export const BASE_CHAIN_CONFIG: ChainConfig = {
  evmChainId: EvmChainId.Base,
  name: 'Base',
  nativeToken: TOKEN_CONFIG[EvmChainId.Base][TokenSymbol.ETH],
  middlewareChain: MiddlewareChainId.BASE,
  rpc: process.env.BASE_RPC as HttpUrl,
  safeCreationThreshold: 0.005,
} as const;

export const MODE_CHAIN_CONFIG: ChainConfig = {
  evmChainId: EvmChainId.Mode,
  name: 'Mode',
  nativeToken: TOKEN_CONFIG[EvmChainId.Mode][TokenSymbol.ETH],
  middlewareChain: MiddlewareChainId.MODE,
  rpc: process.env.MODE_RPC as HttpUrl,
  safeCreationThreshold: 0.0005,
} as const;

// TODO: celo - check each key
export const CELO_CHAIN_CONFIG: ChainConfig = {
  evmChainId: EvmChainId.Celo,
  name: 'Celo',
  nativeToken: TOKEN_CONFIG[EvmChainId.Celo][TokenSymbol.CELO],
  middlewareChain: MiddlewareChainId.CELO,
  rpc: process.env.CELO_RPC as HttpUrl,
  safeCreationThreshold: 0.005,
} as const;

export const CHAIN_CONFIG: {
  [evmChainId in EvmChainId]: ChainConfig;
} = {
  [EvmChainId.Base]: BASE_CHAIN_CONFIG,
  [EvmChainId.Gnosis]: GNOSIS_CHAIN_CONFIG,
  [EvmChainId.Mode]: MODE_CHAIN_CONFIG,
  [EvmChainId.Celo]: CELO_CHAIN_CONFIG,
} as const;
