export const PAGES = {
  Setup: 'Setup',
  Main: 'Main',
  AgentStaking: 'AgentStaking',
  Settings: 'Settings',
  HelpAndSupport: 'HelpAndSupport',
  PearlWallet: 'PearlWallet',
  AgentWallet: 'AgentWallet',
  UpdateAgentTemplate: 'UpdateAgentTemplate',
  SelectStaking: 'SelectStaking',
  ConfirmSwitch: 'ConfirmSwitch',
  DepositOlasForStaking: 'DepositOlasForStaking',
  FundPearlWallet: 'FundPearlWallet',
} as const;

export type Pages = (typeof PAGES)[keyof typeof PAGES];
