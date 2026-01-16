import { z } from 'zod';

import { AgentMap } from '@/constants';
import { assertRequired } from '@/types/Util';

import { useServices } from './useServices';

const FeatureFlagsSchema = z.enum([
  'withdraw-funds', // Enables withdrawing funds from the wallet (Manage Wallet → Withdraw)
  'staking-contract-section', // Shows the staking contract section and related management UI
  'backup-via-safe', // Enables wallet backup via Safe (alerts and settings)
  'bridge-onboarding', // Enables the bridge funds flow during setup
  'bridge-add-funds', // Enables the bridge funds flow in low-balance alerts when agents require a refill
  'on-ramp', // Enables the fiat on-ramp (buy crypto) flow/screens
]);
type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

const FeaturesConfigSchema = z.record(
  z.nativeEnum(AgentMap),
  z.record(FeatureFlagsSchema, z.boolean()),
);

/**
 * Feature flags configuration for each agent type
 * If true  - the feature is enabled
 * if false - the feature is disabled
 */
const FEATURES_CONFIG = FeaturesConfigSchema.parse({
  [AgentMap.PredictTrader]: {
    'withdraw-funds': true,
    'staking-contract-section': true,
    'backup-via-safe': true,
    'bridge-onboarding': true,
    'bridge-add-funds': true,
    'on-ramp': true,
  },
  [AgentMap.Polystrat]: {
    'withdraw-funds': true,
    'staking-contract-section': true,
    'backup-via-safe': true,
    'bridge-onboarding': true,
    'bridge-add-funds': true,
    'on-ramp': true,
  },
  [AgentMap.AgentsFun]: {
    'withdraw-funds': true,
    'staking-contract-section': true,
    'backup-via-safe': true,
    'bridge-onboarding': true,
    'bridge-add-funds': false,
    'on-ramp': true,
  },
  [AgentMap.Modius]: {
    'withdraw-funds': true,
    'staking-contract-section': true,
    'backup-via-safe': false, // temporarily hidden until mode is available on safe https://app.safe.global/new-safe/create
    'bridge-onboarding': true,
    'bridge-add-funds': true,
    'on-ramp': true,
  },
  [AgentMap.Optimus]: {
    'withdraw-funds': true,
    'staking-contract-section': true,
    'backup-via-safe': true,
    'bridge-onboarding': true,
    'bridge-add-funds': true,
    'on-ramp': true,
  },
  [AgentMap.PettAi]: {
    'withdraw-funds': true,
    'staking-contract-section': false,
    'backup-via-safe': true,
    'bridge-onboarding': true,
    'bridge-add-funds': false,
    'on-ramp': true,
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
