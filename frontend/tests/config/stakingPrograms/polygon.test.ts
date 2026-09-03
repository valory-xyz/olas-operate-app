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
  it('covers all 9 Polygon staking program IDs (legacy PolygonBeta1/2/3 + PolySafe PolystratI/II/III + standard-Safe PolystratIV/V/VI)', () => {
    const expectedIds = [
      STAKING_PROGRAM_IDS.PolygonBeta1,
      STAKING_PROGRAM_IDS.PolygonBeta2,
      STAKING_PROGRAM_IDS.PolygonBeta3,
      STAKING_PROGRAM_IDS.PolystratI,
      STAKING_PROGRAM_IDS.PolystratII,
      STAKING_PROGRAM_IDS.PolystratIII,
      STAKING_PROGRAM_IDS.PolystratIV,
      STAKING_PROGRAM_IDS.PolystratV,
      STAKING_PROGRAM_IDS.PolystratVI,
    ];
    for (const id of expectedIds) {
      expect(POLYGON_STAKING_PROGRAMS[id]).toBeDefined();
    }
    expect(Object.keys(POLYGON_STAKING_PROGRAMS)).toHaveLength(9);
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

  // OPE-1919: the original six contracts pin the multisig codehash to the
  // PolySafe proxy; IV/V/VI accept a standard Safe. The two sets are mutually
  // exclusive, so the flag must be exact on every entry.
  describe('multisig compatibility', () => {
    const POLY_SAFE_IDS = [
      STAKING_PROGRAM_IDS.PolygonBeta1,
      STAKING_PROGRAM_IDS.PolygonBeta2,
      STAKING_PROGRAM_IDS.PolygonBeta3,
      STAKING_PROGRAM_IDS.PolystratI,
      STAKING_PROGRAM_IDS.PolystratII,
      STAKING_PROGRAM_IDS.PolystratIII,
    ];
    const STANDARD_SAFE_IDS = [
      STAKING_PROGRAM_IDS.PolystratIV,
      STAKING_PROGRAM_IDS.PolystratV,
      STAKING_PROGRAM_IDS.PolystratVI,
    ];

    it('legacy and PolySafe Polystrat contracts require a PolySafe service', () => {
      for (const id of POLY_SAFE_IDS) {
        expect(POLYGON_STAKING_PROGRAMS[id].requiresPolySafe).toBe(true);
      }
    });

    it('Polystrat IV/V/VI accept a standard Safe service', () => {
      for (const id of STANDARD_SAFE_IDS) {
        expect(POLYGON_STAKING_PROGRAMS[id].requiresPolySafe).toBeUndefined();
      }
    });
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

    it('PolystratI requires 100 OLAS (entry tier)', () => {
      expect(
        POLYGON_STAKING_PROGRAMS[STAKING_PROGRAM_IDS.PolystratI]
          .stakingRequirements['OLAS'],
      ).toBe(100);
    });

    it('PolystratII requires 1000 OLAS (mid tier)', () => {
      expect(
        POLYGON_STAKING_PROGRAMS[STAKING_PROGRAM_IDS.PolystratII]
          .stakingRequirements['OLAS'],
      ).toBe(1000);
    });

    it('PolystratIII requires 10000 OLAS (premium tier)', () => {
      expect(
        POLYGON_STAKING_PROGRAMS[STAKING_PROGRAM_IDS.PolystratIII]
          .stakingRequirements['OLAS'],
      ).toBe(10000);
    });

    it.each([
      ['PolystratIV', 100],
      ['PolystratV', 1000],
      ['PolystratVI', 10000],
    ] as const)('%s requires %i OLAS (standard-Safe tier)', (key, olas) => {
      expect(
        POLYGON_STAKING_PROGRAMS[STAKING_PROGRAM_IDS[key]].stakingRequirements[
          'OLAS'
        ],
      ).toBe(olas);
    });
  });

  describe('decoupled-activity regime (OPE-1803)', () => {
    it('new PolystratI/II/III carry an off-chain activityTarget of 8', () => {
      const decoupledIds = [
        STAKING_PROGRAM_IDS.PolystratI,
        STAKING_PROGRAM_IDS.PolystratII,
        STAKING_PROGRAM_IDS.PolystratIII,
      ];
      for (const id of decoupledIds) {
        expect(POLYGON_STAKING_PROGRAMS[id].activityTarget).toBe(8);
      }
    });

    it('legacy PolygonBeta1/2/3 have no activityTarget (on-chain KPI regime)', () => {
      const legacyIds = [
        STAKING_PROGRAM_IDS.PolygonBeta1,
        STAKING_PROGRAM_IDS.PolygonBeta2,
        STAKING_PROGRAM_IDS.PolygonBeta3,
      ];
      for (const id of legacyIds) {
        expect(POLYGON_STAKING_PROGRAMS[id].activityTarget).toBeUndefined();
      }
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
