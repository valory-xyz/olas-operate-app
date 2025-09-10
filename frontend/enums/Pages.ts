// TODO: move to constants
export const Pages = {
  Setup: 'Setup',
  Main: 'Main',
  AgentStaking: 'AgentStaking',
  Settings: 'Settings',
  HelpAndSupport: 'HelpAndSupport',
  Receive: 'Receive',
  Send: 'Send',
  ManageStaking: 'ManageStaking',
  ManageWallet: 'ManageWallet',
  RewardsHistory: 'RewardsHistory',
  AddBackupWalletViaSafe: 'AddBackupWalletViaSafe',
  AgentActivity: 'AgentActivity',
  UpdateAgentTemplate: 'UpdateAgentTemplate',
  AddFundsToMasterSafeThroughBridge: 'AddFundsToMasterSafeThroughBridge',
  LowOperatingBalanceBridgeFunds: 'LowOperatingBalanceBridgeFunds',
  LowSafeSignerBalanceBridgeFunds: 'LowSafeSignerBalanceBridgeFunds',
  SelectStaking: 'SelectStaking',
  ConfirmSwitch: 'ConfirmSwitch',
} as const;

export type Pages = (typeof Pages)[keyof typeof Pages];
