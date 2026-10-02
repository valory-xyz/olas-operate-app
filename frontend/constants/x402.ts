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
  [AgentMap.Basius]: true,
  [AgentMap.PettAi]: false,
  [AgentMap.Polystrat]: true,
  [AgentMap.Connect]: false,
};

/**
 * Whether the agent pays for its API calls through the mech facilitator rather
 * than paying each x402 call from its own token balance. Only meaningful where
 * X402_ENABLED_FLAGS is already true: the facilitator is the paid route's other
 * mode, not a separate feature.
 *
 * On the facilitator route the marketplace debits the service Safe's
 * pre-deposit, and the agent's marketplace requests are what move the on-chain
 * activity counter that the decoupled-activity staking programs read.
 */
export const MECH_FACILITATOR_ENABLED_FLAGS: {
  [key in AgentType]: boolean;
} = {
  [AgentMap.PredictTrader]: true,
  [AgentMap.Optimus]: true,
  [AgentMap.Basius]: true,
  [AgentMap.Polystrat]: true,
  // Left on the plain x402 route until its own release ships the facilitator.
  [AgentMap.Modius]: false,
  [AgentMap.AgentsFun]: false,
  [AgentMap.PettAi]: false,
  [AgentMap.Connect]: false,
};
