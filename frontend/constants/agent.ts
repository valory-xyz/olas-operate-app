export const AgentMap = {
  PredictTrader: 'trader',
  AgentsFun: 'memeooorr',
  Modius: 'modius',
  Optimus: 'optimus',
  PettAi: 'pett_ai',
  Polystrat: 'polymarket_trader',
} as const;

export type AgentType = (typeof AgentMap)[keyof typeof AgentMap];
