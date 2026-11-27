import { AgentMap } from '../../constants/agent';
import { EvmChainIdMap } from '../../constants/chains';
import {
  STAKING_PROGRAM_IDS,
  StakingProgramId,
} from '../../constants/stakingProgram';
import {
  chainHasPolySafePrograms,
  deriveStakingProgramId,
  EVICTION_RUN_START_MARGIN_SECONDS,
  getCompatibleStakingProgramIds,
  getServiceStakingProgramId,
  hasFreeServiceSlot,
  hasUnstakedOption,
  isInStakingMode,
  isNoStakingProgram,
  isStakingAvailable,
  isStakingProgramCompatibleWithMultisig,
  runsInsideEvictionWindow,
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

describe('isNoStakingProgram', () => {
  it('is true only for the no_staking program', () => {
    expect(isNoStakingProgram('no_staking')).toBe(true);
    expect(
      isNoStakingProgram(STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3),
    ).toBe(false);
    expect(isNoStakingProgram(undefined)).toBe(false);
  });
});

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

describe('runsInsideEvictionWindow', () => {
  const NOW = 1_800_000_000;
  const run = (
    overrides: Partial<Parameters<typeof runsInsideEvictionWindow>[0]>,
  ) =>
    runsInsideEvictionWindow({
      isAgentEvicted: true,
      canRunWhileEvicted: true,
      evictionExpiresAt: NOW + 86_400,
      nowSeconds: NOW,
      ...overrides,
    });

  it('holds for an agent that can run evicted, with the window open', () => {
    expect(run({})).toBe(true);
  });

  it.each([
    ['not evicted', { isAgentEvicted: false }],
    ['cannot run evicted', { canRunWhileEvicted: undefined }],
    [
      'exactly the start margin left',
      { evictionExpiresAt: NOW + EVICTION_RUN_START_MARGIN_SECONDS },
    ],
    ['the window over', { evictionExpiresAt: NOW - 1 }],
    ['the window unknown', { evictionExpiresAt: 0 }],
  ])('does not hold when %s', (_, overrides) => {
    expect(run(overrides)).toBe(false);
  });

  it('holds with one second more than the start margin left', () => {
    expect(
      run({ evictionExpiresAt: NOW + EVICTION_RUN_START_MARGIN_SECONDS + 1 }),
    ).toBe(true);
  });
});

describe('isStakingAvailable', () => {
  const connect = {
    hasStaking: false,
    stakingChains: [EvmChainIdMap.Gnosis, EvmChainIdMap.Robinhood],
  };

  it.each([
    [EvmChainIdMap.Gnosis, true],
    [EvmChainIdMap.Robinhood, true],
    [EvmChainIdMap.Polygon, false],
  ])(
    'decides per chain from stakingChains (chain %s → %s)',
    (chainId, expected) => {
      expect(isStakingAvailable(connect, chainId)).toBe(expected);
    },
  );

  it.each([true, false])(
    'falls back to hasStaking (%s) without stakingChains',
    (hasStaking) => {
      expect(isStakingAvailable({ hasStaking }, EvmChainIdMap.Gnosis)).toBe(
        hasStaking,
      );
    },
  );
});

describe('hasUnstakedOption', () => {
  const connect = {
    hasStaking: false,
    defaultStakingProgramId: 'no_staking' as StakingProgramId,
    stakingChains: [EvmChainIdMap.Gnosis, EvmChainIdMap.Robinhood],
  };

  it('is true where an agent defaulting to no_staking can stake', () => {
    expect(hasUnstakedOption(connect, EvmChainIdMap.Gnosis)).toBe(true);
  });

  it('is false where it cannot stake', () => {
    expect(hasUnstakedOption(connect, EvmChainIdMap.Polygon)).toBe(false);
  });

  it('is false for an agent that always stakes', () => {
    expect(
      hasUnstakedOption(
        {
          hasStaking: true,
          defaultStakingProgramId: STAKING_PROGRAM_IDS.OmenstratI,
        },
        EvmChainIdMap.Gnosis,
      ),
    ).toBe(false);
  });
});

describe('getServiceStakingProgramId', () => {
  const serviceIn = (staking_program_id?: string) => ({
    home_chain: 'gnosis',
    chain_configs: {
      gnosis: { chain_data: { user_params: { staking_program_id } } },
      base: { chain_data: { user_params: { staking_program_id: 'other' } } },
    },
  });

  it("reads the home chain's stored program", () => {
    expect(
      getServiceStakingProgramId(
        serviceIn('connect_i') as unknown as Parameters<
          typeof getServiceStakingProgramId
        >[0],
      ),
    ).toBe('connect_i');
  });

  it('is undefined with no service', () => {
    expect(getServiceStakingProgramId(undefined)).toBeUndefined();
  });
});

describe('isInStakingMode', () => {
  const CONNECT = {
    hasStaking: false,
    defaultStakingProgramId: 'no_staking' as const,
    stakingChains: [EvmChainIdMap.Gnosis],
  };
  const service = (staking_program_id: string | null) =>
    ({
      home_chain: 'gnosis',
      chain_configs: {
        gnosis: { chain_data: { user_params: { staking_program_id } } },
      },
    }) as unknown as Parameters<typeof isInStakingMode>[2];

  it.each([
    [
      'an agent that cannot stake there',
      { hasStaking: false },
      'connect_i',
      false,
    ],
    [
      'an agent that always stakes, program unknown',
      { hasStaking: true },
      null,
      true,
    ],
    ['an optional agent, staked', CONNECT, 'connect_i', true],
    ['an optional agent, unstaked', CONNECT, 'no_staking', false],
    ['an optional agent, program unknown', CONNECT, null, undefined],
  ])('answers %s', (_, agentConfig, stakingProgramId, expected) => {
    expect(
      isInStakingMode(
        agentConfig as Parameters<typeof isInStakingMode>[0],
        EvmChainIdMap.Gnosis,
        service(stakingProgramId),
      ),
    ).toBe(expected);
  });
});

describe('hasFreeServiceSlot', () => {
  it.each([
    ['a slot is free', { serviceIds: [1], maxNumServices: 2 }, true],
    ['every slot is taken', { serviceIds: [1, 2], maxNumServices: 2 }, false],
    ['the ids are unknown', { maxNumServices: 2 }, null],
    ['the limit is unknown', { serviceIds: [1] }, null],
    ['there are no details', undefined, null],
  ])('is right when %s', (_, details, expected) => {
    expect(hasFreeServiceSlot(details)).toBe(expected);
  });
});
