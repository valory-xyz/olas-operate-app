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
  PearlBetaMechMarketplace5: 'pearl_beta_mech_marketplace_5',
  PearlBetaMechMarketplace6: 'pearl_beta_mech_marketplace_6',
  PearlBetaMechMarketplace7: 'pearl_beta_mech_marketplace_7',
  PearlBetaMechMarketplace8: 'pearl_beta_mech_marketplace_8',
  // New (decoupled-activity) staking contracts — PredictTrader on Gnosis ("Omenstrat").
  OmenstratI: 'omenstrat_i',
  OmenstratII: 'omenstrat_ii',
  OmenstratIII: 'omenstrat_iii',
  OmenstratIV: 'omenstrat_iv',
  OmenstratV: 'omenstrat_v',
  OmenstratVI: 'omenstrat_vi',
  OmenstratVII: 'omenstrat_vii',
  OmenstratVIII: 'omenstrat_viii',
  OmenstratIX: 'omenstrat_ix',
  OmenstratX: 'omenstrat_x',
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
  // New (decoupled-activity) staking contracts — Basius on Base.
  BasiusI: 'basius_i',
  BasiusII: 'basius_ii',
  BasiusIII: 'basius_iii',
  BasiusIV: 'basius_iv',
  BasiusV: 'basius_v',
  BasiusVI: 'basius_vi',
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
  // New (decoupled-activity) staking contracts — Optimus on Optimism.
  OptimusI: 'optimus_i',
  OptimusII: 'optimus_ii',
  OptimusIII: 'optimus_iii',
  OptimusIV: 'optimus_iv',
  OptimusV: 'optimus_v',
  OptimusVI: 'optimus_vi',
} as const;

export type OptimismStakingProgramId = ValueOf<
  typeof OPTIMISM_STAKING_PROGRAM_IDS
>;

const POLYGON_STAKING_PROGRAM_IDS = {
  PolygonBeta1: 'polygon_beta_1',
  PolygonBeta2: 'polygon_beta_2',
  PolygonBeta3: 'polygon_beta_3', // Note: “Polygon Alpha 3” is a typo in contract setup (in meta data) — the correct name is Polygon Beta 3.
  // New (decoupled-activity) staking contracts — Polystrat on Polygon.
  PolystratI: 'polystrat_i',
  PolystratII: 'polystrat_ii',
  PolystratIII: 'polystrat_iii',
  // Standard-Safe contracts (post PolySafe de-whitelisting, OPE-1919).
  PolystratIV: 'polystrat_iv',
  PolystratV: 'polystrat_v',
  PolystratVI: 'polystrat_vi',
  PolystratVII: 'polystrat_vii',
  PolystratVIII: 'polystrat_viii',
  PolystratIX: 'polystrat_ix',
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

/**
 * keccak256 of the PolySafe proxy bytecode. The live Polygon staking contracts
 * pin `service.multisig.codehash` to this value (`proxyHash()` on each of them
 * returns it), so only services deployed with a PolySafe can stake there.
 * Standard Safe proxies (every other chain) hash to a different value.
 */
export const POLY_SAFE_PROXY_CODEHASH =
  '0x92565062fdea8761e07d9df2fcdbd66c0582af6ddf0e0355bc07754ad97400b0';

export const NO_STAKING_PROGRAM_ID = 'no_staking';

export type StakingProgramId =
  | ValueOf<typeof STAKING_PROGRAM_IDS>
  | typeof NO_STAKING_PROGRAM_ID;

const NO_LONGER_SUPPORTED = 'Pearl no longer supports deprecated contracts.';
const STAKING_DETAILS_NOT_LOADED =
  "Pearl couldn't load this agent's staking details. Try again in a few minutes.";

/** Copy of the retired-contract alert, also used as start-gate and Auto-run skip reasons. */
export const RETIRED_STAKING_PROGRAM_COPY = {
  SWITCH: `Switch to one of the available contracts to run your agent. ${NO_LONGER_SUPPORTED}`,
  /** Around the cooldown's end date, which the alert renders between the two. */
  COOLDOWN_PREFIX: `${NO_LONGER_SUPPORTED} Your agent is in a cooldown period until`,
  COOLDOWN_SUFFIX:
    '. After that, switch to one of the available contracts to run your agent again.',
  /** The Safe type can't be read, so neither SWITCH nor WITHDRAWAL_ONLY can be offered. */
  SAFE_TYPE_UNKNOWN: STAKING_DETAILS_NOT_LOADED,
  /** The staking details can't be read, so neither the cooldown nor SWITCH can be offered. */
  STAKING_DETAILS_UNKNOWN: STAKING_DETAILS_NOT_LOADED,
  WITHDRAWAL_ONLY:
    'This agent can no longer trade because it cannot switch to a new staking contract. To keep using Polystrat, add a new agent. To get your funds back, start your agent and sell its positions on the Profile tab. Then withdraw from your Agent Wallet.',
} as const;
