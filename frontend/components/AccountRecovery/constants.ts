export const RECOVERY_STEPS = {
  SelectRecoveryMethod: 'SelectRecoveryMethod',
  CreateNewPassword: 'CreateNewPassword',
  FundYourBackupWallet: 'FundYourBackupWallet',
  ApproveWithBackupWallet: 'ApproveWithBackupWallet',
} as const;

export type RecoverySteps = keyof typeof RECOVERY_STEPS;
