import { AgentMap, AgentType } from '@/constants';

import { BackupWalletType } from './BackupWallet';
import { Nullable } from './Util';

/**
 * One-time post-setup questionnaire state (OPE-1899).
 *
 * Backend-bound so it travels with `.operate`: "shown once, ever" is per Pearl account, so a
 * user who migrates machines must not be prompted again. Grouped under one key rather than five
 * top-level ones, so the whole feature is a single `BACKEND_BOUND_KEYS` entry.
 */
export type OnboardingSurveyState = {
  /**
   * Set once, on the first hydration after the feature ships. True for an account that already
   * had a deployed service, i.e. one that predates the `firstAppOpenedAt` timestamp, so its
   * time-to-first-success can never be computed and is reported as `null`.
   */
  timingUnavailable?: boolean;
  /** ISO timestamp of the first time the modal was opened. Its absence means "never shown". */
  firstShownAt?: string;
  /** The agent whose success fired the trigger — not whichever agent is selected at submit time. */
  agentType?: AgentType;
  /** Set when the user closes the modal without submitting. */
  dismissed?: boolean;
  /** Set on any 2xx from pearl-api. Removes the nudge for good. */
  completed?: boolean;
};

type AgentSettings = {
  isInitialFunded: boolean | Record<string, boolean>;
  /** @deprecated Preserved during migration from boolean → per-service record. */
  isInitialFundedLegacy?: boolean;
  firstRunCompleted?: Record<string, boolean>;
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
  [AgentMap.Basius]?: AgentSettings;
  [AgentMap.PettAi]?: AgentSettings;
  [AgentMap.Polystrat]?: AgentSettings;
  [AgentMap.Connect]?: AgentSettings;

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

  /** When true (and auto-run is enabled), prevents the OS from sleeping. */
  keepDeviceAwake?: boolean;

  onboardingSurvey?: OnboardingSurveyState;
};

/**
 * Electron-native store shape — lives in the OS app-data directory.
 * Only fields that are genuinely Electron-specific belong here.
 */
export type ElectronStore = {
  environmentName?: string;
  knownVersion?: string;
  /** Stores the latest app version for which the "update available" modal was dismissed. */
  updateAvailableKnownVersion?: string;
  /**
   * ISO timestamp of the very first app launch, written once by the main process.
   *
   * Electron-native rather than backend-bound because it is recorded before an account — and so
   * before `.operate/pearl_store.json` — exists. The cost is that it does not follow the user to
   * a new machine; the survey contract already carries a `null` path for exactly that gap.
   */
  firstAppOpenedAt?: string;
};

export type OsInfo = {
  type: string;
  platform: string;
  arch: string;
  release: string;
};

export type ElectronTrayIconStatus =
  | 'low-gas'
  | 'running'
  | 'paused'
  | 'logged-out';
