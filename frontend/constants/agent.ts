export const AgentMap = {
  PredictTrader: 'trader',
  AgentsFun: 'memeooorr',
  Modius: 'modius',
  Optimus: 'optimus',
} as const;

export type AgentType = (typeof AgentMap)[keyof typeof AgentMap];
