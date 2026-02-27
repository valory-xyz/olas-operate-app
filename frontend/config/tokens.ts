import {
  AllEvmChainId,
  AllEvmChainIdMap,
  EvmChainId,
  EvmChainIdMap,
} from '@/constants/chains';
import { Address } from '@/types/Address';

export const TokenSymbolMap = {
  ETH: 'ETH',
  OLAS: 'OLAS',
  USDC: 'USDC',
  XDAI: 'XDAI',
  /** WXDAI: Token used for making bets in predict agent */
  WXDAI: 'WXDAI',
  POL: 'POL',
  'USDC.e': 'USDC.e',
} as const;

export type TokenSymbol = keyof typeof TokenSymbolMap;

export const TokenSymbolConfigMap: Record<TokenSymbol, { image: string }> = {
  [TokenSymbolMap.ETH]: { image: '/chains/ethereum-chain.png' },
  [TokenSymbolMap.XDAI]: { image: '/tokens/xdai-icon.png' },
  [TokenSymbolMap.OLAS]: { image: '/tokens/olas-icon.png' },
  [TokenSymbolMap.USDC]: { image: '/tokens/usdc-icon.png' },
  [TokenSymbolMap.WXDAI]: { image: '/tokens/wxdai-icon.png' },
  [TokenSymbolMap.POL]: { image: '/tokens/pol-icon.png' },
  [TokenSymbolMap['USDC.e']]: { image: '/tokens/usdc-icon.png' },
} as const;

export enum TokenType {
  NativeGas = 'native',
  Erc20 = 'erc20',
  Erc721 = 'erc721',
  Wrapped = 'wrapped',
  // Erc1155 = 'erc1155',
  // UniswapV2Lp = 'v2lp',
  // UniswapV3Lp = 'v3lp',
}

export type Erc20TokenConfig = {
  address: Address;
  tokenType: TokenType.Erc20;
  decimals: number;
  symbol: TokenSymbol;
};

// TODO: add ZeroAddress for native tokens
export type NativeTokenConfig = {
  address?: undefined;
  tokenType: TokenType.NativeGas;
  decimals: number;
  symbol: TokenSymbol;
};

export type WrappedTokenConfig = {
  address: Address;
  tokenType: TokenType.Wrapped;
  decimals: number;
  symbol: TokenSymbol;
};

export type TokenConfig =
  | Erc20TokenConfig
  | NativeTokenConfig
  | WrappedTokenConfig;

export type ChainTokenConfig = Partial<Record<TokenSymbol, TokenConfig>>;

export const ETHEREUM_TOKEN_CONFIG: ChainTokenConfig = {
  [TokenSymbolMap.ETH]: {
    tokenType: TokenType.NativeGas,
    decimals: 18,
    symbol: TokenSymbolMap.ETH,
  },
  [TokenSymbolMap.OLAS]: {
    address: '0x0001A500A6B18995B03f44bb040A5fFc28E45CB0',
    decimals: 18,
    tokenType: TokenType.Erc20,
    symbol: TokenSymbolMap.OLAS,
  },
  [TokenSymbolMap.USDC]: {
    address: '0xA0b86991c6218b36c1d19D4a2e9EB0CE3606EB48',
    decimals: 6,
    tokenType: TokenType.Erc20,
    symbol: TokenSymbolMap.USDC,
  },
} as const;

const GNOSIS_TOKEN_CONFIG: ChainTokenConfig = {
  [TokenSymbolMap.XDAI]: {
    decimals: 18,
    tokenType: TokenType.NativeGas,
    symbol: TokenSymbolMap.XDAI,
  },
  [TokenSymbolMap.OLAS]: {
    address: '0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f',
    decimals: 18,
    tokenType: TokenType.Erc20,
    symbol: TokenSymbolMap.OLAS,
  },
  [TokenSymbolMap.WXDAI]: {
    address: '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d',
    decimals: 18,
    tokenType: TokenType.Wrapped,
    symbol: TokenSymbolMap.WXDAI,
  },
  /**
   * @warning USDC.e (bridged USDC) is a special case, it has 6 decimals, not 18.
   * @link https://gnosisscan.io/token/0x2a22f9c3b484c3629090feed35f17ff8f88f76f0
   * @note When parsing or formatting units, use `decimals` (6) instead of the standard `ether` sizing (10^18).
   */
  [TokenSymbolMap['USDC.e']]: {
    address: '0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0',
    decimals: 6,
    tokenType: TokenType.Erc20,
    symbol: TokenSymbolMap['USDC.e'],
  },
} as const;

const BASE_TOKEN_CONFIG: ChainTokenConfig = {
  [TokenSymbolMap.ETH]: {
    tokenType: TokenType.NativeGas,
    decimals: 18,
    symbol: TokenSymbolMap.ETH,
  },
  [TokenSymbolMap.OLAS]: {
    address: '0x54330d28ca3357F294334BDC454a032e7f353416',
    decimals: 18,
    tokenType: TokenType.Erc20,
    symbol: TokenSymbolMap.OLAS,
  },
  /**
   * @warning USDC is a special case, it has 6 decimals, not 18.
   * @link https://basescan.org/token/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
   * @note When parsing or formatting units, use `decimals` (6) instead of the standard `ether` sizing (10^18).
   */
  [TokenSymbolMap.USDC]: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    tokenType: TokenType.Erc20,
    symbol: TokenSymbolMap.USDC,
  },
} as const;

export const MODE_TOKEN_CONFIG: ChainTokenConfig = {
  [TokenSymbolMap.ETH]: {
    tokenType: TokenType.NativeGas,
    decimals: 18,
    symbol: TokenSymbolMap.ETH,
  },
  [TokenSymbolMap.OLAS]: {
    address: '0xcfD1D50ce23C46D3Cf6407487B2F8934e96DC8f9',
    decimals: 18,
    tokenType: TokenType.Erc20,
    symbol: TokenSymbolMap.OLAS,
  },
  /**
   * @warning USDC is a special case, it has 6 decimals, not 18.
   * https://explorer.mode.network/address/0xd988097fb8612cc24eeC14542bC03424c656005f?tab=read_contract#313ce567
   * @note When parsing or formatting units, use `decimals` (6) instead of the standard `ether` sizing (10^18).
   */
  [TokenSymbolMap.USDC]: {
    address: '0xd988097fb8612cc24eeC14542bC03424c656005f',
    decimals: 6,
    tokenType: TokenType.Erc20,
    symbol: TokenSymbolMap.USDC,
  },
};

export const OPTIMISM_TOKEN_CONFIG: ChainTokenConfig = {
  [TokenSymbolMap.ETH]: {
    tokenType: TokenType.NativeGas,
    symbol: TokenSymbolMap.ETH,
    decimals: 18,
  },
  [TokenSymbolMap.OLAS]: {
    tokenType: TokenType.Erc20,
    symbol: TokenSymbolMap.OLAS,
    decimals: 18,
    address: '0xFC2E6e6BCbd49ccf3A5f029c79984372DcBFE527',
  },
  /**
   * @warning USDC is a special case, it has 6 decimals, not 18.
   * @link https://optimism.blockscout.com/address/0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85?tab=read_write_proxy&source_address=0xdEd3b9a8DBeDC2F9CB725B55d0E686A81E6d06dC#0x313ce567
   * @note When parsing or formatting units, use `decimals` (6) instead of the standard `ether` sizing (10^18).
   */
  [TokenSymbolMap.USDC]: {
    tokenType: TokenType.Erc20,
    symbol: TokenSymbolMap.USDC,
    decimals: 6,
    address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  },
};

export const POLYGON_TOKEN_CONFIG: ChainTokenConfig = {
  [TokenSymbolMap.POL]: {
    tokenType: TokenType.NativeGas,
    symbol: TokenSymbolMap.POL,
    decimals: 18,
  },
  [TokenSymbolMap.OLAS]: {
    tokenType: TokenType.Erc20,
    symbol: TokenSymbolMap.OLAS,
    decimals: 18,
    address: '0xFEF5d947472e72Efbb2E388c730B7428406F2F95',
  },
  [TokenSymbolMap.USDC]: {
    tokenType: TokenType.Erc20,
    symbol: TokenSymbolMap.USDC,
    decimals: 6,
    address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  },
  [TokenSymbolMap['USDC.e']]: {
    tokenType: TokenType.Erc20,
    symbol: TokenSymbolMap['USDC.e'],
    decimals: 6,
    address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  },
};

// TODO
// 1. combine EvmChainIdMap and AllEvmChainId into one thing to avoid confusion
// 2. include ethereum config into this and make it so balances are not requested for it
export const TOKEN_CONFIG: Record<EvmChainId, ChainTokenConfig> = {
  [EvmChainIdMap.Gnosis]: GNOSIS_TOKEN_CONFIG,
  [EvmChainIdMap.Base]: BASE_TOKEN_CONFIG,
  [EvmChainIdMap.Mode]: MODE_TOKEN_CONFIG,
  [EvmChainIdMap.Optimism]: OPTIMISM_TOKEN_CONFIG,
  [EvmChainIdMap.Polygon]: POLYGON_TOKEN_CONFIG,
} as const;

export const ALL_TOKEN_CONFIG: Record<AllEvmChainId, ChainTokenConfig> = {
  [AllEvmChainIdMap.Ethereum]: ETHEREUM_TOKEN_CONFIG,
  ...TOKEN_CONFIG,
} as const;

type ChainErc20TokenConfig = {
  [chainId in EvmChainId]: {
    [tokenSymbol: string]: Erc20TokenConfig;
  };
};
/**
 * @note This is a mapping of all ERC20 tokens on each chain.
 */
export const ERC20_TOKEN_CONFIG = Object.fromEntries(
  Object.entries(TOKEN_CONFIG).map(([chainId, chainTokenConfig]) => [
    +chainId as EvmChainId,
    Object.fromEntries(
      Object.entries(chainTokenConfig).filter(
        ([, tokenConfig]) => tokenConfig.tokenType === TokenType.Erc20,
      ),
    ),
  ]),
) as ChainErc20TokenConfig;

type ChainNativeTokenConfig = {
  [chainId in EvmChainId]: {
    [tokenSymbol: string]: NativeTokenConfig;
  };
};
/**
 * @note This is a mapping of all native tokens on each chain.
 */
export const NATIVE_TOKEN_CONFIG = Object.fromEntries(
  Object.entries(TOKEN_CONFIG).map(([chainId, chainTokenConfig]) => [
    +chainId as EvmChainId,
    Object.fromEntries(
      Object.entries(chainTokenConfig).filter(
        ([, tokenConfig]) => tokenConfig.tokenType === TokenType.NativeGas,
      ),
    ),
  ]),
) as ChainNativeTokenConfig;

export const getNativeTokenSymbol = (chainId: EvmChainId): TokenSymbol =>
  Object.keys(NATIVE_TOKEN_CONFIG[chainId])[0] as TokenSymbol;

export const getErc20s = (chainId: EvmChainId): Erc20TokenConfig[] =>
  Object.values(ERC20_TOKEN_CONFIG[chainId]);
