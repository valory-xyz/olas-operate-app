/**
 * @deprecated
 *
 * use `AgentType` from `@/constants/agent.ts` instead
 */
export const AgentType = {
  PredictTrader: 'trader',
  AgentsFun: 'memeooorr',
  Modius: 'modius',
  Optimus: 'optimus',
} as const;

/**
 * @deprecated
 *
 * use `AgentType` from `@/constants/agent.ts` instead
 */
export type AgentType = (typeof AgentType)[keyof typeof AgentType];
