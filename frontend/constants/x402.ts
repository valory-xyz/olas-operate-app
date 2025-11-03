import { AgentType } from '@/constants';

import { AgentMap } from './agent';

export const X402_ENABLED_FLAGS: {
  [key in AgentType]: boolean;
} = {
  [AgentMap.PredictTrader]: false,
  [AgentMap.Optimus]: false,
  [AgentMap.AgentsFun]: false,
  [AgentMap.Modius]: false,
};
