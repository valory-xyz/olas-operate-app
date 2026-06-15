export const AgentMap = {
  PredictTrader: 'trader',
  AgentsFun: 'memeooorr',
  Modius: 'modius',
  Optimus: 'optimus',
  Basius: 'basius',
  PettAi: 'pett_ai',
  Polystrat: 'polymarket_trader',
} as const;

export type AgentType = (typeof AgentMap)[keyof typeof AgentMap];

/**
 * Temporary QA build flag — when `true`, Basius runs with
 * `staking_program_id='no_staking'` and a zero `cost_of_bond` so Pearl
 * skips the on-chain staking call. Lives in this leaf module (no deep
 * deps) so both `config/agents.ts` and `serviceTemplates/service/babydegen.ts`
 * can import it without creating a circular dependency.
 *
 * Flip to `false` (or remove the conditionals in AGENT_CONFIG[Basius]
 * and BASIUS_SERVICE_TEMPLATE.cost_of_bond) once the real BasiusAlpha1
 * staking contract is deployed. The release pipeline assumes this is
 * `false` for production builds.
 */
export const BASIUS_QA_NO_STAKING_MODE = true;
