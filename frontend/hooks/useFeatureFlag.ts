import { AgentType } from '@/enums/Agent';
import { assertRequired } from '@/types/Util';

import { useServices } from './useServices';

type FeatureFlags = 'last-transactions' | 'balance-breakdown';

const FEATURES: Record<AgentType, Record<FeatureFlags, boolean>> = {
  [AgentType.PredictTrader]: {
    'balance-breakdown': true,
    'last-transactions': false,
  },
};

export const useFeatureFlag = (featureFlag: FeatureFlags | FeatureFlags[]) => {
  const { selectedAgentType } = useServices();

  // make sure we have selected an agent before we can use the feature flag
  assertRequired(
    selectedAgentType,
    'Feature Flag must be used within a ServicesProvider',
  );

  if (Array.isArray(featureFlag)) {
    return featureFlag.map(
      (flag) => FEATURES[selectedAgentType][flag] ?? false,
    );
  }

  return FEATURES[selectedAgentType][featureFlag] ?? false;
};
