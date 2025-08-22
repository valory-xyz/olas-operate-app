export const AgentType = {
  PredictTrader: 'trader',
  AgentsFun: 'memeooorr',
  Modius: 'modius',
  Optimus: 'optimus',
} as const;

export type AgentType = (typeof AgentType)[keyof typeof AgentType];
