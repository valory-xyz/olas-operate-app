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
    /** @deprecated Use `includedInstances` instead. Kept for one-time migration only. */
    includedAgents?: { agentType: AgentType; order: number }[];
    includedInstances?: { serviceConfigId: string; order: number }[];
    isInitialized?: boolean;
    /** @deprecated Use `userExcludedInstances` instead. Kept for one-time migration only. */
    userExcludedAgents?: AgentType[];
    userExcludedInstances?: string[];
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
