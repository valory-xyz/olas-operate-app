import { z } from 'zod';

import { AgentType } from '@/enums/Agent';
import { assertRequired } from '@/types/Util';

import { useServices } from './useServices';

const FeatureFlagsSchema = z.enum([
  'manage-wallet', // Enables the wallet management UI (balance breakdown)
  'withdraw-funds', // Enables withdrawing funds from the wallet (Manage Wallet → Withdraw)
  'last-transactions', // Shows the recent transactions UI element
  'rewards-streak', // Displays rewards history and streak
  'staking-contract-section', // Shows the staking contract section and related management UI
  'agent-activity', // Enables the "What's My Agent Doing" feed based on health-check rounds
  'backup-via-safe', // Enables wallet backup via Safe (alerts and settings)
  'agent-settings', // Shows the Agent Settings button/screens for configurable agents requiring user input
  'bridge-onboarding', // Enables the bridge funds flow during setup
  'bridge-add-funds', // Enables the bridge funds flow in low-balance alerts when agents require a refill
  'on-ramp', // Enables the fiat on-ramp (buy crypto) flow/screens
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
    'withdraw-funds': true,
    'last-transactions': true,
    'rewards-streak': true,
    'staking-contract-section': true,
    'agent-activity': true,
    'backup-via-safe': true,
    'agent-settings': true,
    'bridge-onboarding': true,
    'bridge-add-funds': true,
    'on-ramp': true,
  },
  [AgentType.AgentsFun]: {
    'manage-wallet': true,
    'withdraw-funds': true,
    'last-transactions': true,
    'rewards-streak': true,
    'staking-contract-section': true,
    'agent-activity': true,
    'backup-via-safe': true,
    'agent-settings': true,
    'bridge-onboarding': true,
    'bridge-add-funds': false,
    'on-ramp': true,
  },
  [AgentType.Modius]: {
    'manage-wallet': true,
    'withdraw-funds': true,
    'last-transactions': true,
    'rewards-streak': true,
    'staking-contract-section': true,
    'agent-activity': true,
    'backup-via-safe': false, // temporarily hidden until mode is available on safe https://app.safe.global/new-safe/create
    'agent-settings': true,
    'bridge-onboarding': true,
    'bridge-add-funds': true,
    'on-ramp': true,
  },
  [AgentType.Optimus]: {
    'manage-wallet': true,
    'withdraw-funds': true,
    'last-transactions': true,
    'rewards-streak': true,
    'staking-contract-section': true,
    'agent-activity': true,
    'backup-via-safe': true,
    'agent-settings': true,
    'bridge-onboarding': true,
    'bridge-add-funds': true,
    'on-ramp': true,
  },
  [AgentType.PettAi]: {
    'manage-wallet': false,
    'withdraw-funds': false,
    'last-transactions': false,
    'rewards-streak': false,
    'staking-contract-section': false,
    'agent-activity': true,
    'backup-via-safe': false,
    'agent-settings': false,
    'bridge-onboarding': false,
    'bridge-add-funds': false,
    'on-ramp': false,
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
