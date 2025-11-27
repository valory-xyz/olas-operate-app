/**
 * TypeScript definitions for Electron API exposed via contextBridge
 */

export interface UpdateInfo {
  version: string;
  files: Array<{
    url: string;
    sha512: string;
    size: number;
  }>;
  path: string;
  sha512: string;
  releaseDate: string;
  releaseName?: string;
  releaseNotes?: string;
}

export interface ProgressInfo {
  total: number;
  delta: number;
  transferred: number;
  percent: number;
  bytesPerSecond: number;
}

export interface ElectronUpdates {
  checkForUpdates: () => Promise<{
    updateInfo: UpdateInfo;
    cancellationToken?: any;
  } | null>;
  downloadUpdate: () => Promise<string[]>;
  quitAndInstall: () => void;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void;
  onDownloadProgress: (callback: (progress: ProgressInfo) => void) => void;
  onUpdateError: (callback: (error: string) => void) => void;
  removeUpdateListener: (
    channel: string,
    callback: (...args: any[]) => void,
  ) => void;
}

export interface ElectronAPI {
  setIsAppLoaded: (isAppLoaded: boolean) => void;
  closeApp: () => void;
  minimizeApp: () => void;
  setTrayIcon: (status: string) => void;
  ipcRenderer: {
    send: (channel: string, data?: any) => void;
    on: (channel: string, func: (...args: any[]) => void) => void;
    invoke: (channel: string, data?: any) => Promise<any>;
    removeListener: (channel: string, func: (...args: any[]) => void) => void;
  };
  store: {
    store: () => Promise<any>;
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
    clear: () => Promise<void>;
  };
  showNotification: (title: string, description?: string) => void;
  saveLogs: (data: any) => Promise<void>;
  saveLogsForSupport: (data: any) => Promise<void>;
  cleanupSupportLogs: () => Promise<void>;
  readFile: (filePath: string) => Promise<string>;
  openPath: (filePath: string) => void;
  getAppVersion: () => Promise<string>;
  updates: ElectronUpdates;
  onRampWindow: {
    show: (amountToPay: number) => Promise<void>;
    close: () => Promise<void>;
    transactionSuccess: () => Promise<void>;
    transactionFailure: () => Promise<void>;
  };
  web3AuthWindow: {
    show: () => Promise<void>;
    close: () => Promise<void>;
    authSuccess: (address: string) => Promise<void>;
  };
  termsAndConditionsWindow: {
    show: (hash: string) => Promise<void>;
  };
  logEvent: (message: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};

