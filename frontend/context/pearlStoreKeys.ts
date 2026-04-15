import type { PearlStore } from '@/types/ElectronApi';

/**
 * Keys that remain in the Electron store (OS app-data).
 * All other keys are backend-bound (persisted in .operate/pearl_store.json).
 */
export const ELECTRON_NATIVE_KEYS = new Set([
  'environmentName',
  'knownVersion',
  'hasMigratedToBackendStore',
  'updateAvailableKnownVersion',
]);

/**
 * Keys persisted in the backend pearl store (.operate/pearl_store.json).
 * Used for one-time migration from Electron store and for store.clear().
 */
export const BACKEND_BOUND_KEYS: (keyof PearlStore)[] = [
  'trader',
  'memeooorr',
  'modius',
  'optimus',
  'pett_ai',
  'polymarket_trader',
  'firstStakingRewardAchieved',
  'lastSelectedServiceConfigId',
  'lastSelectedAgentType',
  'archivedAgents',
  'archivedInstances',
  'lastProvidedBackupWallet',
  'autoRun',
  'recoveryPhraseBackedUp',
];
