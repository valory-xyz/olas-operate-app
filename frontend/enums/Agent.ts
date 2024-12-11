export const AgentType = {
  PredictTrader: 'trader',
  // Optimus: 'optimus',
  Memeooorr: 'memeooorr',
  Modius: 'Modius',
} as const;

export type AgentType = (typeof AgentType)[keyof typeof AgentType];
