import { AgentType } from '@/enums/Agent';

type AgentSettings = {
  isInitialFunded: boolean;
};

export type ElectronStore = {
  // Global settings
  environmentName?: string;
  lastSelectedAgentType?: AgentType;
  knownVersion?: string;

  // First time user settings
  firstStakingRewardAchieved?: boolean;
  firstRewardNotificationShown?: boolean;
  agentEvictionAlertShown?: boolean;

  // Each agent has its own settings
  [AgentType.PredictTrader]?: AgentSettings;
  [AgentType.AgentsFun]?: AgentSettings;
  [AgentType.AgentsFunCelo]?: AgentSettings;
  [AgentType.Modius]?: AgentSettings & {
    isProfileWarningDisplayed: boolean;
  };
  [AgentType.Optimus]?: AgentSettings & {
    isProfileWarningDisplayed: boolean;
  };
};

export type ElectronTrayIconStatus =
  | 'low-gas'
  | 'running'
  | 'paused'
  | 'logged-out';
