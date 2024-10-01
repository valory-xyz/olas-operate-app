import { get } from 'lodash';
import { createContext, PropsWithChildren } from 'react';

import {
  ElectronStore,
  ElectronTrayIconStatus,
  RecursiveFunction,
} from '@/types/ElectronApi';

type ElectronApiContextProps = {
  setIsAppLoaded?: (isLoaded: boolean) => void;
  closeApp?: () => void;
  minimizeApp?: () => void;
  setTrayIcon?: (status: ElectronTrayIconStatus) => void;
  ota?: {
    checkForUpdates?: () => Promise<unknown>;
    downloadUpdate?: () => Promise<unknown>;
    quitAndInstall?: () => Promise<unknown>;
  };
  ipcRenderer?: {
    send?: (channel: string, data: unknown) => void; // send messages to main process
    on?: (
      channel: string,
      func: (event: unknown, data: unknown) => void,
    ) => void; // listen to messages from main process
    invoke?: (channel: string, data: unknown) => Promise<unknown>; // send message to main process and get Promise response
    removeAllListeners?: (channel: string) => void;
  };
  store?: {
    store?: () => Promise<ElectronStore>;
    get?: (key: string) => Promise<unknown>;
    set?: (key: string, value: unknown) => Promise<void>;
    delete?: (key: string) => Promise<void>;
    clear?: () => Promise<void>;
  };
  setAppHeight?: (height: unknown) => void;
  notifyAgentRunning?: () => void;
  showNotification?: (title: string, body?: string) => void;
  saveLogs?: (data: {
    store?: ElectronStore;
    debugData?: Record<string, unknown>;
  }) => Promise<{ success: true; dirPath: string } | { success?: false }>;
  openPath?: (filePath: string) => void;
};

export const ElectronApiContext = createContext<ElectronApiContextProps>({
  /* @note may not be necessary to provide default values */
  // setIsAppLoaded: () => false,
  // closeApp: () => {},
  // minimizeApp: () => {},
  // setTrayIcon: () => {},
  // ota: {
  //   checkForUpdates: async () => {},
  //   downloadUpdate: async () => {},
  //   quitAndInstall: async () => {},
  // },
  // ipcRenderer: {
  //   send: () => {},
  //   on: () => {},
  //   invoke: async () => {},
  //   removeAllListeners: () => {},
  // },
  // store: {
  //   store: async () => ({}),
  //   get: async () => {},
  //   set: async () => {},
  //   delete: async () => {},
  //   clear: async () => {},
  // },
  // setAppHeight: () => {},
  // saveLogs: async () => ({ success: false }),
  // openPath: () => {},
});

export const ElectronApiProvider = ({ children }: PropsWithChildren) => {
  const getElectronApiFunction = <
    T extends RecursiveFunction<ElectronApiContextProps>,
  >(
    functionNameInWindow: string,
  ) => {
    if (typeof window === 'undefined') return;

    const fn = get(
      window,
      `electronAPI.${functionNameInWindow}`,
    ) as unknown as T;
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
        ota: {
          checkForUpdates: getElectronApiFunction('ota.checkForUpdates'),
          downloadUpdate: getElectronApiFunction('ota.downloadUpdate'),
          quitAndInstall: getElectronApiFunction('ota.quitAndInstall'),
        },
        setIsAppLoaded: getElectronApiFunction('setIsAppLoaded'),
        closeApp: getElectronApiFunction('closeApp'),
        minimizeApp: getElectronApiFunction('minimizeApp'),
        setTrayIcon: getElectronApiFunction('setTrayIcon'),
        ipcRenderer: {
          send: getElectronApiFunction('ipcRenderer.send'),
          on: getElectronApiFunction('ipcRenderer.on'),
          invoke: getElectronApiFunction('ipcRenderer.invoke'),
        },
        store: {
          store: getElectronApiFunction('store.store'),
          get: getElectronApiFunction('store.get'),
          set: getElectronApiFunction('store.set'),
          delete: getElectronApiFunction('store.delete'),
          clear: getElectronApiFunction('store.clear'),
        },
        setAppHeight: getElectronApiFunction('setAppHeight'),
        showNotification: getElectronApiFunction('showNotification'),
        saveLogs: getElectronApiFunction('saveLogs'),
        openPath: getElectronApiFunction('openPath'),
      }}
    >
      {children}
    </ElectronApiContext.Provider>
  );
};
