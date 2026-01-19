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
  PearlBetaMechMarketplace1: 'pearl_beta_mech_marketplace_1',
  PearlBetaMechMarketplace2: 'pearl_beta_mech_marketplace_2',
  PearlBetaMechMarketplace3: 'pearl_beta_mech_marketplace_3',
  PearlBetaMechMarketplace4: 'pearl_beta_mech_marketplace_4',
} as const;

const BASE_STAKING_PROGRAM_IDS = {
  MemeBaseAlpha2: 'meme_base_alpha_2',
  MemeBaseBeta: 'meme_base_beta',
  MemeBaseBeta2: 'meme_base_beta_2',
  MemeBaseBeta3: 'meme_base_beta_3',
  AgentsFun1: 'agents_fun_1',
  AgentsFun2: 'agents_fun_2',
  AgentsFun3: 'agents_fun_3',
  PettAiAgent: 'pett_ai_agent_1',
  PettAiAgent2: 'pett_ai_agent_2',
  PettAiAgent3: 'pett_ai_agent_3',
  PettAiAgent4: 'pett_ai_agent_4',
} as const;

const MODE_STAKING_PROGRAM_IDS = {
  ModiusAlpha: 'modius_alpha',
  ModiusAlpha2: 'modius_alpha_2',
  ModiusAlpha3: 'modius_alpha_3',
  ModiusAlpha4: 'modius_alpha_4',
  OptimusAlpha: 'optimus_alpha',
} as const;

export type ModeStakingProgramId = ValueOf<typeof MODE_STAKING_PROGRAM_IDS>;

/**
 * @note: OptimusAlpha1 is deprecated and not used in the codebase.
 */
export const OPTIMISM_STAKING_PROGRAM_IDS = {
  OptimusAlpha2: 'optimus_alpha_2',
  OptimusAlpha3: 'optimus_alpha_3',
  OptimusAlpha4: 'optimus_alpha_4',
} as const;

export type OptimismStakingProgramId = ValueOf<
  typeof OPTIMISM_STAKING_PROGRAM_IDS
>;

const POLYGON_STAKING_PROGRAM_IDS = {
  PolygonBeta1: 'polygon_beta_1',
  PolygonBeta2: 'polygon_beta_2',
  PolygonBeta3: 'polygon_beta_3', // Note: “Polygon Alpha 3” is a typo in contract setup (in meta data) — the correct name is Polygon Beta 3.
} as const;

export type PolygonStakingProgramId = ValueOf<
  typeof POLYGON_STAKING_PROGRAM_IDS
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
  ...POLYGON_STAKING_PROGRAM_IDS,
} as const;

export type StakingProgramId = ValueOf<typeof STAKING_PROGRAM_IDS>;
