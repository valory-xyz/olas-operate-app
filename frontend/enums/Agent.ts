export const AgentType = {
  PredictTrader: 'trader',
  AgentsFun: 'memeooorr',
  Modius: 'modius',
  AgentsFunEliza: 'agentsFunEliza',
  Optimus: 'optimus',
} as const;

export type AgentType = (typeof AgentType)[keyof typeof AgentType];
