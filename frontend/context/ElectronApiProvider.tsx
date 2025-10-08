import { get } from 'lodash';
import { createContext, PropsWithChildren } from 'react';

import { Address } from '@/types/Address';
import { AgentHealthCheckResponse } from '@/types/Agent';
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
  openPath?: (filePath: string) => void;
  healthCheck?: () => Promise<
    { response: AgentHealthCheckResponse | null } | { error: string }
  >;
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
    show?: (type: 'transak' | 'web3auth') => void;
    close?: () => void;
  };
  logEvent?: (message: string) => void;
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
  openPath: () => {},
  healthCheck: async () => ({ response: null }),
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
          set: getElectronApiFunction('store.set'),
          delete: getElectronApiFunction('store.delete'),
          clear: getElectronApiFunction('store.clear'),
        },
        showNotification: getElectronApiFunction('showNotification'),
        saveLogs: getElectronApiFunction('saveLogs'),
        openPath: getElectronApiFunction('openPath'),
        healthCheck: getElectronApiFunction('healthCheck'),
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
          close: getElectronApiFunction('termsAndConditionsWindow.close'),
        },
        logEvent: getElectronApiFunction('logEvent'),
      }}
    >
      {children}
    </ElectronApiContext.Provider>
  );
};
