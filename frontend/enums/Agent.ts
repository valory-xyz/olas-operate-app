export const AgentType = {
  PredictTrader: 'trader',
  // Optimus: 'optimus',
} as const;

export type AgentType = (typeof AgentType)[keyof typeof AgentType];
