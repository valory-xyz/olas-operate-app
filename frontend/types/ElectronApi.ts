import { AgentType } from '@/enums/Agent';

import { BackupWalletType } from './BackupWallet';
import { Nullable } from './Util';

type AgentSettings = {
  isInitialFunded: boolean;
  isProfileWarningDisplayed: boolean;
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
  [AgentType.Modius]?: AgentSettings;
  [AgentType.Optimus]?: AgentSettings;
  lastProvidedBackupWallet?: {
    address: Nullable<string>;
    type: BackupWalletType;
  };
};

export type ElectronTrayIconStatus =
  | 'low-gas'
  | 'running'
  | 'paused'
  | 'logged-out';
