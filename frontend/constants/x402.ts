import { AgentType } from '@/constants';

import { AgentMap } from './agent';

export const X402_ENABLED_FLAGS: {
  [key in AgentType]: boolean;
} = {
  [AgentMap.PredictTrader]: true,
  [AgentMap.Optimus]: true,
  [AgentMap.AgentsFun]: false,
  [AgentMap.Modius]: true,
  [AgentMap.PettAiAgent]: false,
};
