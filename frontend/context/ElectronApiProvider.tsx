import { get } from 'lodash';
import { createContext, PropsWithChildren } from 'react';

import { AgentHealthCheck } from '@/types/Agent';
import { XCookie } from '@/types/Cookies';
import { ElectronStore, ElectronTrayIconStatus } from '@/types/ElectronApi';

type ElectronApiAgentActivityWindow = {
  init: () => Promise<void>;
  goto: (url: string) => void;
  hide: () => void;
  show: () => void;
  close: () => void;
  minimize: () => void;
};

type ElectronApiContextProps = {
  getAppVersion?: () => Promise<string>;
  setIsAppLoaded?: (isLoaded: boolean) => void;
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
  validateTwitterLogin?: ({
    username,
    password,
    email,
  }: {
    username: string;
    password: string;
    email: string;
  }) => Promise<{ success: boolean; cookies?: XCookie[] }>;
  healthCheck?: () => Promise<
    { response: AgentHealthCheck | null } | { error: string }
  >;
  agentActivityWindow?: Partial<ElectronApiAgentActivityWindow>;
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
  validateTwitterLogin: async () => ({ success: false }),
  healthCheck: async () => ({ response: null }),
  agentActivityWindow: {
    init: async () => {},
    goto: () => {},
    hide: () => {},
    show: () => {},
    close: () => {},
    minimize: () => {},
  },
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
        validateTwitterLogin: getElectronApiFunction('validateTwitterLogin'),
        healthCheck: getElectronApiFunction('healthCheck'),
        agentActivityWindow: {
          init: getElectronApiFunction('agentActivityWindow.init'),
          goto: getElectronApiFunction('agentActivityWindow.goto'),
          hide: getElectronApiFunction('agentActivityWindow.hide'),
          show: getElectronApiFunction('agentActivityWindow.show'),
          close: getElectronApiFunction('agentActivityWindow.close'),
          minimize: getElectronApiFunction('agentActivityWindow.minimize'),
        },
      }}
    >
      {children}
    </ElectronApiContext.Provider>
  );
};
