/** The retired ids mirror the middleware (see `StakingProgramConfig.retired`); every new program is live. */
import { MechType } from '../../../config/mechs';
import {
  isRetiredStakingProgram,
  STAKING_PROGRAMS,
} from '../../../config/stakingPrograms';
import { EvmChainId, EvmChainIdMap } from '../../../constants/chains';
import { STAKING_PROGRAM_IDS } from '../../../constants/stakingProgram';

// Contracts keep their address, so the activity checkers can be pinned.
/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock('ethers-multicall', () => ({
  ...require('../../mocks/ethersMulticall').ethersMulticallMock,
  Contract: jest.fn().mockImplementation((address: string) => ({ address })),
}));
/* eslint-enable @typescript-eslint/no-var-requires */

const RETIRED_IDS = {
  [EvmChainIdMap.Gnosis]: [
    'pearl_alpha',
    'pearl_beta',
    'pearl_beta_2',
    'pearl_beta_3',
    'pearl_beta_4',
    'pearl_beta_5',
    'pearl_beta_6',
    'pearl_beta_mech_marketplace',
    'pearl_beta_mech_marketplace_1',
    'pearl_beta_mech_marketplace_2',
    'pearl_beta_mech_marketplace_3',
    'pearl_beta_mech_marketplace_4',
    'pearl_beta_mech_marketplace_5',
    'pearl_beta_mech_marketplace_6',
    'pearl_beta_mech_marketplace_7',
    'pearl_beta_mech_marketplace_8',
    'omenstrat_i',
    'omenstrat_ii',
    'omenstrat_iii',
    'omenstrat_iv',
    'omenstrat_v',
    'omenstrat_vi',
    'omenstrat_vii',
  ],
  [EvmChainIdMap.Polygon]: [
    'polygon_beta_1',
    'polygon_beta_2',
    'polygon_beta_3',
    'polystrat_i',
    'polystrat_ii',
    'polystrat_iii',
    'polystrat_iv',
    'polystrat_v',
    'polystrat_vi',
  ],
  [EvmChainIdMap.Optimism]: [
    'optimus_alpha_2',
    'optimus_alpha_3',
    'optimus_alpha_4',
    'optimus_i',
    'optimus_ii',
    'optimus_iii',
  ],
  [EvmChainIdMap.Base]: ['basius_i', 'basius_ii', 'basius_iii'],
  [EvmChainIdMap.Mode]: [],
};

// Each chain's decoupled-activity checker, read on-chain from every new
// program's `activityChecker()`.
// Each agent's hardcoded activity target, the same as on its older programs.
const ACTIVITY_TARGET = {
  [EvmChainIdMap.Gnosis]: 8,
  [EvmChainIdMap.Polygon]: 8,
  [EvmChainIdMap.Optimism]: 1,
  [EvmChainIdMap.Base]: 1,
};

const CHECKER = {
  [EvmChainIdMap.Gnosis]: '0x3514EeA47C03dF8d9FdD68A469908755d2870c48',
  [EvmChainIdMap.Polygon]: '0x5B70A66fe68c4c86FFd724B58cc56049c70e9D3D',
  [EvmChainIdMap.Optimism]: '0x408dCA2b565f5eC7779C181870feFb51Ed67C3F4',
  [EvmChainIdMap.Base]: '0xE73C4e90983aa65d42b2de968E0C8F25Ced835A8',
};

// Addresses and min stakes from the scope (D38).
const NEW_PROGRAMS = [
  [
    EvmChainIdMap.Gnosis,
    STAKING_PROGRAM_IDS.OmenstratVIII,
    '0x9C254A169D71cFF6766D9702425Ec467B62B95EC',
    50,
  ],
  [
    EvmChainIdMap.Gnosis,
    STAKING_PROGRAM_IDS.OmenstratIX,
    '0x36CB5b4e6befc5Cc3f6801Cc290C3d9148f6D7Cf',
    2500,
  ],
  [
    EvmChainIdMap.Gnosis,
    STAKING_PROGRAM_IDS.OmenstratX,
    '0xd467492f65FCA11786982b9743ed4E1F79cE81A1',
    5000,
  ],
  [
    EvmChainIdMap.Polygon,
    STAKING_PROGRAM_IDS.PolystratVII,
    '0x1eFb70d9e7ec63F7CC51BF684E3e4AF54eF3CE46',
    50,
  ],
  [
    EvmChainIdMap.Polygon,
    STAKING_PROGRAM_IDS.PolystratVIII,
    '0x003685C1F4B978e4D975D2457f707e8d6Eedc62E',
    500,
  ],
  [
    EvmChainIdMap.Polygon,
    STAKING_PROGRAM_IDS.PolystratIX,
    '0x1674997dA73Bfb3116aC251fF9E1dB2905D18223',
    5000,
  ],
  [
    EvmChainIdMap.Optimism,
    STAKING_PROGRAM_IDS.OptimusIV,
    '0xaDa8AFB446576483B791f58Da33b20ebd217c1fE',
    50,
  ],
  [
    EvmChainIdMap.Optimism,
    STAKING_PROGRAM_IDS.OptimusV,
    '0x767F4101183Ca56325270facbF0FcdDFEfd043aA',
    500,
  ],
  [
    EvmChainIdMap.Optimism,
    STAKING_PROGRAM_IDS.OptimusVI,
    '0x307a23a821f7B837308cfd7673650674B5780b36',
    2500,
  ],
  [
    EvmChainIdMap.Base,
    STAKING_PROGRAM_IDS.BasiusIV,
    '0x180E4A9A59BA5B6817fA0668A864343147E8A63b',
    50,
  ],
  [
    EvmChainIdMap.Base,
    STAKING_PROGRAM_IDS.BasiusV,
    '0xad7f7DE6909f1DE49c14F4003d37485A02012159',
    500,
  ],
  [
    EvmChainIdMap.Base,
    STAKING_PROGRAM_IDS.BasiusVI,
    '0x3639E1C2F9a7FF11aAdD239Cd778A7b5af39820b',
    2500,
  ],
] as const;

describe('retired staking programs', () => {
  it.each(Object.entries(RETIRED_IDS))(
    'chain %s retires exactly the middleware list',
    (chainId, expected) => {
      const retired = Object.entries(
        STAKING_PROGRAMS[Number(chainId) as EvmChainId],
      )
        .filter(([, program]) => program.retired)
        .map(([id]) => id);
      expect(retired.sort()).toEqual([...expected].sort());
    },
  );

  it('keeps `deprecated` off the PolySafe programs', () => {
    const deprecatedPolySafe = Object.values(
      STAKING_PROGRAMS[EvmChainIdMap.Polygon],
    ).filter((program) => program.requiresPolySafe && program.deprecated);
    expect(deprecatedPolySafe).toEqual([]);
  });

  it.each(NEW_PROGRAMS)(
    'new program %s/%s is at %s, live, StakingToken v0.4 and needs %d OLAS',
    (chainId, id, address, olas) => {
      const program = STAKING_PROGRAMS[chainId][id];
      expect(program.address).toBe(address);
      expect(
        (program.activityChecker as unknown as { address: string }).address,
      ).toBe(CHECKER[chainId]);
      expect(program.retired).toBeFalsy();
      expect(program.deprecated).toBeFalsy();
      expect(program.requiresPolySafe).toBeFalsy();
      expect(program.stakingVersion).toBe('0.4');
      expect(program.stakingRequirements.OLAS).toBe(olas);
      expect(program.activityTarget).toBe(ACTIVITY_TARGET[chainId]);
      expect(program.mechType).toBe(MechType.MarketplaceV2);
    },
  );
});

describe('isRetiredStakingProgram', () => {
  it.each([
    [EvmChainIdMap.Gnosis, STAKING_PROGRAM_IDS.OmenstratVII, true],
    // A retired id on a chain it does not belong to.
    [EvmChainIdMap.Polygon, STAKING_PROGRAM_IDS.OmenstratVII, false],
    // A chain with no programs at all.
    [EvmChainIdMap.Robinhood, STAKING_PROGRAM_IDS.PolystratI, false],
    [999 as EvmChainId, STAKING_PROGRAM_IDS.PolystratI, false],
    [EvmChainIdMap.Gnosis, STAKING_PROGRAM_IDS.OmenstratVIII, false],
    [EvmChainIdMap.Polygon, STAKING_PROGRAM_IDS.PolystratI, true],
    [EvmChainIdMap.Base, STAKING_PROGRAM_IDS.AgentsFun1, false],
    [EvmChainIdMap.Base, STAKING_PROGRAM_IDS.MemeBaseBeta, false],
    [EvmChainIdMap.Gnosis, 'no_staking', false],
    [EvmChainIdMap.Gnosis, null, false],
    [EvmChainIdMap.Gnosis, undefined, false],
  ] as const)('%s / %s → %s', (chainId, programId, expected) => {
    expect(isRetiredStakingProgram(chainId, programId)).toBe(expected);
  });
});
