import { z } from 'zod';

import { AgentType } from '@/enums/Agent';
import { assertRequired } from '@/types/Util';

import { useServices } from './useServices';

const FeatureFlagsSchema = z.enum(['last-transactions', 'balance-breakdown']);
type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

const FeaturesConfigSchema = z.record(
  z.nativeEnum(AgentType),
  z.record(FeatureFlagsSchema, z.boolean()),
);

const FEATURES_CONFIG = FeaturesConfigSchema.parse({
  [AgentType.PredictTrader]: {
    'balance-breakdown': true,
    'last-transactions': false,
  },
});

/**
 * Hook to check if a feature flag is enabled for the selected agent
 * @example const isFeatureEnabled = useFeatureFlag('feature-name');
 */
export const useFeatureFlag = (featureFlag: FeatureFlags | FeatureFlags[]) => {
  const { selectedAgentType } = useServices();

  // Ensure an agent is selected before using the feature flag
  assertRequired(
    selectedAgentType,
    'Feature Flag must be used within a ServicesProvider',
  );

  // Ensure the selected agent type is supported
  const selectedAgentFeatures = FEATURES_CONFIG[selectedAgentType];
  assertRequired(
    selectedAgentFeatures,
    `Agent type ${selectedAgentType} is not supported.`,
  );

  // If the feature flag is an array, return an array of booleans
  if (Array.isArray(featureFlag)) {
    return featureFlag.map((flag) => selectedAgentFeatures[flag] ?? false);
  }

  // Return the boolean value for the single feature flag
  return selectedAgentFeatures[featureFlag] ?? false;
};
