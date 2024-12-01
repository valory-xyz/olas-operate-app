import { z } from 'zod';

import { AgentType } from '@/enums/Agent';
import { assertRequired } from '@/types/Util';

import { useServices } from './useServices';

const FeatureFlagsSchema = z.enum(['last-transactions', 'balance-breakdown']);
type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

const FeaturesSchema = z.record(
  z.nativeEnum(AgentType),
  z.record(FeatureFlagsSchema, z.boolean()),
);

const FEATURES = FeaturesSchema.parse({
  [AgentType.PredictTrader]: {
    'balance-breakdown': true,
    'last-transactions': false,
  },
});

/**
 * hook to check if a feature flag is enabled for the selected agent
 * @example const isFeatureEnabled = useFeatureFlag('feature-name');
 */
export const useFeatureFlag = (featureFlag: FeatureFlags | FeatureFlags[]) => {
  const { selectedAgentType } = useServices();

  // make sure we have selected an agent before we can use the feature flag
  assertRequired(
    selectedAgentType,
    'Feature Flag must be used within a ServicesProvider',
  );

  // make sure the selected agent type is supported
  const currentAgentFeatures = FEATURES[selectedAgentType];
  assertRequired(
    currentAgentFeatures,
    `Agent type ${selectedAgentType} not is not supported.`,
  );

  // if the feature flag is an array, return an array of booleans
  if (Array.isArray(featureFlag)) {
    return featureFlag.map((flag) => currentAgentFeatures[flag] ?? false);
  }

  return currentAgentFeatures[featureFlag] ?? false;
};
