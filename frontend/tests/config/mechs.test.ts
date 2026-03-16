/**
 * Tests for mech contract configuration.
 *
 * MECHs are the AI task market contracts the staking activity checkers
 * monitor to verify an agent has completed work. Having the wrong chain or
 * mech type means staking activity cannot be verified and the agent appears
 * idle, leading to eviction.
 */

import { MECHS, MechType } from '../../config/mechs';
import { EvmChainIdMap } from '../../constants/chains';

jest.mock(
  'ethers-multicall',
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../mocks/ethersMulticall').ethersMulticallMock,
);

describe('MechType enum', () => {
  it('Agent is "mech-agent"', () => {
    expect(MechType.Agent).toBe('mech-agent');
  });

  it('Marketplace is "mech-marketplace"', () => {
    expect(MechType.Marketplace).toBe('mech-marketplace');
  });

  it('MarketplaceV2 is "mech-marketplace-2v"', () => {
    expect(MechType.MarketplaceV2).toBe('mech-marketplace-2v');
  });

  it('covers exactly 3 mech types', () => {
    expect(Object.values(MechType)).toHaveLength(3);
  });
});

describe('MECHS', () => {
  describe('Gnosis (chain 100)', () => {
    it('has Agent mech', () => {
      expect(MECHS[EvmChainIdMap.Gnosis][MechType.Agent]).toBeDefined();
    });

    it('Agent mech name is "Agent Mech"', () => {
      expect(MECHS[EvmChainIdMap.Gnosis][MechType.Agent].name).toBe(
        'Agent Mech',
      );
    });

    it('has Marketplace mech', () => {
      expect(MECHS[EvmChainIdMap.Gnosis][MechType.Marketplace]).toBeDefined();
    });

    it('Marketplace mech name is "Mech Marketplace"', () => {
      expect(MECHS[EvmChainIdMap.Gnosis][MechType.Marketplace].name).toBe(
        'Mech Marketplace',
      );
    });

    it('has MarketplaceV2 mech', () => {
      expect(MECHS[EvmChainIdMap.Gnosis][MechType.MarketplaceV2]).toBeDefined();
    });

    it('MarketplaceV2 mech name is "Mech Marketplace V2"', () => {
      expect(MECHS[EvmChainIdMap.Gnosis][MechType.MarketplaceV2].name).toBe(
        'Mech Marketplace V2',
      );
    });

    it('all Gnosis mech types have a contract object', () => {
      for (const mechType of [
        MechType.Agent,
        MechType.Marketplace,
        MechType.MarketplaceV2,
      ]) {
        expect(MECHS[EvmChainIdMap.Gnosis][mechType].contract).toBeDefined();
      }
    });
  });

  describe('Base (chain 8453)', () => {
    it('has a Marketplace mech (using V2 ABI)', () => {
      expect(MECHS[EvmChainIdMap.Base][MechType.Marketplace]).toBeDefined();
    });

    it('Base Marketplace mech name is "Mech Marketplace"', () => {
      expect(MECHS[EvmChainIdMap.Base][MechType.Marketplace].name).toBe(
        'Mech Marketplace',
      );
    });

    it('does NOT have Agent mech (only Gnosis uses agent mech)', () => {
      expect(MECHS[EvmChainIdMap.Base][MechType.Agent]).toBeUndefined();
    });

    it('has a contract object for its Marketplace mech', () => {
      expect(
        MECHS[EvmChainIdMap.Base][MechType.Marketplace].contract,
      ).toBeDefined();
    });
  });

  describe('Polygon (chain 137)', () => {
    it('has a MarketplaceV2 mech', () => {
      expect(
        MECHS[EvmChainIdMap.Polygon][MechType.MarketplaceV2],
      ).toBeDefined();
    });

    it('Polygon MarketplaceV2 mech name is "Mech Marketplace"', () => {
      expect(MECHS[EvmChainIdMap.Polygon][MechType.MarketplaceV2].name).toBe(
        'Mech Marketplace',
      );
    });

    it('does NOT have Agent mech', () => {
      expect(MECHS[EvmChainIdMap.Polygon][MechType.Agent]).toBeUndefined();
    });

    it('has a contract object', () => {
      expect(
        MECHS[EvmChainIdMap.Polygon][MechType.MarketplaceV2].contract,
      ).toBeDefined();
    });
  });

  it('covers exactly 3 chains (Gnosis, Base, Polygon)', () => {
    expect(Object.keys(MECHS)).toHaveLength(3);
  });
});
