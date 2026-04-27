/**
 * Tests for token configuration data and helper functions.
 *
 * Critical data integrity rules:
 * - USDC and USDC.e always have 6 decimals (NOT 18). Using 18 causes 10^12x
 *   over/under-estimates in all funding calculations.
 * - OLAS always has 18 decimals.
 * - Every supported EVM chain must have a native token and an OLAS entry.
 * - getNativeTokenSymbol and getErc20s are utility functions used throughout
 *   balance hooks and funding requirement calculations.
 */

import {
  ERC20_TOKEN_CONFIG,
  getErc20s,
  getNativeTokenSymbol,
  GNOSIS_TOKEN_CONFIG,
  NATIVE_TOKEN_CONFIG,
  TOKEN_CONFIG,
  TokenSymbolMap,
  TokenType,
} from '../../config/tokens';
import { EvmChainIdMap } from '../../constants/chains';

jest.mock(
  'ethers-multicall',
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../mocks/ethersMulticall').ethersMulticallMock,
);

// Helper: valid EIP-55 checksummed Ethereum address pattern
const EVM_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

describe('TokenSymbolMap', () => {
  it('defines ETH, OLAS, USDC, XDAI, WXDAI, POL, USDC.e, and pUSD', () => {
    expect(TokenSymbolMap.ETH).toBe('ETH');
    expect(TokenSymbolMap.OLAS).toBe('OLAS');
    expect(TokenSymbolMap.USDC).toBe('USDC');
    expect(TokenSymbolMap.XDAI).toBe('XDAI');
    expect(TokenSymbolMap.WXDAI).toBe('WXDAI');
    expect(TokenSymbolMap.POL).toBe('POL');
    expect(TokenSymbolMap['USDC.e']).toBe('USDC.e');
    expect(TokenSymbolMap.pUSD).toBe('pUSD');
  });

  it('covers exactly 8 token symbols', () => {
    expect(Object.keys(TokenSymbolMap)).toHaveLength(8);
  });
});

describe('TokenType enum', () => {
  it('NativeGas is "native"', () => {
    expect(TokenType.NativeGas).toBe('native');
  });

  it('Erc20 is "erc20"', () => {
    expect(TokenType.Erc20).toBe('erc20');
  });

  it('Erc721 is "erc721"', () => {
    expect(TokenType.Erc721).toBe('erc721');
  });

  it('Wrapped is "wrapped"', () => {
    expect(TokenType.Wrapped).toBe('wrapped');
  });
});

describe('GNOSIS_TOKEN_CONFIG', () => {
  it('XDAI is the native gas token on Gnosis', () => {
    const xdai = GNOSIS_TOKEN_CONFIG[TokenSymbolMap.XDAI];
    expect(xdai?.tokenType).toBe(TokenType.NativeGas);
    expect(xdai?.decimals).toBe(18);
    expect(xdai?.symbol).toBe('XDAI');
  });

  it('OLAS on Gnosis has 18 decimals and a valid contract address', () => {
    const olas = GNOSIS_TOKEN_CONFIG[TokenSymbolMap.OLAS];
    expect(olas?.decimals).toBe(18);
    expect(olas?.tokenType).toBe(TokenType.Erc20);
    expect((olas as { address?: string })?.address).toMatch(
      EVM_ADDRESS_PATTERN,
    );
  });

  it('OLAS on Gnosis address is 0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f', () => {
    const olas = GNOSIS_TOKEN_CONFIG[TokenSymbolMap.OLAS] as {
      address: string;
    };
    expect(olas.address).toBe('0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f');
  });

  it('WXDAI on Gnosis is a wrapped token with 18 decimals', () => {
    const wxdai = GNOSIS_TOKEN_CONFIG[TokenSymbolMap.WXDAI];
    expect(wxdai?.tokenType).toBe(TokenType.Wrapped);
    expect(wxdai?.decimals).toBe(18);
    expect((wxdai as { address?: string })?.address).toMatch(
      EVM_ADDRESS_PATTERN,
    );
  });

  it('USDC.e on Gnosis has 6 decimals — NOT 18 (critical: bridged USDC is 6 decimals)', () => {
    // This is explicitly documented in the source as a warning — USDC.e on
    // Gnosis uses 6 decimals. Using 18 decimals for formatting would cause
    // a 10^12 error in funding calculations.
    const usdce = GNOSIS_TOKEN_CONFIG[TokenSymbolMap['USDC.e']];
    expect(usdce?.decimals).toBe(6);
    expect(usdce?.tokenType).toBe(TokenType.Erc20);
  });

  it('USDC.e address on Gnosis is 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0', () => {
    const usdce = GNOSIS_TOKEN_CONFIG[TokenSymbolMap['USDC.e']] as {
      address: string;
    };
    expect(usdce.address).toBe('0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0');
  });
});

describe('TOKEN_CONFIG — per-chain data integrity', () => {
  it('has entries for all 5 supported EVM chains', () => {
    const supportedChainIds = Object.values(EvmChainIdMap);
    for (const chainId of supportedChainIds) {
      expect(TOKEN_CONFIG[chainId]).toBeDefined();
    }
  });

  it('every chain has an OLAS token entry', () => {
    for (const chainId of Object.values(EvmChainIdMap)) {
      const chainConfig = TOKEN_CONFIG[chainId];
      expect(chainConfig[TokenSymbolMap.OLAS]).toBeDefined();
    }
  });

  it('OLAS always has 18 decimals on every chain', () => {
    for (const chainId of Object.values(EvmChainIdMap)) {
      const olas = TOKEN_CONFIG[chainId][TokenSymbolMap.OLAS];
      expect(olas?.decimals).toBe(18);
    }
  });

  it('OLAS is always an ERC20 token (not native) on every chain', () => {
    for (const chainId of Object.values(EvmChainIdMap)) {
      const olas = TOKEN_CONFIG[chainId][TokenSymbolMap.OLAS];
      expect(olas?.tokenType).toBe(TokenType.Erc20);
    }
  });

  it('OLAS has a non-zero contract address on every chain', () => {
    for (const chainId of Object.values(EvmChainIdMap)) {
      const olas = TOKEN_CONFIG[chainId][TokenSymbolMap.OLAS] as {
        address: string;
      };
      expect(olas.address).toMatch(EVM_ADDRESS_PATTERN);
      // Must not be the zero address
      expect(olas.address).not.toBe(
        '0x0000000000000000000000000000000000000000',
      );
    }
  });

  it('USDC has 6 decimals on chains where it exists (NOT 18)', () => {
    // USDC on all chains is 6 decimals. This is a known footgun — devs
    // sometimes assume 18.
    const chainsWithUsdc = [
      EvmChainIdMap.Base,
      EvmChainIdMap.Mode,
      EvmChainIdMap.Optimism,
      EvmChainIdMap.Polygon,
    ];
    for (const chainId of chainsWithUsdc) {
      const usdc = TOKEN_CONFIG[chainId][TokenSymbolMap.USDC];
      expect(usdc?.decimals).toBe(6);
    }
  });

  describe('Gnosis (chain 100)', () => {
    it('XDAI is the native token', () => {
      const xdai = TOKEN_CONFIG[EvmChainIdMap.Gnosis][TokenSymbolMap.XDAI];
      expect(xdai?.tokenType).toBe(TokenType.NativeGas);
    });
  });

  describe('Base (chain 8453)', () => {
    it('ETH is the native token', () => {
      const eth = TOKEN_CONFIG[EvmChainIdMap.Base][TokenSymbolMap.ETH];
      expect(eth?.tokenType).toBe(TokenType.NativeGas);
    });

    it('OLAS address on Base is 0x54330d28ca3357F294334BDC454a032e7f353416', () => {
      const olas = TOKEN_CONFIG[EvmChainIdMap.Base][TokenSymbolMap.OLAS] as {
        address: string;
      };
      expect(olas.address).toBe('0x54330d28ca3357F294334BDC454a032e7f353416');
    });

    it('USDC on Base is 6 decimals (not 18)', () => {
      expect(
        TOKEN_CONFIG[EvmChainIdMap.Base][TokenSymbolMap.USDC]?.decimals,
      ).toBe(6);
    });
  });

  describe('Mode (chain 34443)', () => {
    it('ETH is the native token', () => {
      const eth = TOKEN_CONFIG[EvmChainIdMap.Mode][TokenSymbolMap.ETH];
      expect(eth?.tokenType).toBe(TokenType.NativeGas);
    });

    it('USDC on Mode is 6 decimals (not 18)', () => {
      expect(
        TOKEN_CONFIG[EvmChainIdMap.Mode][TokenSymbolMap.USDC]?.decimals,
      ).toBe(6);
    });
  });

  describe('Optimism (chain 10)', () => {
    it('ETH is the native token', () => {
      const eth = TOKEN_CONFIG[EvmChainIdMap.Optimism][TokenSymbolMap.ETH];
      expect(eth?.tokenType).toBe(TokenType.NativeGas);
    });

    it('USDC on Optimism is 6 decimals (not 18)', () => {
      expect(
        TOKEN_CONFIG[EvmChainIdMap.Optimism][TokenSymbolMap.USDC]?.decimals,
      ).toBe(6);
    });
  });

  describe('Polygon (chain 137)', () => {
    it('POL is the native token', () => {
      const pol = TOKEN_CONFIG[EvmChainIdMap.Polygon][TokenSymbolMap.POL];
      expect(pol?.tokenType).toBe(TokenType.NativeGas);
    });

    it('USDC on Polygon is 6 decimals (not 18)', () => {
      expect(
        TOKEN_CONFIG[EvmChainIdMap.Polygon][TokenSymbolMap.USDC]?.decimals,
      ).toBe(6);
    });

    it('USDC.e on Polygon is 6 decimals (not 18)', () => {
      expect(
        TOKEN_CONFIG[EvmChainIdMap.Polygon][TokenSymbolMap['USDC.e']]?.decimals,
      ).toBe(6);
    });

    it('pUSD on Polygon has address 0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB', () => {
      const pusd = TOKEN_CONFIG[EvmChainIdMap.Polygon][TokenSymbolMap.pUSD] as {
        address: string;
      };
      expect(pusd?.address).toBe('0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB');
    });

    it('pUSD on Polygon is 6 decimals (not 18)', () => {
      expect(
        TOKEN_CONFIG[EvmChainIdMap.Polygon][TokenSymbolMap.pUSD]?.decimals,
      ).toBe(6);
    });

    it('pUSD on Polygon is an ERC20 token', () => {
      expect(
        TOKEN_CONFIG[EvmChainIdMap.Polygon][TokenSymbolMap.pUSD]?.tokenType,
      ).toBe(TokenType.Erc20);
    });
  });
});

describe('NATIVE_TOKEN_CONFIG', () => {
  it('contains exactly one native token per chain', () => {
    for (const chainId of Object.values(EvmChainIdMap)) {
      const nativeTokens = Object.keys(NATIVE_TOKEN_CONFIG[chainId]);
      expect(nativeTokens).toHaveLength(1);
    }
  });

  it('Gnosis native token is XDAI', () => {
    const nativeTokens = Object.keys(NATIVE_TOKEN_CONFIG[EvmChainIdMap.Gnosis]);
    expect(nativeTokens[0]).toBe(TokenSymbolMap.XDAI);
  });

  it('Base native token is ETH', () => {
    const nativeTokens = Object.keys(NATIVE_TOKEN_CONFIG[EvmChainIdMap.Base]);
    expect(nativeTokens[0]).toBe(TokenSymbolMap.ETH);
  });

  it('Mode native token is ETH', () => {
    const nativeTokens = Object.keys(NATIVE_TOKEN_CONFIG[EvmChainIdMap.Mode]);
    expect(nativeTokens[0]).toBe(TokenSymbolMap.ETH);
  });

  it('Optimism native token is ETH', () => {
    const nativeTokens = Object.keys(
      NATIVE_TOKEN_CONFIG[EvmChainIdMap.Optimism],
    );
    expect(nativeTokens[0]).toBe(TokenSymbolMap.ETH);
  });

  it('Polygon native token is POL', () => {
    const nativeTokens = Object.keys(
      NATIVE_TOKEN_CONFIG[EvmChainIdMap.Polygon],
    );
    expect(nativeTokens[0]).toBe(TokenSymbolMap.POL);
  });
});

describe('ERC20_TOKEN_CONFIG', () => {
  it('excludes native tokens from every chain', () => {
    for (const chainId of Object.values(EvmChainIdMap)) {
      const erc20Tokens = Object.values(ERC20_TOKEN_CONFIG[chainId]);
      for (const token of erc20Tokens) {
        expect(token.tokenType).not.toBe(TokenType.NativeGas);
      }
    }
  });

  it('OLAS is in the ERC20 map for every chain', () => {
    for (const chainId of Object.values(EvmChainIdMap)) {
      expect(ERC20_TOKEN_CONFIG[chainId][TokenSymbolMap.OLAS]).toBeDefined();
    }
  });

  it('all ERC20 entries have an address property', () => {
    for (const chainId of Object.values(EvmChainIdMap)) {
      for (const token of Object.values(ERC20_TOKEN_CONFIG[chainId])) {
        expect(token.address).toMatch(EVM_ADDRESS_PATTERN);
      }
    }
  });
});

describe('getNativeTokenSymbol', () => {
  it('returns XDAI for Gnosis', () => {
    expect(getNativeTokenSymbol(EvmChainIdMap.Gnosis)).toBe(
      TokenSymbolMap.XDAI,
    );
  });

  it('returns ETH for Base', () => {
    expect(getNativeTokenSymbol(EvmChainIdMap.Base)).toBe(TokenSymbolMap.ETH);
  });

  it('returns ETH for Mode', () => {
    expect(getNativeTokenSymbol(EvmChainIdMap.Mode)).toBe(TokenSymbolMap.ETH);
  });

  it('returns ETH for Optimism', () => {
    expect(getNativeTokenSymbol(EvmChainIdMap.Optimism)).toBe(
      TokenSymbolMap.ETH,
    );
  });

  it('returns POL for Polygon', () => {
    expect(getNativeTokenSymbol(EvmChainIdMap.Polygon)).toBe(
      TokenSymbolMap.POL,
    );
  });
});

describe('getErc20s', () => {
  it('returns only ERC20 tokens (not native or wrapped) for each chain', () => {
    for (const chainId of Object.values(EvmChainIdMap)) {
      const erc20s = getErc20s(chainId);
      for (const token of erc20s) {
        expect(token.tokenType).toBe(TokenType.Erc20);
      }
    }
  });

  it('all returned tokens have a non-empty address', () => {
    for (const chainId of Object.values(EvmChainIdMap)) {
      for (const token of getErc20s(chainId)) {
        expect(token.address).toMatch(EVM_ADDRESS_PATTERN);
      }
    }
  });

  it('includes OLAS for every chain', () => {
    for (const chainId of Object.values(EvmChainIdMap)) {
      const erc20s = getErc20s(chainId);
      const symbols = erc20s.map((t) => t.symbol);
      expect(symbols).toContain(TokenSymbolMap.OLAS);
    }
  });

  it('does NOT include native tokens (XDAI, ETH, POL)', () => {
    const nativeSymbols = [
      TokenSymbolMap.XDAI,
      TokenSymbolMap.ETH,
      TokenSymbolMap.POL,
    ];
    for (const chainId of Object.values(EvmChainIdMap)) {
      const symbols = getErc20s(chainId).map((t) => t.symbol);
      for (const nativeSymbol of nativeSymbols) {
        expect(symbols).not.toContain(nativeSymbol);
      }
    }
  });

  it('does NOT include WXDAI (wrapped, not ERC20)', () => {
    const gnosis = getErc20s(EvmChainIdMap.Gnosis);
    const symbols = gnosis.map((t) => t.symbol);
    expect(symbols).not.toContain(TokenSymbolMap.WXDAI);
  });
});
