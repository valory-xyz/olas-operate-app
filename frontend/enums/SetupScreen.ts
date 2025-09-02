// TODO: move to constants
export const SetupScreen = {
  Loading: 'Loading',
  Welcome: 'Welcome',
  SetupPassword: 'SetupPassword',
  SetupSeedPhrase: 'SetupSeedPhrase',
  SetupBackupSigner: 'SetupBackupSigner',
  AgentSelection: 'AgentSelection',
  SetupYourAgent: 'SetupYourAgent',
  SetupEoaFunding: 'SetupEoaFunding',
  SetupEoaFundingIncomplete: 'SetupEoaFundingIncomplete',
  SetupCreateSafe: 'SetupCreateSafe',
  Restore: 'Restore',
  RestoreViaSeed: 'RestoreViaSeed',
  RestoreSetPassword: 'RestoreSetPassword',
  RestoreViaBackup: 'RestoreViaBackup',
  AgentIntroduction: 'AgentIntroduction',
  EarlyAccessOnly: 'EarlyAccessOnly',

  /** Onboarding using the bridge */
  SetupBridgeOnboardingScreen: 'SetupBridgeOnboardingScreen',
  SetupOnRamp: 'SetupOnRamp',
} as const;

export type SetupScreen = (typeof SetupScreen)[keyof typeof SetupScreen];
