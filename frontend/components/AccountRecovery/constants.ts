export const RECOVERY_STEPS = {
  SelectRecoveryMethod: 'SelectRecoveryMethod',
  SelectPasswordResetOption: 'SelectPasswordResetOption',
  // Backup-wallet path
  CreateNewPassword: 'CreateNewPassword',
  FundYourBackupWallet: 'FundYourBackupWallet',
  ApproveWithBackupWallet: 'ApproveWithBackupWallet',
  // SRP (Secret Recovery Phrase) path
  EnterSecretRecoveryPhrase: 'EnterSecretRecoveryPhrase',
  SetNewPasswordViaSRP: 'SetNewPasswordViaSRP',
} as const;

export type RecoverySteps = keyof typeof RECOVERY_STEPS;

export const RESET_METHOD = {
  BackupWallet: 'BackupWallet',
  SRP: 'SRP',
} as const;

export type ResetMethod = (typeof RESET_METHOD)[keyof typeof RESET_METHOD];
