// TODO: move to constants
export const Pages = {
  Setup: 'Setup',
  Main: 'Main',
  Settings: 'Settings',
  HelpAndSupport: 'HelpAndSupport',
  Receive: 'Receive',
  Send: 'Send',
  ManageStaking: 'ManageStaking',
  ManageWallet: 'ManageWallet',
  RewardsHistory: 'RewardsHistory',
  AddBackupWalletViaSafe: 'AddBackupWalletViaSafe',
  SwitchAgent: 'SwitchAgent',
  AgentActivity: 'AgentActivity',
  UpdateAgentTemplate: 'UpdateAgentTemplate',
  AddFundsThroughBridge: 'AddFundsThroughBridge',
} as const;

export type Pages = (typeof Pages)[keyof typeof Pages];
