import { AgentMap, AgentType } from '@/constants';

import { BackupWalletType } from './BackupWallet';
import { Nullable } from './Util';

type AgentSettings = {
  isInitialFunded: boolean | Record<string, boolean>;
};

export type ElectronStore = {
  // Global settings
  environmentName?: string;
  /** @deprecated Use `lastSelectedServiceConfigId` instead. Kept for one-time migration only. */
  lastSelectedAgentType?: AgentType;
  lastSelectedServiceConfigId?: string;
  knownVersion?: string;

  // First time user settings
  firstStakingRewardAchieved?: boolean;
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
    /** @deprecated Use `includedAgentInstances` instead. Kept for one-time migration only. */
    includedAgents?: { agentType: AgentType; order: number }[];
    includedAgentInstances?: { serviceConfigId: string; order: number }[];
    isInitialized?: boolean;
    /** @deprecated Use `userExcludedAgentInstances` instead. Kept for one-time migration only. */
    userExcludedAgents?: AgentType[];
    userExcludedAgentInstances?: string[];
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
