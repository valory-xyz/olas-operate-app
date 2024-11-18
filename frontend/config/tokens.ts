import { ChainId } from '@/enums/Chain';
import { TokenSymbol } from '@/enums/Token';
import { Address } from '@/types/Address';

export enum TokenType {
  NativeGas = 'native',
  Erc20 = 'erc20',
  Erc721 = 'erc721',
  // Erc1155 = 'erc1155',
  // UniswapV2Lp = 'v2lp',
  // UniswapV3Lp = 'v3lp',
}

export type Erc20TokenConfig = {
  address: Address;
  tokenType: TokenType.Erc20;
  decimals: number;
};

export type NativeTokenConfig = {
  address?: Address;
  tokenType: TokenType.NativeGas;
  decimals: number;
};

export type ChainTokenConfig = {
  [tokenSymbol: string]: Erc20TokenConfig | NativeTokenConfig;
};

export const GNOSIS_TOKEN_CONFIG: ChainTokenConfig = {
  [TokenSymbol.XDAI]: {
    address: '0x0001A500A6B18995B03f44bb040A5fFc28E45CB0',
    decimals: 18,
    tokenType: TokenType.NativeGas,
  },
  [TokenSymbol.OLAS]: {
    address: '0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f',
    decimals: 18,
    tokenType: TokenType.Erc20,
  },
};

export const OPTIMISM_TOKEN_CONFIG: ChainTokenConfig = {
  [TokenSymbol.ETH]: {
    tokenType: TokenType.NativeGas,
    decimals: 18,
  },
  [TokenSymbol.OLAS]: {
    address: '0xFC2E6e6BCbd49ccf3A5f029c79984372DcBFE527',
    decimals: 18,
    tokenType: TokenType.Erc20,
  },
} satisfies ChainTokenConfig;

export const ETHEREUM_TOKEN_CONFIG: ChainTokenConfig = {
  [TokenSymbol.ETH]: {
    tokenType: TokenType.NativeGas,
    decimals: 18,
  },
  [TokenSymbol.OLAS]: {
    address: '0x0001A500A6B18995B03f44bb040A5fFc28E45CB0',
    decimals: 18,
    tokenType: TokenType.Erc20,
  },
  /**
   * @warning USDC is a special case, it has 6 decimals, not 18.
   * https://etherscan.io/address/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48#readProxyContract#F11
   * @note When parsing or formatting units, use `decimals` (6) instead of the standard `ether` sizing (10^18).
   */
  [TokenSymbol.USDC]: {
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    decimals: 6,
    tokenType: TokenType.Erc20,
  },
};

export const BASE_TOKEN_CONFIG: ChainTokenConfig = {
  [TokenSymbol.ETH]: {
    tokenType: TokenType.NativeGas,
    decimals: 18,
  },
  [TokenSymbol.OLAS]: {
    address: '0x4B1a99467a284CC690e3237bc69105956816F762',
    decimals: 18,
    tokenType: TokenType.Erc20,
  },
};

export const TOKEN_CONFIG = {
  [ChainId.Gnosis]: GNOSIS_TOKEN_CONFIG,
  [ChainId.Optimism]: OPTIMISM_TOKEN_CONFIG,
  [ChainId.Ethereum]: ETHEREUM_TOKEN_CONFIG,
  [ChainId.Base]: BASE_TOKEN_CONFIG,
} as const;

/**
 * @note This is a mapping of all ERC20 tokens on each chain.
 */
export const ERC20_TOKEN_CONFIG = Object.fromEntries(
  Object.entries(TOKEN_CONFIG).map(([chainId, chainTokenConfig]) => [
    +chainId as ChainId,
    Object.fromEntries(
      Object.entries(chainTokenConfig).filter(
        ([, tokenConfig]) => tokenConfig.tokenType === TokenType.Erc20,
      ),
    ),
  ]),
) as {
  [chainId: number]: {
    [tokenSymbol: string]: Erc20TokenConfig;
  };
};

/**
 * @note This is a mapping of all native tokens on each chain.
 */
export const NATIVE_TOKEN_CONFIG = Object.fromEntries(
  Object.entries(TOKEN_CONFIG).map(([chainId, chainTokenConfig]) => [
    +chainId as ChainId,
    Object.fromEntries(
      Object.entries(chainTokenConfig).filter(
        ([, tokenConfig]) => tokenConfig.tokenType === TokenType.NativeGas,
      ),
    ),
  ]),
) as {
  [chainId: number]: {
    [tokenSymbol: string]: NativeTokenConfig;
  };
};
