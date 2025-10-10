// TODO: move to constants
export const Pages = {
  Setup: 'Setup',
  Main: 'Main',
  AgentStaking: 'AgentStaking',
  Settings: 'Settings',
  HelpAndSupport: 'HelpAndSupport',
  /** @deprecated use AgentStaking for V1 */
  ManageStaking: 'ManageStaking',
  /** @deprecated use PearlWallet for V1 */
  ManageWallet: 'ManageWallet',
  PearlWallet: 'PearlWallet',
  PearlWalletDeposit: 'PearlWalletDeposit',
  AgentWallet: 'AgentWallet',
  /** @deprecated remove after for V1 */
  RewardsHistory: 'RewardsHistory',
  AddBackupWalletViaSafe: 'AddBackupWalletViaSafe',
  /** @deprecated remove after for V1 */
  AgentActivity: 'AgentActivity',
  UpdateAgentTemplate: 'UpdateAgentTemplate',
  /** @deprecated remove after for V1  */
  AddFundsToMasterSafeThroughBridge: 'AddFundsToMasterSafeThroughBridge',
  /** @deprecated remove after for V1  */
  LowOperatingBalanceBridgeFunds: 'LowOperatingBalanceBridgeFunds',
  /** @deprecated remove after for V1  */
  LowSafeSignerBalanceBridgeFunds: 'LowSafeSignerBalanceBridgeFunds',
  SelectStaking: 'SelectStaking',
  ConfirmSwitch: 'ConfirmSwitch',
  FundPearlWallet: 'FundPearlWallet',
} as const;

export type Pages = (typeof Pages)[keyof typeof Pages];
