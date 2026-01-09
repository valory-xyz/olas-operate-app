export const AgentMap = {
  PredictTrader: 'trader',
  AgentsFun: 'memeooorr',
  Modius: 'modius',
  Optimus: 'optimus',
  PettAi: 'pett_ai',
  // PredictTraderPolymarket: 'trader_polymarket',
} as const;

export type AgentType = (typeof AgentMap)[keyof typeof AgentMap];
