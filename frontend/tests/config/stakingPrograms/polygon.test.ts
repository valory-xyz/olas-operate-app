/**
 * Tests for Polygon chain staking program configuration.
 *
 * Polygon programs exclusively support the Polystrat agent (polymarket trader).
 *
 * Known quirk: PolygonBeta3's display `name` is 'Polygon Alpha III' — this
 * matches an acknowledged typo in the on-chain contract metadata. The staking
 * program ID is correctly `polygon_beta_3`.
 */

import { POLYGON_STAKING_PROGRAMS } from '../../../config/stakingPrograms/polygon';
import { AgentMap } from '../../../constants/agent';
import { EvmChainIdMap } from '../../../constants/chains';
import { STAKING_PROGRAM_IDS } from '../../../constants/stakingProgram';

jest.mock(
  'ethers-multicall',
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../mocks/ethersMulticall').ethersMulticallMock,
);

const EVM_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

describe('POLYGON_STAKING_PROGRAMS', () => {
  it('covers all 3 Polygon staking program IDs', () => {
    const expectedIds = [
      STAKING_PROGRAM_IDS.PolygonBeta1,
      STAKING_PROGRAM_IDS.PolygonBeta2,
      STAKING_PROGRAM_IDS.PolygonBeta3,
    ];
    for (const id of expectedIds) {
      expect(POLYGON_STAKING_PROGRAMS[id]).toBeDefined();
    }
    expect(Object.keys(POLYGON_STAKING_PROGRAMS)).toHaveLength(3);
  });

  it('all programs are on Polygon chain (chainId 137)', () => {
    for (const program of Object.values(POLYGON_STAKING_PROGRAMS)) {
      expect(program.chainId).toBe(EvmChainIdMap.Polygon);
    }
  });

  it('all programs support the Polystrat agent', () => {
    for (const program of Object.values(POLYGON_STAKING_PROGRAMS)) {
      expect(program.agentsSupported).toContain(AgentMap.Polystrat);
    }
  });

  it('all programs have a valid Ethereum contract address', () => {
    for (const program of Object.values(POLYGON_STAKING_PROGRAMS)) {
      expect(program.address).toMatch(EVM_ADDRESS_PATTERN);
    }
  });

  it('no two programs share the same contract address', () => {
    const addresses = Object.values(POLYGON_STAKING_PROGRAMS).map(
      (p) => p.address,
    );
    const unique = new Set(addresses);
    expect(unique.size).toBe(addresses.length);
  });

  it('all programs have a positive OLAS staking requirement', () => {
    for (const program of Object.values(POLYGON_STAKING_PROGRAMS)) {
      expect(program.stakingRequirements['OLAS']).toBeGreaterThan(0);
    }
  });

  it('all programs have an activityChecker', () => {
    for (const program of Object.values(POLYGON_STAKING_PROGRAMS)) {
      expect(program.activityChecker).toBeDefined();
    }
  });

  it('no Polygon programs are deprecated', () => {
    for (const program of Object.values(POLYGON_STAKING_PROGRAMS)) {
      expect(program.deprecated).toBeUndefined();
    }
  });

  describe('staking tier requirements', () => {
    it('PolygonBeta1 requires 100 OLAS (entry tier)', () => {
      expect(
        POLYGON_STAKING_PROGRAMS[STAKING_PROGRAM_IDS.PolygonBeta1]
          .stakingRequirements['OLAS'],
      ).toBe(100);
    });

    it('PolygonBeta2 requires 1000 OLAS (mid tier)', () => {
      expect(
        POLYGON_STAKING_PROGRAMS[STAKING_PROGRAM_IDS.PolygonBeta2]
          .stakingRequirements['OLAS'],
      ).toBe(1000);
    });

    it('PolygonBeta3 requires 10000 OLAS (premium tier)', () => {
      expect(
        POLYGON_STAKING_PROGRAMS[STAKING_PROGRAM_IDS.PolygonBeta3]
          .stakingRequirements['OLAS'],
      ).toBe(10000);
    });
  });

  describe('known quirks', () => {
    it('PolygonBeta3 display name is "Polygon Alpha III" (matches on-chain typo in metadata)', () => {
      // The staking program ID is correctly "polygon_beta_3" but the
      // on-chain contract metadata has the wrong name. The display name
      // mirrors the contract metadata. See comment in stakingProgram.ts.
      expect(
        POLYGON_STAKING_PROGRAMS[STAKING_PROGRAM_IDS.PolygonBeta3].name,
      ).toBe('Polygon Alpha III');
    });
  });
});
