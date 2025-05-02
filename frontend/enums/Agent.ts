export const AgentType = {
  PredictTrader: 'trader',
  Memeooorr: 'memeooorr',
  AgentsFunCelo: 'agents-fun-celo',
  Modius: 'modius',
  AgentsFunEliza: 'agentsFunEliza',
} as const;

export type AgentType = (typeof AgentType)[keyof typeof AgentType];
