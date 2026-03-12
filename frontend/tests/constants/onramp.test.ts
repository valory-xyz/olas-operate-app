/**
 * Tests for on-ramp chain routing constants.
 *
 * ON_RAMP_CHAIN_MAP determines which EVM chain and crypto currency the user
 * buys when on-ramping for a given agent home chain. Wrong entries here cause
 * users to receive funds on the wrong chain — a critical user-facing bug.
 *
 * Key design rule: Gnosis and Mode agents both on-ramp via Optimism/Base ETH
 * (not their home chain), because Gnosis/Mode don't support direct fiat on-ramps.
 */

import {
  EvmChainIdMap,
  SupportedMiddlewareChainMap,
} from '../../constants/chains';
import { MIN_ONRAMP_AMOUNT, ON_RAMP_CHAIN_MAP } from '../../constants/onramp';

describe('MIN_ONRAMP_AMOUNT', () => {
  it('is set to 5 USD', () => {
    expect(MIN_ONRAMP_AMOUNT).toBe(5);
  });

  it('is a positive number', () => {
    expect(MIN_ONRAMP_AMOUNT).toBeGreaterThan(0);
  });
});

describe('ON_RAMP_CHAIN_MAP', () => {
  it('covers all 5 supported middleware chains', () => {
    const supportedChains = Object.values(SupportedMiddlewareChainMap);
    for (const chain of supportedChains) {
      expect(ON_RAMP_CHAIN_MAP[chain]).toBeDefined();
    }
  });

  it('covers exactly 5 entries — one per supported middleware chain', () => {
    expect(Object.keys(ON_RAMP_CHAIN_MAP)).toHaveLength(5);
  });

  describe('gnosis chain routing', () => {
    it('routes gnosis agents to Base for on-ramp (gnosis has no direct fiat ramp)', () => {
      expect(ON_RAMP_CHAIN_MAP[SupportedMiddlewareChainMap.gnosis].chain).toBe(
        EvmChainIdMap.Base,
      );
    });

    it('uses ETH as the crypto currency for gnosis on-ramp', () => {
      expect(
        ON_RAMP_CHAIN_MAP[SupportedMiddlewareChainMap.gnosis].cryptoCurrency,
      ).toBe('ETH');
    });
  });

  describe('optimism chain routing', () => {
    it('routes optimism agents to Optimism for on-ramp', () => {
      expect(
        ON_RAMP_CHAIN_MAP[SupportedMiddlewareChainMap.optimism].chain,
      ).toBe(EvmChainIdMap.Optimism);
    });

    it('uses ETH as the crypto currency for optimism on-ramp', () => {
      expect(
        ON_RAMP_CHAIN_MAP[SupportedMiddlewareChainMap.optimism].cryptoCurrency,
      ).toBe('ETH');
    });
  });

  describe('base chain routing', () => {
    it('routes base agents to Base for on-ramp', () => {
      expect(ON_RAMP_CHAIN_MAP[SupportedMiddlewareChainMap.base].chain).toBe(
        EvmChainIdMap.Base,
      );
    });

    it('uses ETH as the crypto currency for base on-ramp', () => {
      expect(
        ON_RAMP_CHAIN_MAP[SupportedMiddlewareChainMap.base].cryptoCurrency,
      ).toBe('ETH');
    });
  });

  describe('mode chain routing', () => {
    it('routes mode agents to Optimism for on-ramp (mode has no direct fiat ramp)', () => {
      // Mode agents on-ramp via Optimism, then bridge to Mode
      expect(ON_RAMP_CHAIN_MAP[SupportedMiddlewareChainMap.mode].chain).toBe(
        EvmChainIdMap.Optimism,
      );
    });

    it('uses ETH as the crypto currency for mode on-ramp', () => {
      expect(
        ON_RAMP_CHAIN_MAP[SupportedMiddlewareChainMap.mode].cryptoCurrency,
      ).toBe('ETH');
    });
  });

  describe('polygon chain routing', () => {
    it('routes polygon agents to Polygon for on-ramp', () => {
      expect(ON_RAMP_CHAIN_MAP[SupportedMiddlewareChainMap.polygon].chain).toBe(
        EvmChainIdMap.Polygon,
      );
    });

    it('uses POL as the crypto currency for polygon on-ramp (not ETH)', () => {
      // Polygon uses its own native token POL, not ETH
      expect(
        ON_RAMP_CHAIN_MAP[SupportedMiddlewareChainMap.polygon].cryptoCurrency,
      ).toBe('POL');
    });
  });

  it('each entry has exactly the required shape: chain and cryptoCurrency', () => {
    for (const [, entry] of Object.entries(ON_RAMP_CHAIN_MAP)) {
      expect(typeof entry.chain).toBe('number');
      expect(['ETH', 'POL']).toContain(entry.cryptoCurrency);
    }
  });
});
