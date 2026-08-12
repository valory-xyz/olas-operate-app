import { get } from 'lodash';
import { createContext, PropsWithChildren, useMemo } from 'react';

import { StoreService } from '@/service/StoreService';
import { Address } from '@/types/Address';
import { ConnectSessionResult } from '@/types/ConnectSession';
import {
  ElectronStore,
  ElectronTrayIconStatus,
  PearlStore,
} from '@/types/ElectronApi';
import {
  SwapOwnerTransactionFailure,
  SwapOwnerTransactionSuccess,
} from '@/types/Recovery';

import { emitPearlStoreDelete, emitPearlStoreSet } from './pearlStoreEventBus';
import { BACKEND_BOUND_KEYS, ELECTRON_NATIVE_KEYS } from './pearlStoreKeys';

export type PendingStoreWrite = { key: string; value: unknown };

// Module-level write queue — accumulates failed backend writes within a session.
// Persisted to electron-store on each failure so it survives restarts.
// Starts empty on process start and is seeded from electron-store by
// StoreProvider's startup flush, so a failure later in this session merges with
// the previous session's queue instead of overwriting it on disk.
let pendingWriteQueue: PendingStoreWrite[] = [];

/**
 * Adopt writes persisted by a previous session into the in-memory queue.
 * Called by StoreProvider once it has read `pendingStoreWrites` on startup.
 */
export const seedPendingWriteQueue = (entries: PendingStoreWrite[]) => {
  pendingWriteQueue = [...entries];
};

/**
 * Drop entries that were flushed to the backend successfully, keeping anything
 * queued since the flush started. Compares by identity so a fresh failure for
 * the same key (which replaced the seeded entry) is never dropped.
 * Returns the resulting queue so the caller can persist it.
 */
export const removeFlushedWrites = (flushed: PendingStoreWrite[]) => {
  const flushedEntries = new Set(flushed);
  pendingWriteQueue = pendingWriteQueue.filter(
    (entry) => !flushedEntries.has(entry),
  );
  return [...pendingWriteQueue];
};

/** Read the in-memory write queue. Used by tests only. */
export const getPendingWriteQueue = () => [...pendingWriteQueue];

// Set by `store.clear` so an in-flight startup flush stops replaying. Without
// it, a write already awaiting the backend when the reset began can land after
// the matching delete and put the key back in pearl_store.json.
let flushAborted = false;

/** True once `store.clear` has run — the startup flush must stop replaying. */
export const isPendingWriteFlushAborted = () => flushAborted;

// The startup flush, while it is running. Aborting stops the *next* iteration,
// but a write already awaiting the backend cannot be unsent — so `store.clear`
// also waits for this to settle before issuing its deletes, otherwise that
// last write lands after the delete and puts the key back.
let flushInFlight: Promise<void> | null = null;

/** Register (or clear) the startup flush. Called by StoreProvider. */
export const setPendingWriteFlush = (flush: Promise<void> | null) => {
  flushInFlight = flush;
};

/** Resolves once any in-flight startup flush has settled. Never rejects. */
export const awaitPendingWriteFlush = () =>
  flushInFlight ? flushInFlight.catch(() => {}) : Promise.resolve();

/**
 * Drop the queue and stop any in-flight startup flush. Used by `store.clear`:
 * the reset deletes backend keys, so neither the queued writes nor the replay
 * still in progress may reach the backend afterwards.
 */
export const abortPendingWriteFlush = () => {
  pendingWriteQueue = [];
  flushAborted = true;
};

/** Reset the in-memory write queue and flush state. Used by tests only. */
export const resetPendingWriteQueue = () => {
  pendingWriteQueue = [];
  flushAborted = false;
  flushInFlight = null;
};

type ElectronApiContextProps = {
  getAppVersion?: () => Promise<string>;
  setIsAppLoaded?: (isLoaded: boolean) => void;
  closeApp?: () => void;
  minimizeApp?: () => void;
  setTrayIcon?: (status: ElectronTrayIconStatus) => void;
  ipcRenderer?: {
    /** send messages to main process */
    send?: (channel: string, data: unknown) => void;
    /** listen to messages from main process, returns unsubscribe function */
    on?: (channel: string, func: (...args: unknown[]) => void) => () => void;
    /** send message to main process and get Promise response */
    invoke?: (channel: string, data: unknown) => Promise<unknown>;
    /** remove listener for messages from main process */
    removeListener?: (
      channel: string,
      func: (...args: unknown[]) => void,
    ) => void;
  };
  store?: {
    store?: () => Promise<ElectronStore>;
    get?: (key: string) => Promise<unknown>;
    set?: (key: string, value: unknown) => Promise<void>;
    delete?: (key: string) => Promise<void>;
    clear?: () => Promise<void>;
  };
  notifyAgentRunning?: () => void;
  showNotification?: (title: string, body?: string) => void;
  saveLogs?: (data: {
    store?: PearlStore;
    electronStore?: ElectronStore;
    debugData?: Record<string, unknown>;
  }) => Promise<{ success: true; dirPath: string } | { success?: false }>;
  saveLogsForSupport?: (data: {
    store?: PearlStore;
    electronStore?: ElectronStore;
    debugData?: Record<string, unknown>;
  }) => Promise<
    { success: true; filePath: string; fileName: string } | { success?: false }
  >;
  cleanupSupportLogs?: () => Promise<void>;
  readFile?: (filePath: string) => Promise<
    | {
        success: true;
        fileName: string;
        fileContent: string;
        mimeType: string;
      }
    | { success?: false; error?: string }
  >;
  openPath?: (filePath: string) => void;
  onRampWindow?: {
    show?: (
      amountToPay: number,
      networkName: string,
      cryptoCurrencyCode: string,
    ) => void;
    close?: () => void;
    /**
     * @deprecated On-ramp window will be closed automatically
     * after the master EOA receives the funds.
     */
    transactionSuccess?: () => void;
    transactionFailure?: () => void;
  };
  web3AuthWindow?: {
    show?: () => void;
    close?: () => void;
    authSuccess?: (address: Address) => void;
  };
  web3AuthSwapOwnerWindow?: {
    show?: (params: {
      safeAddress: string;
      oldOwnerAddress: string;
      newOwnerAddress: string;
      backupOwnerAddress: string;
      chainId: number;
    }) => void;
    close?: () => void;
    swapSuccess?: (result: SwapOwnerTransactionSuccess) => void;
    swapFailure?: (result: SwapOwnerTransactionFailure) => void;
  };
  termsAndConditionsWindow?: {
    show?: (hash?: string) => void;
    close?: () => void;
  };
  logEvent?: (message: string) => void;
  nextLogError?: (error: Error, errorInfo: unknown) => void;
  /** IPC bridge for the OS wake-lock — used by useWakeLock during auto-run. */
  wakeLock?: {
    start?: () => Promise<void>;
    stop?: () => Promise<void>;
  };
  /**
   * IPC bridge for the Connect agent's local server. The launch is proxied
   * through the main process because that server enables no CORS, so the
   * renderer cannot call it directly.
   */
  connect?: {
    startSession?: () => Promise<ConnectSessionResult>;
  };
  /** IPC bridge for OTA updates — distinct from the electron-updater instance in electron/update.js */
  autoUpdater?: {
    checkForUpdates?: () => Promise<unknown>;
    downloadUpdate?: () => Promise<void>;
    cancelDownload?: () => void;
    quitAndInstall?: () => Promise<void>;
    onUpdateAvailable?: (
      cb: (info: { version: string; releaseNotes: string | null }) => void,
    ) => () => void;
    onDownloadProgress?: (
      cb: (progress: {
        percent: number;
        transferred: number;
        total: number;
        bytesPerSecond: number;
      }) => void,
    ) => () => void;
    onUpdateDownloaded?: (cb: () => void) => () => void;
    onUpdateError?: (cb: (err: { message: string }) => void) => () => void;
    onUpdateNotAvailable?: (cb: () => void) => () => void;
  };
};

export const ElectronApiContext = createContext<ElectronApiContextProps>({
  getAppVersion: async () => '',
  setIsAppLoaded: () => false,
  closeApp: () => {},
  minimizeApp: () => {},
  setTrayIcon: () => {},
  ipcRenderer: {
    send: () => {},
    on: () => () => {},
    invoke: async () => {},
    removeListener: () => {},
  },
  store: {
    store: async () => ({}),
    get: async () => {},
    set: async () => {},
    delete: async () => {},
    clear: async () => {},
  },
  saveLogs: async () => ({ success: false }),
  saveLogsForSupport: async () => ({ success: false }),
  cleanupSupportLogs: async () => {},
  readFile: async () => ({ success: false }),
  openPath: () => {},
  onRampWindow: {
    show: () => {},
    transactionSuccess: () => {},
  },
  web3AuthWindow: {
    show: () => {},
    close: () => {},
    authSuccess: () => {},
  },
  web3AuthSwapOwnerWindow: {
    show: () => {},
    close: () => {},
    swapSuccess: () => {},
    swapFailure: () => {},
  },
  termsAndConditionsWindow: {
    show: () => {},
    close: () => {},
  },
  logEvent: () => {},
  nextLogError: () => {},
  wakeLock: {
    start: async () => {},
    stop: async () => {},
  },
  connect: {
    startSession: async () => ({ reachable: false }),
  },
  autoUpdater: {
    checkForUpdates: async () => {},
    downloadUpdate: async () => {},
    cancelDownload: () => {},
    quitAndInstall: async () => {},
    onUpdateAvailable: () => () => {},
    onDownloadProgress: () => () => {},
    onUpdateDownloaded: () => () => {},
    onUpdateError: () => () => {},
    onUpdateNotAvailable: () => () => {},
  },
});

const getElectronApiFunction = (
  functionNameInWindow: string,
  silent = false,
) => {
  if (typeof window === 'undefined') return;

  const fn = get(window, `electronAPI.${functionNameInWindow}`);
  if (!fn || typeof fn !== 'function') {
    if (silent) return undefined;
    throw new Error(
      `Function ${functionNameInWindow} not found in window.electronAPI`,
    );
  }

  return fn;
};

const logStoreEvent = (msg: string) => {
  const fn = getElectronApiFunction('logEvent') as
    | ((m: string) => void)
    | undefined;
  fn?.(`pearl_store: ${msg}`);
};

/**
 * Persist the write queue to electron-store via raw IPC. Never goes through
 * `store.set` — this runs inside that function's own callbacks, so routing back
 * through it would recurse.
 *
 * Returns false when the IPC bridge is unavailable, so callers can say the queue
 * is memory-only rather than logging a durability they did not get.
 */
const persistPendingWriteQueue = () => {
  const rawStoreSet = getElectronApiFunction('store.set', true) as
    | ((k: string, v: unknown) => Promise<void>)
    | undefined;
  if (!rawStoreSet) return false;

  rawStoreSet('pendingStoreWrites', [...pendingWriteQueue]).catch(
    (queueError) => {
      logStoreEvent(
        `Failed to persist write queue (${pendingWriteQueue.length} entries lost on restart): ${queueError}`,
      );
      console.error('Failed to persist pending write queue:', queueError);
    },
  );
  return true;
};

/**
 * Drop any queued write for a key that has just been persisted (or deleted)
 * successfully — replaying it on the next launch would undo the newer value.
 */
const dropQueuedWritesFor = (key: string) => {
  if (!pendingWriteQueue.some((entry) => entry.key === key)) return;

  pendingWriteQueue = pendingWriteQueue.filter((entry) => entry.key !== key);
  const persisted = persistPendingWriteQueue();
  logStoreEvent(
    persisted
      ? `Dropped superseded queued write for '${key}'`
      : `Dropped superseded queued write for '${key}' in memory only — store.set IPC unavailable, the stale entry remains on disk`,
  );
};

export const ElectronApiProvider = ({ children }: PropsWithChildren) => {
  // Stabilize ipcRenderer so consumers with useEffect([…, ipcRenderer]) don't
  // fire spurious cleanup→body cycles on every parent re-render (e.g.
  // useWakeLock would flap wake-lock-stop → wake-lock-start each render).
  const ipcRenderer = useMemo<ElectronApiContextProps['ipcRenderer']>(
    () => ({
      send: getElectronApiFunction('ipcRenderer.send'),
      on: getElectronApiFunction('ipcRenderer.on'),
      invoke: getElectronApiFunction('ipcRenderer.invoke'),
      removeListener: getElectronApiFunction('ipcRenderer.removeListener'),
    }),
    [],
  );

  // Same stability rationale as ipcRenderer above — keeps useWakeLock's
  // effect from flapping on parent re-renders.
  const wakeLock = useMemo<ElectronApiContextProps['wakeLock']>(
    () => ({
      start: getElectronApiFunction('wakeLock.start', true),
      stop: getElectronApiFunction('wakeLock.stop', true),
    }),
    [],
  );

  // Stabilized for the same reason: useConnectSession keys a React Query on it.
  const connect = useMemo<ElectronApiContextProps['connect']>(
    () => ({
      startSession: getElectronApiFunction('connect.startSession', true),
    }),
    [],
  );

  // Stabilize autoUpdater so consumers with useEffect([autoUpdater]) don't
  // tear down and re-register IPC listeners on every parent render
  // (UpdateAvailableModal would otherwise drop progress events mid-download).
  const autoUpdater = useMemo<ElectronApiContextProps['autoUpdater']>(
    () => ({
      checkForUpdates: getElectronApiFunction(
        'autoUpdater.checkForUpdates',
        true,
      ),
      downloadUpdate: getElectronApiFunction(
        'autoUpdater.downloadUpdate',
        true,
      ),
      cancelDownload: getElectronApiFunction(
        'autoUpdater.cancelDownload',
        true,
      ),
      quitAndInstall: getElectronApiFunction(
        'autoUpdater.quitAndInstall',
        true,
      ),
      onUpdateAvailable: getElectronApiFunction(
        'autoUpdater.onUpdateAvailable',
        true,
      ),
      onDownloadProgress: getElectronApiFunction(
        'autoUpdater.onDownloadProgress',
        true,
      ),
      onUpdateDownloaded: getElectronApiFunction(
        'autoUpdater.onUpdateDownloaded',
        true,
      ),
      onUpdateError: getElectronApiFunction('autoUpdater.onUpdateError', true),
      onUpdateNotAvailable: getElectronApiFunction(
        'autoUpdater.onUpdateNotAvailable',
        true,
      ),
    }),
    [],
  );

  return (
    <ElectronApiContext.Provider
      value={{
        getAppVersion: getElectronApiFunction('getAppVersion'),
        setIsAppLoaded: getElectronApiFunction('setIsAppLoaded'),
        closeApp: getElectronApiFunction('closeApp'),
        minimizeApp: getElectronApiFunction('minimizeApp'),
        setTrayIcon: getElectronApiFunction('setTrayIcon'),
        ipcRenderer,
        store: {
          store: getElectronApiFunction('store.store'),
          // NOTE: store.get reads from the Electron store only (OS app-data).
          // Backend-bound keys (agent settings, autoRun, etc.) are NOT available
          // here — use useStore() for pearl store data instead.
          get: getElectronApiFunction('store.get'),
          set: (key: string, value: unknown) => {
            if (ELECTRON_NATIVE_KEYS.has(key.split('.')[0])) {
              const fn = getElectronApiFunction('store.set') as unknown as (
                k: string,
                v: unknown,
              ) => Promise<void>;
              return fn(key, value);
            }
            // Backend-bound key: persist to .operate/pearl_store.json and update React state.
            emitPearlStoreSet(key, value);
            // Two-callback form, not .then().catch() — the success path must
            // not be able to fall into the enqueue path.
            return StoreService.setStoreKey(key, value).then(
              () => dropQueuedWritesFor(key),
              (error) => {
                logStoreEvent(`Failed to persist key '${key}': ${error}`);
                console.error(`Failed to persist store key '${key}':`, error);

                // Queue the failed write for flush on next launch, keeping only
                // the latest value per key — replaying a stale earlier value
                // would clobber whatever the user set afterwards. Appending the
                // fresh entry preserves the relative order of the other keys.
                pendingWriteQueue = [
                  ...pendingWriteQueue.filter((entry) => entry.key !== key),
                  { key, value },
                ];
                const persisted = persistPendingWriteQueue();

                logStoreEvent(
                  persisted
                    ? `Enqueued failed write for '${key}' (${pendingWriteQueue.length} pending)`
                    : `Queued failed write for '${key}' in memory only — store.set IPC unavailable, it will not survive a restart`,
                );
              },
            );
          },
          delete: (key: string) => {
            if (ELECTRON_NATIVE_KEYS.has(key.split('.')[0])) {
              const fn = getElectronApiFunction('store.delete') as unknown as (
                k: string,
              ) => Promise<void>;
              return fn(key);
            }
            // Backend-bound key: remove from .operate/pearl_store.json and update React state.
            emitPearlStoreDelete(key);
            return StoreService.deleteStoreKey(key).then(
              // A queued write for a key the user has since deleted must not be
              // replayed — that would resurrect the value on the next launch.
              () => dropQueuedWritesFor(key),
              (error) => {
                logStoreEvent(`Failed to delete key '${key}': ${error}`);
                console.error(`Failed to delete store key '${key}':`, error);
              },
            );
          },
          clear: () => {
            // Drop queued writes up front, and stop any startup flush still
            // replaying: store-clear wipes the persisted queue, so anything
            // left in memory would be re-persisted by the next failed write.
            abortPendingWriteFlush();

            // Then let the flush settle before deleting. Aborting stops the
            // remaining entries, but a write already sent has to land first —
            // otherwise it arrives after the delete and restores the key.
            return awaitPendingWriteFlush()
              .then(() => {
                // Clear Electron-native keys via IPC.
                const clearFn = getElectronApiFunction(
                  'store.clear',
                ) as unknown as () => Promise<void>;
                // Clear backend-bound keys from pearl_store.json.
                const backendDeletes = BACKEND_BOUND_KEYS.map((key) => {
                  emitPearlStoreDelete(key);
                  return StoreService.deleteStoreKey(key);
                });
                return Promise.all([clearFn(), ...backendDeletes]);
              })
              .then(() => {})
              .catch((error) => {
                logStoreEvent(`Failed to clear store: ${error}`);
                console.error('Failed to clear store:', error);
              });
          },
        },
        showNotification: getElectronApiFunction('showNotification'),
        saveLogs: getElectronApiFunction('saveLogs'),
        saveLogsForSupport: getElectronApiFunction('saveLogsForSupport'),
        cleanupSupportLogs: getElectronApiFunction('cleanupSupportLogs'),
        readFile: getElectronApiFunction('readFile'),
        openPath: getElectronApiFunction('openPath'),
        onRampWindow: {
          show: getElectronApiFunction('onRampWindow.show'),
          close: getElectronApiFunction('onRampWindow.close'),
          transactionSuccess: getElectronApiFunction(
            'onRampWindow.transactionSuccess',
          ),
          transactionFailure: getElectronApiFunction(
            'onRampWindow.transactionFailure',
          ),
        },
        web3AuthWindow: {
          show: getElectronApiFunction('web3AuthWindow.show'),
          close: getElectronApiFunction('web3AuthWindow.close'),
          authSuccess: getElectronApiFunction('web3AuthWindow.authSuccess'),
        },
        web3AuthSwapOwnerWindow: {
          show: getElectronApiFunction('web3AuthSwapOwnerWindow.show'),
          close: getElectronApiFunction('web3AuthSwapOwnerWindow.close'),
          swapSuccess: getElectronApiFunction(
            'web3AuthSwapOwnerWindow.swapSuccess',
          ),
          swapFailure: getElectronApiFunction(
            'web3AuthSwapOwnerWindow.swapFailure',
          ),
        },
        termsAndConditionsWindow: {
          show: getElectronApiFunction('termsAndConditionsWindow.show'),
        },
        logEvent: getElectronApiFunction('logEvent'),
        nextLogError: getElectronApiFunction('nextLogError'),
        wakeLock,
        connect,
        autoUpdater,
      }}
    >
      {children}
    </ElectronApiContext.Provider>
  );
};
