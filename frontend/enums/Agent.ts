export const AgentType = {
  PredictTrader: 'trader',
  // Optimus: 'optimus',
  Memeooorr: 'memeooorr',
} as const;

export type AgentType = (typeof AgentType)[keyof typeof AgentType];
