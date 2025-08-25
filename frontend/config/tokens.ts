import { EvmChainId } from '@/enums/Chain';
import { TokenSymbol } from '@/enums/Token';
import { Address } from '@/types/Address';

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

export type ChainTokenConfig = {
  [tokenSymbol: string]: TokenConfig; // TODO: tokenSymbol should be TokenSymbol
};

export const ETHEREUM_TOKEN_CONFIG: ChainTokenConfig = {
  [TokenSymbol.ETH]: {
    tokenType: TokenType.NativeGas,
    decimals: 18,
    symbol: TokenSymbol.ETH,
  },
  [TokenSymbol.OLAS]: {
    address: '0x0001A500A6B18995B03f44bb040A5fFc28E45CB0',
    decimals: 18,
    tokenType: TokenType.Erc20,
    symbol: TokenSymbol.OLAS,
  },
  [TokenSymbol.USDC]: {
    address: '0xA0b86991c6218b36c1d19D4a2e9EB0CE3606EB48',
    decimals: 6,
    tokenType: TokenType.Erc20,
    symbol: TokenSymbol.USDC,
  },
} as const;

const GNOSIS_TOKEN_CONFIG: ChainTokenConfig = {
  [TokenSymbol.XDAI]: {
    decimals: 18,
    tokenType: TokenType.NativeGas,
    symbol: TokenSymbol.XDAI,
  },
  [TokenSymbol.OLAS]: {
    address: '0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f',
    decimals: 18,
    tokenType: TokenType.Erc20,
    symbol: TokenSymbol.OLAS,
  },
  [TokenSymbol.WXDAI]: {
    address: '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d',
    decimals: 18,
    tokenType: TokenType.Wrapped,
    symbol: TokenSymbol.WXDAI,
  },
} as const;

const BASE_TOKEN_CONFIG: ChainTokenConfig = {
  [TokenSymbol.ETH]: {
    tokenType: TokenType.NativeGas,
    decimals: 18,
    symbol: TokenSymbol.ETH,
  },
  [TokenSymbol.OLAS]: {
    address: '0x54330d28ca3357F294334BDC454a032e7f353416',
    decimals: 18,
    tokenType: TokenType.Erc20,
    symbol: TokenSymbol.OLAS,
  },
} as const;

export const MODE_TOKEN_CONFIG: ChainTokenConfig = {
  [TokenSymbol.ETH]: {
    tokenType: TokenType.NativeGas,
    decimals: 18,
    symbol: TokenSymbol.ETH,
  },
  [TokenSymbol.OLAS]: {
    address: '0xcfD1D50ce23C46D3Cf6407487B2F8934e96DC8f9',
    decimals: 18,
    tokenType: TokenType.Erc20,
    symbol: TokenSymbol.OLAS,
  },
  /**
   * @warning USDC is a special case, it has 6 decimals, not 18.
   * https://explorer.mode.network/address/0xd988097fb8612cc24eeC14542bC03424c656005f?tab=read_contract#313ce567
   * @note When parsing or formatting units, use `decimals` (6) instead of the standard `ether` sizing (10^18).
   */
  [TokenSymbol.USDC]: {
    address: '0xd988097fb8612cc24eeC14542bC03424c656005f',
    decimals: 6,
    tokenType: TokenType.Erc20,
    symbol: TokenSymbol.USDC,
  },
};

export const OPTIMISM_TOKEN_CONFIG: ChainTokenConfig = {
  [TokenSymbol.ETH]: {
    tokenType: TokenType.NativeGas,
    symbol: TokenSymbol.ETH,
    decimals: 18,
  },
  [TokenSymbol.OLAS]: {
    tokenType: TokenType.Erc20,
    symbol: TokenSymbol.OLAS,
    decimals: 18,
    address: '0xFC2E6e6BCbd49ccf3A5f029c79984372DcBFE527',
  },
  /**
   * @warning USDC is a special case, it has 6 decimals, not 18.
   * @link https://optimism.blockscout.com/address/0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85?tab=read_write_proxy&source_address=0xdEd3b9a8DBeDC2F9CB725B55d0E686A81E6d06dC#0x313ce567
   * @note When parsing or formatting units, use `decimals` (6) instead of the standard `ether` sizing (10^18).
   */
  [TokenSymbol.USDC]: {
    tokenType: TokenType.Erc20,
    symbol: TokenSymbol.USDC,
    decimals: 6,
    address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  },
};

/**
 * TODO:
 * 1. combine EvmChainId and AllEvmChainId into one thing to avoid confusion
 * 2. include ethereum config into this and make it so balances are not requested for it
 */
export const TOKEN_CONFIG: Record<EvmChainId, ChainTokenConfig> = {
  [EvmChainId.Gnosis]: GNOSIS_TOKEN_CONFIG,
  [EvmChainId.Base]: BASE_TOKEN_CONFIG,
  [EvmChainId.Mode]: MODE_TOKEN_CONFIG,
  [EvmChainId.Optimism]: OPTIMISM_TOKEN_CONFIG,
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
