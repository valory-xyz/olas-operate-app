export enum SetupScreen {
  Loading,
  Welcome,
  SetupPassword,
  SetupSeedPhrase,
  SetupBackupSigner,
  AgentSelection,
  SetupYourAgent,
  SetupEoaFunding,
  SetupEoaFundingIncomplete,
  SetupCreateSafe,
  Restore,
  RestoreViaSeed,
  RestoreSetPassword,
  RestoreViaBackup,
  AgentIntroduction,
  EarlyAccessOnly,

  /** Transfer balance to the EOA for bridging quote */
  BridgeFromEvm,
  /** Bridge in progress (quote being executed) */
  BridgeInProgress,
}
