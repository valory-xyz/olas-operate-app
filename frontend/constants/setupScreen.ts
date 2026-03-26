export const SETUP_SCREEN = {
  Loading: 'Loading',
  Welcome: 'Welcome',
  SetupPassword: 'SetupPassword',
  SetupBackupSigner: 'SetupBackupSigner',
  AgentOnboarding: 'AgentOnboarding',
  SetupYourAgent: 'SetupYourAgent',
  SelectStaking: 'SelectStaking',
  BalanceCheck: 'BalanceCheck',
  FundYourAgent: 'FundYourAgent',
  ConfirmFunding: 'ConfirmFunding',
  TransferFunds: 'TransferFunds',
  SetupBridgeOnboardingScreen: 'SetupBridgeOnboardingScreen',
  SetupOnRamp: 'SetupOnRamp',
  EarlyAccessOnly: 'EarlyAccessOnly',
  AccountRecovery: 'AccountRecovery',
  RestoreViaBackup: 'RestoreViaBackup',
} as const;

export type SetupScreen = (typeof SETUP_SCREEN)[keyof typeof SETUP_SCREEN];
