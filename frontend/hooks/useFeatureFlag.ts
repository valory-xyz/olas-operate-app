import { z } from 'zod';

import { AgentType } from '@/enums/Agent';
import { assertRequired } from '@/types/Util';

import { useServices } from './useServices';

const FeatureFlagsSchema = z.enum([
  'last-transactions',
  'manage-wallet',
  'rewards-streak',
  'staking-contract-section',
  'backup-via-safe',
]);
type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

const FeaturesConfigSchema = z.record(
  z.nativeEnum(AgentType),
  z.record(FeatureFlagsSchema, z.boolean()),
);

/**
 * Feature flags configuration for each agent type
 * If true  - the feature is enabled
 * if false - the feature is disabled
 */
const FEATURES_CONFIG = FeaturesConfigSchema.parse({
  [AgentType.PredictTrader]: {
    'manage-wallet': true,
    'last-transactions': true,
    'rewards-streak': true,
    'staking-contract-section': true,
    'backup-via-safe': true,
  },
  [AgentType.Memeooorr]: {
    'manage-wallet': false,
    'last-transactions': false,
    'rewards-streak': false,
    'staking-contract-section': false,
    'backup-via-safe': true,
  },
  [AgentType.Modius]: {
    'manage-wallet': false,
    'last-transactions': false,
    'rewards-streak': false,
    'staking-contract-section': false,
    // temporarily hidden until mode is available on safe https://app.safe.global/new-safe/create
    'backup-via-safe': false,
  },
});

type FeatureFlagReturn<T extends FeatureFlags | FeatureFlags[]> =
  T extends FeatureFlags[] ? boolean[] : boolean;

/**
 * Hook to check if a feature flag is enabled for the selected agent
 * @example const isFeatureEnabled = useFeatureFlag('feature-name');
 */
export function useFeatureFlag<T extends FeatureFlags | FeatureFlags[]>(
  featureFlag: T,
): FeatureFlagReturn<T> {
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
    return featureFlag.map(
      (flag) => selectedAgentFeatures[flag] ?? false,
    ) as FeatureFlagReturn<T>;
  }

  // Return the boolean value for the single feature flag
  return (selectedAgentFeatures[featureFlag as FeatureFlags] ??
    false) as FeatureFlagReturn<T>;
}