/**
 * Chain configurations
 * - add new chains to the CHAIN_CONFIGS object
 */
import { MiddlewareChain as MiddlewareChainId } from '@/client';
import { EvmChainId } from '@/enums/Chain';
import { TokenSymbol } from '@/enums/Token';

import { TOKEN_CONFIG, TokenConfig } from './tokens';

type HttpUrl = `http${'s' | ''}://${string}`;

type ChainConfig = {
  name: string;
  nativeToken: TokenConfig;
  evmChainId: number;
  middlewareChain: MiddlewareChainId;
  rpc: HttpUrl;
};

export const GNOSIS_CHAIN_CONFIG: ChainConfig = {
  evmChainId: EvmChainId.Gnosis,
  name: 'Gnosis',
  nativeToken: TOKEN_CONFIG[EvmChainId.Gnosis][TokenSymbol.XDAI],
  middlewareChain: MiddlewareChainId.GNOSIS,
  rpc: process.env.GNOSIS_RPC as HttpUrl,
};

export const OPTIMISM_CHAIN_CONFIG: ChainConfig = {
  evmChainId: EvmChainId.Optimism,
  name: 'Optimism',
  nativeToken: TOKEN_CONFIG[EvmChainId.Optimism][TokenSymbol.ETH],
  middlewareChain: MiddlewareChainId.OPTIMISM,
  rpc: process.env.OPTIMISM_RPC as HttpUrl,
};

export const BASE_CHAIN_CONFIG: ChainConfig = {
  evmChainId: EvmChainId.Base,
  name: 'Base',
  nativeToken: TOKEN_CONFIG[EvmChainId.Base][TokenSymbol.ETH],
  middlewareChain: MiddlewareChainId.BASE,
  rpc: process.env.BASE_RPC as HttpUrl,
};

export const ETHEREUM_CHAIN_CONFIG: ChainConfig = {
  evmChainId: EvmChainId.Ethereum,
  name: 'Ethereum',
  nativeToken: TOKEN_CONFIG[EvmChainId.Ethereum][TokenSymbol.ETH],
  middlewareChain: MiddlewareChainId.ETHEREUM,
  rpc: process.env.GNOSIS_RPC as HttpUrl,
};

export const CHAIN_CONFIG: {
  [evmChainId: number]: ChainConfig;
} = {
  // [EvmChainId.Base]: BASE_CHAIN_CONFIG,
  // [EvmChainId.Ethereum]: ETHEREUM_CHAIN_CONFIG,
  [EvmChainId.Gnosis]: GNOSIS_CHAIN_CONFIG,
  // [EvmChainId.Optimism]: OPTIMISM_CHAIN_CONFIG,
} as const;
