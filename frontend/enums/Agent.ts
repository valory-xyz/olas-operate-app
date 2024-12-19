export const AgentType = {
  PredictTrader: 'trader',
  // Optimus: 'optimus',
  Memeooorr: 'memeooorr',
  Modius: 'modius',
} as const;

export type AgentType = (typeof AgentType)[keyof typeof AgentType];
