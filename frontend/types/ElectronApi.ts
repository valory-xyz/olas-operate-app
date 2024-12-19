import { AgentType } from '@/enums/Agent';

type AgentSettings = {
  isInitialFunded: boolean;
  firstStakingRewardAchieved?: boolean;
  firstRewardNotificationShown?: boolean;
  agentEvictionAlertShown?: boolean;
  currentStakingProgram?: string;
};

export type ElectronStore = {
  environmentName?: string;
  lastSelectedAgentType?: AgentType;

  // Each agent has its own settings
  trader: AgentSettings;
  memeooorr: AgentSettings;
};

export type ElectronTrayIconStatus =
  | 'low-gas'
  | 'running'
  | 'paused'
  | 'logged-out';
