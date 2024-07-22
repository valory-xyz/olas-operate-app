import { get } from 'lodash';
import { createContext, PropsWithChildren } from 'react';

import { ElectronStore, ElectronTrayIconStatus } from '@/types/ElectronApi';

type ElectronApiContextProps = {
  closeApp?: () => void;
  minimizeApp?: () => void;
  setTrayIcon?: (status: ElectronTrayIconStatus) => void;
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

  // download new updates
  checkForUpdates?: () => Promise<void>;
  startDownload?: () => Promise<void>;
  quitAndInstall?: () => void;
};

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

export const ElectronApiContext = createContext<ElectronApiContextProps>({
  closeApp: () => {},
  minimizeApp: () => {},
  setTrayIcon: () => {},
  ipcRenderer: {
    send: () => {},
    on: () => {},
    invoke: async () => {},
  },
  store: {
    store: async () => ({}),
    get: async () => {},
    set: async () => {},
    delete: async () => {},
    clear: async () => {},
  },
  setAppHeight: () => {},
  saveLogs: async () => ({ success: false }),
  openPath: () => {},

  // download updates
  checkForUpdates: async () => {},
  startDownload: async () => {},
  quitAndInstall: async () => {},
});

export const ElectronApiProvider = ({ children }: PropsWithChildren) => {
  return (
    <ElectronApiContext.Provider
      value={{
        closeApp: getElectronApiFunction('closeApp'),
        minimizeApp: getElectronApiFunction('minimizeApp'),
        setTrayIcon: getElectronApiFunction('setTrayIcon'),
        ipcRenderer: {
          send: getElectronApiFunction('ipcRenderer.send'),
          on: getElectronApiFunction('ipcRenderer.on'),
          invoke: getElectronApiFunction('ipcRenderer.invoke'),
          removeAllListeners: getElectronApiFunction(
            'ipcRenderer.removeAllListeners',
          ),
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
        // download updates
        checkForUpdates: getElectronApiFunction('checkForUpdates'),
        startDownload: getElectronApiFunction('startDownload'),
        quitAndInstall: getElectronApiFunction('quitAndInstall'),
      }}
    >
      {children}
    </ElectronApiContext.Provider>
  );
};
