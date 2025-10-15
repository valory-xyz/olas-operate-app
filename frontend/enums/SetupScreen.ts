// TODO: move to constants
export const SetupScreen = {
  Loading: 'Loading',
  Welcome: 'Welcome',
  SetupPassword: 'SetupPassword',
  SetupSeedPhrase: 'SetupSeedPhrase',
  SetupBackupSigner: 'SetupBackupSigner',
  AgentOnboarding: 'AgentOnboarding',
  SetupYourAgent: 'SetupYourAgent',
  FundYourAgent: 'FundYourAgent',
  TransferFunds: 'TransferFunds',
  SetupBridgeOnboardingScreen: 'SetupBridgeOnboardingScreen',
  SetupOnRamp: 'SetupOnRamp',
  EarlyAccessOnly: 'EarlyAccessOnly',

  // TODO: to be removed post v1 release
  AgentSelection: 'AgentSelection',
  // TODO: to be removed post v1 release
  SetupEoaFunding: 'SetupEoaFunding',
  // TODO: to be removed post v1 release
  SetupEoaFundingIncomplete: 'SetupEoaFundingIncomplete',
  // TODO: to be removed post v1 release
  SetupCreateSafe: 'SetupCreateSafe',

  // Restore account, screens to be re-implemented as per v1
  Restore: 'Restore',
  RestoreViaSeed: 'RestoreViaSeed',
  RestoreSetPassword: 'RestoreSetPassword',
  RestoreViaBackup: 'RestoreViaBackup',
} as const;

export type SetupScreen = (typeof SetupScreen)[keyof typeof SetupScreen];
