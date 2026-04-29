/**
 * Tests for on-ramp chain routing constants.
 *
 * ON_RAMP_CHAIN_MAP determines which EVM chain and MoonPay currency the user
 * buys when on-ramping for a given agent home chain. Wrong entries here cause
 * users to receive funds on the wrong chain — a critical user-facing bug.
 *
 * Key design rule (post-OPE-1628): Gnosis, Optimism and Base agents all on-ramp
 * via Base ETH; Polygon agents on-ramp directly to POL on Polygon. Mode is no
 * longer supported (Modius on-ramp feature flag is disabled in
 * useFeatureFlag.ts).
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
  it('covers gnosis, optimism, base, and polygon — but NOT mode', () => {
    const expected = [
      SupportedMiddlewareChainMap.gnosis,
      SupportedMiddlewareChainMap.optimism,
      SupportedMiddlewareChainMap.base,
      SupportedMiddlewareChainMap.polygon,
    ];
    for (const chain of expected) {
      expect(ON_RAMP_CHAIN_MAP[chain]).toBeDefined();
    }
    expect(ON_RAMP_CHAIN_MAP[SupportedMiddlewareChainMap.mode]).toBeUndefined();
  });

  it('has exactly 4 entries (mode excluded)', () => {
    expect(Object.keys(ON_RAMP_CHAIN_MAP)).toHaveLength(4);
  });

  describe('gnosis chain routing', () => {
    it('routes gnosis agents to Base for on-ramp (gnosis has no direct fiat ramp)', () => {
      expect(ON_RAMP_CHAIN_MAP[SupportedMiddlewareChainMap.gnosis]?.chain).toBe(
        EvmChainIdMap.Base,
      );
    });

    it('uses eth_base as the MoonPay currency code for gnosis on-ramp', () => {
      expect(
        ON_RAMP_CHAIN_MAP[SupportedMiddlewareChainMap.gnosis]
          ?.moonpayCurrencyCode,
      ).toBe('eth_base');
    });
  });

  describe('optimism chain routing', () => {
    it('routes optimism agents to Base for on-ramp (Relay bridges Base→Optimism)', () => {
      expect(
        ON_RAMP_CHAIN_MAP[SupportedMiddlewareChainMap.optimism]?.chain,
      ).toBe(EvmChainIdMap.Base);
    });

    it('uses eth_base as the MoonPay currency code for optimism on-ramp', () => {
      expect(
        ON_RAMP_CHAIN_MAP[SupportedMiddlewareChainMap.optimism]
          ?.moonpayCurrencyCode,
      ).toBe('eth_base');
    });
  });

  describe('base chain routing', () => {
    it('routes base agents to Base for on-ramp', () => {
      expect(ON_RAMP_CHAIN_MAP[SupportedMiddlewareChainMap.base]?.chain).toBe(
        EvmChainIdMap.Base,
      );
    });

    it('uses eth_base as the MoonPay currency code for base on-ramp', () => {
      expect(
        ON_RAMP_CHAIN_MAP[SupportedMiddlewareChainMap.base]
          ?.moonpayCurrencyCode,
      ).toBe('eth_base');
    });
  });

  describe('mode chain routing', () => {
    it('is no longer supported — Modius on-ramp feature flag handles disablement', () => {
      expect(
        ON_RAMP_CHAIN_MAP[SupportedMiddlewareChainMap.mode],
      ).toBeUndefined();
    });
  });

  describe('polygon chain routing', () => {
    it('routes polygon agents to Polygon for on-ramp', () => {
      expect(
        ON_RAMP_CHAIN_MAP[SupportedMiddlewareChainMap.polygon]?.chain,
      ).toBe(EvmChainIdMap.Polygon);
    });

    it('uses pol as the MoonPay currency code for polygon on-ramp (not eth_base)', () => {
      expect(
        ON_RAMP_CHAIN_MAP[SupportedMiddlewareChainMap.polygon]
          ?.moonpayCurrencyCode,
      ).toBe('pol');
    });
  });

  it('each entry has exactly the required shape: chain and moonpayCurrencyCode', () => {
    for (const [, entry] of Object.entries(ON_RAMP_CHAIN_MAP)) {
      if (!entry) continue;
      expect(typeof entry.chain).toBe('number');
      expect(['eth_base', 'pol']).toContain(entry.moonpayCurrencyCode);
    }
  });
});
