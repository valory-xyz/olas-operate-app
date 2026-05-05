/**
 * Tests for chain ID constants.
 *
 * Incorrect chain IDs or middleware chain name mismatches cause the frontend
 * to send requests to the wrong network or fail to look up chain configs.
 * These tests pin the exact values so a stray typo is caught immediately.
 */

import {
  AllEvmChainIdMap,
  CHAIN_IMAGE_MAP,
  EvmChainIdMap,
  EvmChainName,
  MiddlewareChainMap,
  SupportedMiddlewareChainMap,
} from '../../constants/chains';

describe('EvmChainIdMap', () => {
  it('maps Gnosis to chain ID 100', () => {
    expect(EvmChainIdMap.Gnosis).toBe(100);
  });

  it('maps Base to chain ID 8453', () => {
    expect(EvmChainIdMap.Base).toBe(8453);
  });

  it('maps Mode to chain ID 34443', () => {
    expect(EvmChainIdMap.Mode).toBe(34443);
  });

  it('maps Optimism to chain ID 10', () => {
    expect(EvmChainIdMap.Optimism).toBe(10);
  });

  it('maps Polygon to chain ID 137', () => {
    expect(EvmChainIdMap.Polygon).toBe(137);
  });

  it('covers exactly 5 supported chains', () => {
    expect(Object.keys(EvmChainIdMap)).toHaveLength(5);
  });

  it('has no duplicate chain IDs', () => {
    const ids = Object.values(EvmChainIdMap);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe('EvmChainName', () => {
  it('resolves chain ID 100 to "Gnosis"', () => {
    expect(EvmChainName[100]).toBe('Gnosis');
  });

  it('resolves chain ID 8453 to "Base"', () => {
    expect(EvmChainName[8453]).toBe('Base');
  });

  it('resolves chain ID 34443 to "Mode"', () => {
    expect(EvmChainName[34443]).toBe('Mode');
  });

  it('resolves chain ID 10 to "Optimism"', () => {
    expect(EvmChainName[10]).toBe('Optimism');
  });

  it('resolves chain ID 137 to "Polygon"', () => {
    expect(EvmChainName[137]).toBe('Polygon');
  });

  it('covers exactly 5 entries (one per supported EVM chain)', () => {
    expect(Object.keys(EvmChainName)).toHaveLength(5);
  });

  it('is consistent with EvmChainIdMap (every chain ID has a name)', () => {
    for (const [chainName, chainId] of Object.entries(EvmChainIdMap)) {
      expect(EvmChainName[chainId as keyof typeof EvmChainName]).toBe(
        chainName,
      );
    }
  });
});

describe('AllEvmChainIdMap', () => {
  it('includes Ethereum with chain ID 1', () => {
    expect(AllEvmChainIdMap.Ethereum).toBe(1);
  });

  it('includes all chains from EvmChainIdMap with the same IDs', () => {
    for (const [chainName, chainId] of Object.entries(EvmChainIdMap)) {
      expect(AllEvmChainIdMap[chainName as keyof typeof AllEvmChainIdMap]).toBe(
        chainId,
      );
    }
  });

  it('covers exactly 6 entries (Ethereum + 5 supported EVM chains)', () => {
    expect(Object.keys(AllEvmChainIdMap)).toHaveLength(6);
  });
});

describe('MiddlewareChainMap', () => {
  it('uses lowercase open-autonomy internal chain names', () => {
    expect(MiddlewareChainMap.ETHEREUM).toBe('ethereum');
    expect(MiddlewareChainMap.GOERLI).toBe('goerli');
    expect(MiddlewareChainMap.GNOSIS).toBe('gnosis');
    expect(MiddlewareChainMap.SOLANA).toBe('solana');
    expect(MiddlewareChainMap.OPTIMISM).toBe('optimism');
    expect(MiddlewareChainMap.BASE).toBe('base');
    expect(MiddlewareChainMap.MODE).toBe('mode');
    expect(MiddlewareChainMap.POLYGON).toBe('polygon');
  });

  it('covers 8 middleware chains', () => {
    expect(Object.keys(MiddlewareChainMap)).toHaveLength(8);
  });

  it('has no duplicate string values', () => {
    const values = Object.values(MiddlewareChainMap);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

describe('SupportedMiddlewareChainMap', () => {
  it('maps gnosis key to "gnosis" value', () => {
    expect(SupportedMiddlewareChainMap.gnosis).toBe('gnosis');
  });

  it('maps optimism key to "optimism" value', () => {
    expect(SupportedMiddlewareChainMap.optimism).toBe('optimism');
  });

  it('maps base key to "base" value', () => {
    expect(SupportedMiddlewareChainMap.base).toBe('base');
  });

  it('maps mode key to "mode" value', () => {
    expect(SupportedMiddlewareChainMap.mode).toBe('mode');
  });

  it('maps polygon key to "polygon" value', () => {
    expect(SupportedMiddlewareChainMap.polygon).toBe('polygon');
  });

  it('covers exactly 5 agent-supported chains (excludes ethereum, goerli, solana)', () => {
    expect(Object.keys(SupportedMiddlewareChainMap)).toHaveLength(5);
  });

  it('every value is also present in MiddlewareChainMap', () => {
    const middlewareValues = new Set(Object.values(MiddlewareChainMap));
    for (const value of Object.values(SupportedMiddlewareChainMap)) {
      expect(middlewareValues.has(value)).toBe(true);
    }
  });
});

describe('CHAIN_IMAGE_MAP', () => {
  it('provides an image path for every AllEvmChainId entry', () => {
    for (const chainId of Object.values(AllEvmChainIdMap)) {
      expect(
        CHAIN_IMAGE_MAP[chainId as keyof typeof CHAIN_IMAGE_MAP],
      ).toBeDefined();
    }
  });

  it('uses valid relative web path format for every image', () => {
    for (const imagePath of Object.values(CHAIN_IMAGE_MAP)) {
      expect(imagePath).toMatch(/^\/chains\/.*-chain\.png$/);
    }
  });

  it('assigns distinct image paths to each chain', () => {
    const paths = Object.values(CHAIN_IMAGE_MAP);
    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });
});
