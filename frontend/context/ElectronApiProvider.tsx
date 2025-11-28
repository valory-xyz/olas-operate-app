import { get } from 'lodash';
import { createContext, PropsWithChildren, useEffect, useState } from 'react';

import { Address } from '@/types/Address';
import { ElectronStore, ElectronTrayIconStatus } from '@/types/ElectronApi';

type ElectronApiContextProps = {
  getAppVersion?: () => Promise<string>;
  setIsAppLoaded?: (isLoaded: boolean) => void;
  closeApp?: () => void;
  minimizeApp?: () => void;
  setTrayIcon?: (status: ElectronTrayIconStatus) => void;
  ipcRenderer?: {
    /** send messages to main process */
    send?: (channel: string, data: unknown) => void;
    /** listen to messages from main process */
    on?: (
      channel: string,
      func: (event: unknown, data: unknown) => void,
    ) => void;
    /** send message to main process and get Promise response */
    invoke?: (channel: string, data: unknown) => Promise<unknown>;
    /** remove listener for messages from main process */
    removeListener?: (
      channel: string,
      func: (event: unknown, data: unknown) => void,
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
    store?: ElectronStore;
    debugData?: Record<string, unknown>;
  }) => Promise<{ success: true; dirPath: string } | { success?: false }>;
  saveLogsForSupport?: (data: {
    store?: ElectronStore;
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
    show?: (amountToPay: number) => void;
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
  termsAndConditionsWindow?: {
    show?: (hash?: string) => void;
    close?: () => void;
  };
  logEvent?: (message: string) => void;
  isInBackground?: boolean;
  onWindowBlur?: (callback: () => void) => void;
  onWindowFocus?: (callback: () => void) => void;
};

export const ElectronApiContext = createContext<ElectronApiContextProps>({
  getAppVersion: async () => '',
  setIsAppLoaded: () => false,
  closeApp: () => {},
  minimizeApp: () => {},
  setTrayIcon: () => {},
  ipcRenderer: {
    send: () => {},
    on: () => {},
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
  termsAndConditionsWindow: {
    show: () => {},
    close: () => {},
  },
  logEvent: () => {},
  isInBackground: false,
  onWindowBlur: () => {},
  onWindowFocus: () => {},
});

export const ElectronApiProvider = ({ children }: PropsWithChildren) => {
  const [isInBackground, setIsInBackground] = useState(false);

  // Listen to window blur and focus events from main process
  useEffect(() => {
    const onWindowBlur = get(window, 'electronAPI.onWindowBlur') as
      | ((callback: () => void) => void)
      | undefined;
    const onWindowFocus = get(window, 'electronAPI.onWindowFocus') as
      | ((callback: () => void) => void)
      | undefined;

    onWindowBlur?.(() => setIsInBackground(true));
    onWindowFocus?.(() => setIsInBackground(false));
  }, []);

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

  console.log(
    'ElectronApiProvider rendered with isInBackground:',
    isInBackground,
  );

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
          set: getElectronApiFunction('store.set'),
          delete: getElectronApiFunction('store.delete'),
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
        termsAndConditionsWindow: {
          show: getElectronApiFunction('termsAndConditionsWindow.show'),
        },
        logEvent: getElectronApiFunction('logEvent'),
        isInBackground,
      }}
    >
      {children}
    </ElectronApiContext.Provider>
  );
};
