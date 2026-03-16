/**
 * Tests for chain configuration data.
 *
 * `safeCreationThreshold` determines the minimum native token balance required
 * before the backend will attempt to create a Safe. Wrong thresholds cause:
 * - Too low → Safe creation attempted with insufficient funds → on-chain failure
 * - Too high → User told they need more funds than actually required
 *
 * These values must match what the middleware team specifies per chain.
 */

import { CHAIN_CONFIG } from '../../config/chains';
import { EvmChainIdMap, MiddlewareChainMap } from '../../constants/chains';

jest.mock(
  'ethers-multicall',
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../mocks/ethersMulticall').ethersMulticallMock,
);
// Break the circular dep: config/chains → @/utils → constants/index →
// constants/providers → config/chains (not yet initialized at require time).
jest.mock('../../constants/providers', () => ({ PROVIDERS: {} }));

describe('CHAIN_CONFIG', () => {
  it('has entries for exactly 5 supported EVM chains', () => {
    const supportedChainIds = Object.values(EvmChainIdMap);
    expect(Object.keys(CHAIN_CONFIG)).toHaveLength(supportedChainIds.length);
  });

  it('has an entry for every chain in EvmChainIdMap', () => {
    for (const chainId of Object.values(EvmChainIdMap)) {
      expect(CHAIN_CONFIG[chainId]).toBeDefined();
    }
  });

  describe('Gnosis (chain 100)', () => {
    const config = CHAIN_CONFIG[EvmChainIdMap.Gnosis];

    it('name is "Gnosis"', () => {
      expect(config.name).toBe('Gnosis');
    });

    it('evmChainId is 100', () => {
      expect(config.evmChainId).toBe(100);
    });

    it('middlewareChain is "gnosis"', () => {
      expect(config.middlewareChain).toBe(MiddlewareChainMap.GNOSIS);
    });

    it('nativeToken symbol is XDAI', () => {
      expect(config.nativeToken.symbol).toBe('XDAI');
    });

    it('safeCreationThreshold is 1.5 XDAI in wei', () => {
      // 1.5 * 10^18 = 1500000000000000000
      expect(config.safeCreationThreshold).toBe(BigInt('1500000000000000000'));
    });

    it('safeCreationThreshold is a bigint', () => {
      expect(typeof config.safeCreationThreshold).toBe('bigint');
    });
  });

  describe('Base (chain 8453)', () => {
    const config = CHAIN_CONFIG[EvmChainIdMap.Base];

    it('name is "Base"', () => {
      expect(config.name).toBe('Base');
    });

    it('evmChainId is 8453', () => {
      expect(config.evmChainId).toBe(8453);
    });

    it('middlewareChain is "base"', () => {
      expect(config.middlewareChain).toBe(MiddlewareChainMap.BASE);
    });

    it('nativeToken symbol is ETH', () => {
      expect(config.nativeToken.symbol).toBe('ETH');
    });

    it('safeCreationThreshold is 0.005 ETH in wei', () => {
      expect(config.safeCreationThreshold).toBe(BigInt('5000000000000000'));
    });
  });

  describe('Mode (chain 34443)', () => {
    const config = CHAIN_CONFIG[EvmChainIdMap.Mode];

    it('name is "Mode"', () => {
      expect(config.name).toBe('Mode');
    });

    it('evmChainId is 34443', () => {
      expect(config.evmChainId).toBe(34443);
    });

    it('middlewareChain is "mode"', () => {
      expect(config.middlewareChain).toBe(MiddlewareChainMap.MODE);
    });

    it('nativeToken symbol is ETH', () => {
      expect(config.nativeToken.symbol).toBe('ETH');
    });

    it('safeCreationThreshold is 0.0005 ETH in wei', () => {
      // Mode has the lowest threshold because gas fees are very cheap
      expect(config.safeCreationThreshold).toBe(BigInt('500000000000000'));
    });
  });

  describe('Optimism (chain 10)', () => {
    const config = CHAIN_CONFIG[EvmChainIdMap.Optimism];

    it('name is "Optimism"', () => {
      expect(config.name).toBe('Optimism');
    });

    it('evmChainId is 10', () => {
      expect(config.evmChainId).toBe(10);
    });

    it('middlewareChain is "optimism"', () => {
      expect(config.middlewareChain).toBe(MiddlewareChainMap.OPTIMISM);
    });

    it('nativeToken symbol is ETH', () => {
      expect(config.nativeToken.symbol).toBe('ETH');
    });

    it('safeCreationThreshold is 0.005 ETH in wei', () => {
      expect(config.safeCreationThreshold).toBe(BigInt('5000000000000000'));
    });
  });

  describe('Polygon (chain 137)', () => {
    const config = CHAIN_CONFIG[EvmChainIdMap.Polygon];

    it('name is "Polygon"', () => {
      expect(config.name).toBe('Polygon');
    });

    it('evmChainId is 137', () => {
      expect(config.evmChainId).toBe(137);
    });

    it('middlewareChain is "polygon"', () => {
      expect(config.middlewareChain).toBe(MiddlewareChainMap.POLYGON);
    });

    it('nativeToken symbol is POL', () => {
      expect(config.nativeToken.symbol).toBe('POL');
    });

    it('safeCreationThreshold is 16 POL in wei', () => {
      // Polygon has the highest threshold due to POL's lower USD value
      expect(config.safeCreationThreshold).toBe(BigInt('16000000000000000000'));
    });
  });

  describe('cross-chain consistency', () => {
    it('every chain config has a non-empty string name', () => {
      for (const config of Object.values(CHAIN_CONFIG)) {
        expect(typeof config.name).toBe('string');
        expect(config.name.length).toBeGreaterThan(0);
      }
    });

    it('every chain config safeCreationThreshold is a positive bigint', () => {
      for (const config of Object.values(CHAIN_CONFIG)) {
        expect(typeof config.safeCreationThreshold).toBe('bigint');
        expect(config.safeCreationThreshold).toBeGreaterThan(BigInt(0));
      }
    });

    it('evmChainId in each config matches the key it is stored under', () => {
      for (const [chainIdKey, config] of Object.entries(CHAIN_CONFIG)) {
        expect(config.evmChainId).toBe(Number(chainIdKey));
      }
    });

    it('Mode has a lower safeCreationThreshold than Base and Optimism (cheaper gas)', () => {
      expect(
        CHAIN_CONFIG[EvmChainIdMap.Mode].safeCreationThreshold,
      ).toBeLessThan(CHAIN_CONFIG[EvmChainIdMap.Base].safeCreationThreshold);
      expect(
        CHAIN_CONFIG[EvmChainIdMap.Mode].safeCreationThreshold,
      ).toBeLessThan(
        CHAIN_CONFIG[EvmChainIdMap.Optimism].safeCreationThreshold,
      );
    });
  });
});
