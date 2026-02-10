import { AgentType } from '@/constants';

import { AgentMap } from './agent';

export const X402_ENABLED_FLAGS: {
  [key in AgentType]: boolean;
} = {
  [AgentMap.PredictTrader]: true,
  [AgentMap.Optimus]: true,
  /**
   * Although, we use x402 in the agent, keeping it false, as it's internal
   * to the agent and doesn't have much to do with the FE logic.
   */
  [AgentMap.AgentsFun]: false,
  [AgentMap.Modius]: true,
  [AgentMap.PettAi]: false,
  [AgentMap.Polystrat]: true,
};
