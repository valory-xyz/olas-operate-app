import { ValueOf } from '@/types/Util';

const GNOSIS_STAKING_PROGRAM_IDS = {
  PearlAlpha: 'pearl_alpha',
  PearlBeta: 'pearl_beta',
  PearlBeta2: 'pearl_beta_2',
  PearlBeta3: 'pearl_beta_3',
  PearlBeta4: 'pearl_beta_4',
  PearlBeta5: 'pearl_beta_5',
  PearlBeta6: 'pearl_beta_6',
  PearlBetaMechMarketplace: 'pearl_beta_mech_marketplace',
} as const;

const BASE_STAKING_PROGRAM_IDS = {
  MemeBaseAlpha2: 'meme_base_alpha_2',
  MemeBaseBeta: 'meme_base_beta',
  MemeBaseBeta2: 'meme_base_beta_2',
  MemeBaseBeta3: 'meme_base_beta_3',
  MemeCeloAlpha2: 'meme_celo_alpha_2',
  AgentsFun1: 'agents_fun_1',
  AgentsFun2: 'agents_fun_2',
  AgentsFun3: 'agents_fun_3',
} as const;

const MODE_STAKING_PROGRAM_IDS = {
  ModiusAlpha: 'modius_alpha',
  ModiusAlpha2: 'modius_alpha_2',
  ModiusAlpha3: 'modius_alpha_3',
  ModiusAlpha4: 'modius_alpha_4',
  OptimusAlpha: 'optimus_alpha',
} as const;

export type ModeStakingProgramId = ValueOf<typeof MODE_STAKING_PROGRAM_IDS>;

export const OPTIMISM_STAKING_PROGRAM_IDS = {
  OptimusAlpha1: 'optimus_alpha',
  // OptimusAlpha2: 'optimus_alpha_2',
  // OptimusAlpha3: 'optimus_alpha_3',
  // OptimusAlpha4: 'optimus_alpha_4',
} as const;

export type OptimismStakingProgramId = ValueOf<
  typeof OPTIMISM_STAKING_PROGRAM_IDS
>;

/**
 * @link https://github.com/valory-xyz/olas-operate-middleware/blob/9ca362f302ae749dd99b236d062ccc5c722acabf/operate/ledger/profiles.py#L115
 * Refer the above link for the list of staking program ids.
 */
export const STAKING_PROGRAM_IDS = {
  ...GNOSIS_STAKING_PROGRAM_IDS,
  ...BASE_STAKING_PROGRAM_IDS,
  ...MODE_STAKING_PROGRAM_IDS,
  ...OPTIMISM_STAKING_PROGRAM_IDS,
} as const;

export type StakingProgramId = ValueOf<typeof STAKING_PROGRAM_IDS>;
