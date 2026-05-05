/**
 * Tests for staking program activity checker configuration.
 *
 * Each staking program must have exactly one activity checker contract.
 * The activity checker is the on-chain contract that the staking proxy calls
 * to determine whether an agent was active during an epoch.
 *
 * Missing or wrong activity checkers cause agents to be considered inactive
 * even when they have completed work — leading to missed rewards and eviction.
 */

import {
  BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS,
  GNOSIS_STAKING_PROGRAMS_ACTIVITY_CHECKERS,
  MODE_STAKING_PROGRAMS_ACTIVITY_CHECKERS,
  OPTIMISM_STAKING_PROGRAMS_ACTIVITY_CHECKERS,
  POLYGON_STAKING_PROGRAMS_ACTIVITY_CHECKERS,
} from '../../config/activityCheckers';
import { STAKING_PROGRAM_IDS } from '../../constants/stakingProgram';

jest.mock(
  'ethers-multicall',
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../mocks/ethersMulticall').ethersMulticallMock,
);

describe('GNOSIS_STAKING_PROGRAMS_ACTIVITY_CHECKERS', () => {
  const gnosisIds = [
    'PearlAlpha',
    'PearlBeta',
    'PearlBeta2',
    'PearlBeta3',
    'PearlBeta4',
    'PearlBeta5',
    'PearlBeta6',
    'PearlBetaMechMarketplace',
    'PearlBetaMechMarketplace1',
    'PearlBetaMechMarketplace2',
    'PearlBetaMechMarketplace3',
    'PearlBetaMechMarketplace4',
  ] as const;

  it('has an activity checker for every Gnosis staking program', () => {
    for (const idKey of gnosisIds) {
      const programId = STAKING_PROGRAM_IDS[idKey];
      expect(
        GNOSIS_STAKING_PROGRAMS_ACTIVITY_CHECKERS[programId],
      ).toBeDefined();
    }
  });

  it('covers exactly 12 Gnosis staking programs', () => {
    expect(Object.keys(GNOSIS_STAKING_PROGRAMS_ACTIVITY_CHECKERS)).toHaveLength(
      12,
    );
  });
});

describe('BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS', () => {
  const baseIds = [
    'MemeBaseAlpha2',
    'MemeBaseBeta',
    'MemeBaseBeta2',
    'MemeBaseBeta3',
    'AgentsFun1',
    'AgentsFun2',
    'AgentsFun3',
    'PettAiAgent',
    'PettAiAgent2',
    'PettAiAgent3',
    'PettAiAgent4',
  ] as const;

  it('has an activity checker for every Base staking program', () => {
    for (const idKey of baseIds) {
      const programId = STAKING_PROGRAM_IDS[idKey];
      expect(BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[programId]).toBeDefined();
    }
  });

  it('covers exactly 11 Base staking programs', () => {
    expect(Object.keys(BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS)).toHaveLength(
      11,
    );
  });
});

describe('MODE_STAKING_PROGRAMS_ACTIVITY_CHECKERS', () => {
  const modeIds = [
    'ModiusAlpha',
    'ModiusAlpha2',
    'ModiusAlpha3',
    'ModiusAlpha4',
    'OptimusAlpha',
  ] as const;

  it('has an activity checker for every Mode staking program', () => {
    for (const idKey of modeIds) {
      const programId = STAKING_PROGRAM_IDS[idKey];
      expect(MODE_STAKING_PROGRAMS_ACTIVITY_CHECKERS[programId]).toBeDefined();
    }
  });

  it('covers exactly 5 Mode staking programs', () => {
    expect(Object.keys(MODE_STAKING_PROGRAMS_ACTIVITY_CHECKERS)).toHaveLength(
      5,
    );
  });
});

describe('OPTIMISM_STAKING_PROGRAMS_ACTIVITY_CHECKERS', () => {
  const optimismIds = [
    'OptimusAlpha2',
    'OptimusAlpha3',
    'OptimusAlpha4',
  ] as const;

  it('has an activity checker for every Optimism staking program', () => {
    for (const idKey of optimismIds) {
      const programId = STAKING_PROGRAM_IDS[idKey];
      expect(
        OPTIMISM_STAKING_PROGRAMS_ACTIVITY_CHECKERS[programId],
      ).toBeDefined();
    }
  });

  it('covers exactly 3 Optimism staking programs', () => {
    expect(
      Object.keys(OPTIMISM_STAKING_PROGRAMS_ACTIVITY_CHECKERS),
    ).toHaveLength(3);
  });
});

describe('POLYGON_STAKING_PROGRAMS_ACTIVITY_CHECKERS', () => {
  const polygonIds = ['PolygonBeta1', 'PolygonBeta2', 'PolygonBeta3'] as const;

  it('has an activity checker for every Polygon staking program', () => {
    for (const idKey of polygonIds) {
      const programId = STAKING_PROGRAM_IDS[idKey];
      expect(
        POLYGON_STAKING_PROGRAMS_ACTIVITY_CHECKERS[programId],
      ).toBeDefined();
    }
  });

  it('covers exactly 3 Polygon staking programs', () => {
    expect(
      Object.keys(POLYGON_STAKING_PROGRAMS_ACTIVITY_CHECKERS),
    ).toHaveLength(3);
  });
});

describe('cross-chain completeness', () => {
  it('total activity checkers across all chains match total staking programs', () => {
    const totalCheckers =
      Object.keys(GNOSIS_STAKING_PROGRAMS_ACTIVITY_CHECKERS).length +
      Object.keys(BASE_STAKING_PROGRAMS_ACTIVITY_CHECKERS).length +
      Object.keys(MODE_STAKING_PROGRAMS_ACTIVITY_CHECKERS).length +
      Object.keys(OPTIMISM_STAKING_PROGRAMS_ACTIVITY_CHECKERS).length +
      Object.keys(POLYGON_STAKING_PROGRAMS_ACTIVITY_CHECKERS).length;

    const totalPrograms = Object.keys(STAKING_PROGRAM_IDS).length;
    // 12 + 11 + 5 + 3 + 3 = 34 (matches STAKING_PROGRAM_IDS count)
    expect(totalCheckers).toBe(totalPrograms);
  });
});
