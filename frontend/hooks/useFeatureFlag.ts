import { AgentType } from '@/enums/Agent';
import { assertRequired } from '@/types/Util';

import { useServices } from './useServices';

export enum FeatureFlags {
  BalanceBreakdown = 'balance-breakdown',
}

type EachAgent = Record<FeatureFlags, boolean>;

const FEATURES: Record<AgentType, EachAgent> = {
  [AgentType.PredictTrader]: {
    [FeatureFlags.BalanceBreakdown]: true,
  },
};

export const useFeatureFlag = (featureFlag: FeatureFlags) => {
  const { selectedAgentType } = useServices();

  // make sure we have selected an agent before we can use the feature flag
  assertRequired(
    selectedAgentType,
    'Feature Flag must be used within a ServicesProvider',
  );

  return FEATURES[selectedAgentType][featureFlag] ?? false;
};
