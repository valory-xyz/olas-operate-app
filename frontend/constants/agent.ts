export const AgentMap = {
  PredictTrader: 'trader',
  AgentsFun: 'memeooorr',
  Modius: 'modius',
  Optimus: 'optimus',
  PettAiAgent: 'pett_ai_agent',
} as const;

export type AgentType = (typeof AgentMap)[keyof typeof AgentMap];
