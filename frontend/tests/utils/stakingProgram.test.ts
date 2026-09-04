import { AgentMap } from '../../constants/agent';
import { EvmChainIdMap } from '../../constants/chains';
import {
  STAKING_PROGRAM_IDS,
  StakingProgramId,
} from '../../constants/stakingProgram';
import {
  chainHasPolySafePrograms,
  deriveStakingProgramId,
  getCompatibleStakingProgramIds,
  isStakingProgramCompatibleWithMultisig,
} from '../../utils/stakingProgram';
import { makeStakingProgramConfig } from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

const POLY_SAFE_PROGRAM = STAKING_PROGRAM_IDS.PolystratI;
const POLY_SAFE_PROGRAM_2 = STAKING_PROGRAM_IDS.PolystratII;
const STANDARD_SAFE_PROGRAM = 'polystrat_standard_safe' as StakingProgramId;
const DEPRECATED_STANDARD_PROGRAM = 'polystrat_deprecated' as StakingProgramId;
const OTHER_AGENT_PROGRAM = 'other_agent_program' as StakingProgramId;

const polygonProgram = (
  overrides: Parameters<typeof makeStakingProgramConfig>[0] = {},
) =>
  makeStakingProgramConfig({
    chainId: EvmChainIdMap.Polygon,
    agentsSupported: [AgentMap.Polystrat],
    ...overrides,
  });

const POLYGON_PROGRAMS = {
  [POLY_SAFE_PROGRAM]: polygonProgram({ requiresPolySafe: true }),
  [STANDARD_SAFE_PROGRAM]: polygonProgram(),
  [POLY_SAFE_PROGRAM_2]: polygonProgram({ requiresPolySafe: true }),
  [DEPRECATED_STANDARD_PROGRAM]: polygonProgram({ deprecated: true }),
  [OTHER_AGENT_PROGRAM]: polygonProgram({
    agentsSupported: [AgentMap.PredictTrader],
  }),
};

const GNOSIS_PROGRAMS = {
  [STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3]: makeStakingProgramConfig(),
  [STAKING_PROGRAM_IDS.PearlBetaMechMarketplace4]: makeStakingProgramConfig(),
};

describe('deriveStakingProgramId', () => {
  it('lowercases and left-pads the address to 64 hex chars', () => {
    expect(
      deriveStakingProgramId('0xAbCdEf0000000000000000000000000000000001'),
    ).toBe(
      '0x000000000000000000000000abcdef0000000000000000000000000000000001',
    );
  });
});

describe('chainHasPolySafePrograms', () => {
  it('is true when at least one program requires a PolySafe', () => {
    expect(chainHasPolySafePrograms(POLYGON_PROGRAMS)).toBe(true);
  });

  it('is false when no program requires a PolySafe', () => {
    expect(chainHasPolySafePrograms(GNOSIS_PROGRAMS)).toBe(false);
  });

  it('is false for an empty chain', () => {
    expect(chainHasPolySafePrograms({})).toBe(false);
  });
});

describe('isStakingProgramCompatibleWithMultisig', () => {
  it('matches PolySafe programs with PolySafe services only', () => {
    const program = { requiresPolySafe: true };
    expect(isStakingProgramCompatibleWithMultisig(program, true)).toBe(true);
    expect(isStakingProgramCompatibleWithMultisig(program, false)).toBe(false);
  });

  it('matches standard programs with standard-Safe services only', () => {
    const program = {};
    expect(isStakingProgramCompatibleWithMultisig(program, false)).toBe(true);
    expect(isStakingProgramCompatibleWithMultisig(program, true)).toBe(false);
  });
});

describe('getCompatibleStakingProgramIds', () => {
  const base = {
    programs: POLYGON_PROGRAMS,
    agentType: AgentMap.Polystrat,
    currentStakingProgramId: null,
  };

  it('returns only PolySafe programs for a PolySafe service', () => {
    expect(
      getCompatibleStakingProgramIds({ ...base, isPolySafeService: true }),
    ).toEqual([POLY_SAFE_PROGRAM, POLY_SAFE_PROGRAM_2]);
  });

  it('returns only standard-Safe programs for a standard-Safe service', () => {
    expect(
      getCompatibleStakingProgramIds({ ...base, isPolySafeService: false }),
    ).toEqual([STANDARD_SAFE_PROGRAM]);
  });

  it('hides deprecated programs and programs for other agents', () => {
    const ids = getCompatibleStakingProgramIds({
      ...base,
      isPolySafeService: false,
    });
    expect(ids).not.toContain(DEPRECATED_STANDARD_PROGRAM);
    expect(ids).not.toContain(OTHER_AGENT_PROGRAM);
  });

  it('puts the current program first even when incompatible', () => {
    expect(
      getCompatibleStakingProgramIds({
        ...base,
        isPolySafeService: false,
        currentStakingProgramId: POLY_SAFE_PROGRAM,
      }),
    ).toEqual([POLY_SAFE_PROGRAM, STANDARD_SAFE_PROGRAM]);
  });

  it('puts the current program first even when deprecated', () => {
    expect(
      getCompatibleStakingProgramIds({
        ...base,
        isPolySafeService: false,
        currentStakingProgramId: DEPRECATED_STANDARD_PROGRAM,
      }),
    ).toEqual([DEPRECATED_STANDARD_PROGRAM, STANDARD_SAFE_PROGRAM]);
  });

  it('does not duplicate the current program', () => {
    const ids = getCompatibleStakingProgramIds({
      ...base,
      isPolySafeService: true,
      currentStakingProgramId: POLY_SAFE_PROGRAM_2,
    });
    expect(ids).toEqual([POLY_SAFE_PROGRAM_2, POLY_SAFE_PROGRAM]);
  });

  it('leaves chains without PolySafe programs unchanged for standard services', () => {
    expect(
      getCompatibleStakingProgramIds({
        programs: GNOSIS_PROGRAMS,
        agentType: AgentMap.PredictTrader,
        isPolySafeService: false,
        currentStakingProgramId: null,
      }),
    ).toEqual([
      STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3,
      STAKING_PROGRAM_IDS.PearlBetaMechMarketplace4,
    ]);
  });

  it('returns an empty list when nothing is compatible', () => {
    expect(
      getCompatibleStakingProgramIds({
        programs: {
          [POLY_SAFE_PROGRAM]: polygonProgram({ requiresPolySafe: true }),
        },
        agentType: AgentMap.Polystrat,
        isPolySafeService: false,
        currentStakingProgramId: null,
      }),
    ).toEqual([]);
  });
});
