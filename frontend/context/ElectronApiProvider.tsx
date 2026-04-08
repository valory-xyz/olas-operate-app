import { get } from 'lodash';
import { createContext, PropsWithChildren } from 'react';

import { StoreService } from '@/service/StoreService';
import { Address } from '@/types/Address';
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

// Keys that remain in the Electron store (OS app-data). All other keys are
// backend-bound (persisted in .operate/pearl_store.json via HTTP API).
const ELECTRON_NATIVE_KEYS = new Set([
  'environmentName',
  'knownVersion',
  'hasMigratedToBackendStore',
]);

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
    debugData?: Record<string, unknown>;
  }) => Promise<{ success: true; dirPath: string } | { success?: false }>;
  saveLogsForSupport?: (data: {
    store?: PearlStore;
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
});

export const ElectronApiProvider = ({ children }: PropsWithChildren) => {
  const getElectronApiFunction = (functionNameInWindow: string) => {
    if (typeof window === 'undefined') return;

    const fn = get(window, `electronAPI.${functionNameInWindow}`);
    if (!fn || typeof fn !== 'function') {
      throw new Error(
        `Function ${functionNameInWindow} not found in window.electronAPI`,
      );
    }

    return fn;
  };

  return (
    <ElectronApiContext.Provider
      value={{
        getAppVersion: getElectronApiFunction('getAppVersion'),
        setIsAppLoaded: getElectronApiFunction('setIsAppLoaded'),
        closeApp: getElectronApiFunction('closeApp'),
        minimizeApp: getElectronApiFunction('minimizeApp'),
        setTrayIcon: getElectronApiFunction('setTrayIcon'),
        ipcRenderer: {
          send: getElectronApiFunction('ipcRenderer.send'),
          on: getElectronApiFunction('ipcRenderer.on'),
          invoke: getElectronApiFunction('ipcRenderer.invoke'),
          removeListener: getElectronApiFunction('ipcRenderer.removeListener'),
        },
        store: {
          store: getElectronApiFunction('store.store'),
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
            return StoreService.setStoreKey(key, value);
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
            return StoreService.deleteStoreKey(key);
          },
          clear: getElectronApiFunction('store.clear'),
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
      }}
    >
      {children}
    </ElectronApiContext.Provider>
  );
};
