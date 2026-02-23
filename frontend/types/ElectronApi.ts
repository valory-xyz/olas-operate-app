import { AgentMap, AgentType } from '@/constants';

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
  recoveryPhraseBackedUp?: boolean;
  mnemonicExists?: boolean;

  // Each agent has its own settings
  [AgentMap.PredictTrader]?: AgentSettings;
  [AgentMap.AgentsFun]?: AgentSettings;
  [AgentMap.Modius]?: AgentSettings;
  [AgentMap.Optimus]?: AgentSettings;
  [AgentMap.PettAi]?: AgentSettings;
  [AgentMap.Polystrat]?: AgentSettings;
  autoRun?: {
    enabled?: boolean;
    currentAgent?: AgentType | null;
    includedAgents?: { agentType: AgentType; order: number }[];
  };
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
