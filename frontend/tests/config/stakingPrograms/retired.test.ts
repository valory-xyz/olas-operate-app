/** The retired ids mirror the middleware (see `StakingProgramConfig.retired`); every new program is live. */
import {
  isRetiredStakingProgram,
  STAKING_PROGRAMS,
} from '../../../config/stakingPrograms';
import { EvmChainIdMap } from '../../../constants/chains';
import { STAKING_PROGRAM_IDS } from '../../../constants/stakingProgram';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);
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

const NEW_PROGRAMS = [
  [EvmChainIdMap.Gnosis, STAKING_PROGRAM_IDS.OmenstratVIII, 50],
  [EvmChainIdMap.Gnosis, STAKING_PROGRAM_IDS.OmenstratIX, 2500],
  [EvmChainIdMap.Gnosis, STAKING_PROGRAM_IDS.OmenstratX, 5000],
  [EvmChainIdMap.Polygon, STAKING_PROGRAM_IDS.PolystratVII, 50],
  [EvmChainIdMap.Polygon, STAKING_PROGRAM_IDS.PolystratVIII, 500],
  [EvmChainIdMap.Polygon, STAKING_PROGRAM_IDS.PolystratIX, 5000],
  [EvmChainIdMap.Optimism, STAKING_PROGRAM_IDS.OptimusIV, 50],
  [EvmChainIdMap.Optimism, STAKING_PROGRAM_IDS.OptimusV, 500],
  [EvmChainIdMap.Optimism, STAKING_PROGRAM_IDS.OptimusVI, 2500],
  [EvmChainIdMap.Base, STAKING_PROGRAM_IDS.BasiusIV, 50],
  [EvmChainIdMap.Base, STAKING_PROGRAM_IDS.BasiusV, 500],
  [EvmChainIdMap.Base, STAKING_PROGRAM_IDS.BasiusVI, 2500],
] as const;

describe('retired staking programs', () => {
  it.each(Object.entries(RETIRED_IDS))(
    'chain %s retires exactly the middleware list',
    (chainId, expected) => {
      const retired = Object.entries(STAKING_PROGRAMS[Number(chainId) as 100])
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
    'new program %s/%s is live, StakingToken v0.4 and needs %d OLAS',
    (chainId, id, olas) => {
      const program = STAKING_PROGRAMS[chainId][id];
      expect(program.retired).toBeFalsy();
      expect(program.deprecated).toBeFalsy();
      expect(program.requiresPolySafe).toBeFalsy();
      expect(program.stakingVersion).toBe('0.4');
      expect(program.stakingRequirements.OLAS).toBe(olas);
    },
  );
});

describe('isRetiredStakingProgram', () => {
  it.each([
    [EvmChainIdMap.Gnosis, STAKING_PROGRAM_IDS.OmenstratVII, true],
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
