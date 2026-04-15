import { AgentMap, AgentType } from '@/constants';

import { BackupWalletType } from './BackupWallet';
import { Nullable } from './Util';

type AgentSettings = {
  isInitialFunded: boolean | Record<string, boolean>;
  /** @deprecated Preserved during migration from boolean → per-service record. */
  isInitialFundedLegacy?: boolean;
};

/**
 * Backend-sourced persistent store shape, backed by .operate/pearl_store.json.
 * This travels with the .operate folder, surviving machine migrations.
 */
export type PearlStore = {
  // First time user settings
  firstStakingRewardAchieved?: boolean;

  /** @deprecated Use `lastSelectedServiceConfigId` instead. Kept for one-time migration only. */
  lastSelectedAgentType?: AgentType;
  lastSelectedServiceConfigId?: string;

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

  recoveryPhraseBackedUp?: boolean;
};

/**
 * Electron-native store shape — lives in the OS app-data directory.
 * Only fields that are genuinely Electron-specific belong here.
 */
export type ElectronStore = {
  environmentName?: string;
  knownVersion?: string;
  /** Set to true after the one-time migration from Electron store to pearl_store.json. */
  hasMigratedToBackendStore?: boolean;
  /** Stores the latest app version for which the "update available" modal was dismissed. */
  updateAvailableKnownVersion?: string;
};

export type ElectronTrayIconStatus =
  | 'low-gas'
  | 'running'
  | 'paused'
  | 'logged-out';
