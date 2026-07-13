export const AgentMap = {
  PredictTrader: 'trader',
  AgentsFun: 'memeooorr',
  Modius: 'modius',
  Optimus: 'optimus',
  Basius: 'basius',
  PettAi: 'pett_ai',
  Polystrat: 'polymarket_trader',
  Connect: 'connect',
} as const;

export type AgentType = (typeof AgentMap)[keyof typeof AgentMap];
