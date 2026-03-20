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
    /**
     * Legacy inclusion list, keyed by AgentType.
     * @deprecated Use `includedAgentInstances` instead.
     */
    includedAgents?: { agentType: AgentType; order: number }[];
    /** Instances included in auto-run rotation, keyed by serviceConfigId. */
    includedAgentInstances?: { serviceConfigId: string; order: number }[];
    isInitialized?: boolean;
    /**
     * Legacy exclusion list, keyed by AgentType.
     * @deprecated Use `userExcludedAgentInstances` instead.
     */
    userExcludedAgents?: AgentType[];
    /** Instances explicitly excluded from auto-run by the user, keyed by serviceConfigId. */
    userExcludedAgentInstances?: string[];
  };
  lastProvidedBackupWallet?: {
    address: Nullable<string>;
    type: BackupWalletType;
  };
  /** @deprecated Use `archivedInstances` instead. Kept for one-time migration. */
  archivedAgents?: AgentType[];
  /** serviceConfigIds of archived instances (hidden from sidebar, restorable). */
  archivedInstances?: string[];
};

export type ElectronTrayIconStatus =
  | 'low-gas'
  | 'running'
  | 'paused'
  | 'logged-out';
