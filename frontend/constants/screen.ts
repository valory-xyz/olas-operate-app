export const SettingsScreenMap = {
  Main: 'Main',
  AddBackupWalletMethod: 'AddBackupWalletMethod',
  AddBackupWalletManual: 'AddBackupWalletManual',
  UpdateBackupWalletMethod: 'UpdateBackupWalletMethod',
  UpdateBackupWalletManual: 'UpdateBackupWalletManual',
  UpdateBackupWalletConfirm: 'UpdateBackupWalletConfirm',
} as const;

export type SettingsScreen = keyof typeof SettingsScreenMap;
