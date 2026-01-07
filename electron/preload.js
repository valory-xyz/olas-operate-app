const { contextBridge, ipcRenderer } = require('electron/renderer');

/** IPC methods for transak window */
const onRampWindow = {
  show: (amountToPay, networkName, cryptoCurrencyCode) =>
    ipcRenderer.invoke(
      'onramp-window-show',
      amountToPay,
      networkName,
      cryptoCurrencyCode,
    ),
  close: () => ipcRenderer.invoke('onramp-window-close'),
  transactionSuccess: () => ipcRenderer.invoke('onramp-transaction-success'),
  transactionFailure: () => ipcRenderer.invoke('onramp-transaction-failure'),
};

/** IPC methods for web3auth window */
const web3AuthWindow = {
  show: () => ipcRenderer.invoke('web3auth-window-show'),
  close: () => ipcRenderer.invoke('web3auth-window-close'),
  authSuccess: (address) =>
    ipcRenderer.invoke('web3auth-address-received', address),
};

/** IPC methods for web3auth swap owner window */
const web3AuthSwapOwnerWindow = {
  show: (params) =>
    ipcRenderer.invoke('web3auth-swap-owner-window-show', params),
  close: () => ipcRenderer.invoke('web3auth-swap-owner-window-close'),
  swapSuccess: (result) =>
    ipcRenderer.invoke('web3auth-swap-owner-success', result),
  swapFailure: (result) =>
    ipcRenderer.invoke('web3auth-swap-owner-failure', result),
};

/** IPC methods for terms window */
const termsAndConditionsWindow = {
  show: (hash) => ipcRenderer.invoke('terms-window-show', hash),
};

contextBridge.exposeInMainWorld('electronAPI', {
  setIsAppLoaded: (isAppLoaded) =>
    ipcRenderer.send('is-app-loaded', isAppLoaded),
  closeApp: () => ipcRenderer.send('close-app'),
  minimizeApp: () => ipcRenderer.send('minimize-app'),
  setTrayIcon: (status) => ipcRenderer.send('tray', status),
  ipcRenderer: {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) =>
      ipcRenderer.on(channel, (event, ...args) => func(...args)),
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),
    removeListener: (channel, func) =>
      ipcRenderer.removeListener(channel, func),
  },
  store: {
    store: () => ipcRenderer.invoke('store'),
    get: (key) => ipcRenderer.invoke('store-get', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
    delete: (key) => ipcRenderer.invoke('store-delete', key),
    clear: () => ipcRenderer.invoke('store-clear'),
  },
  showNotification: (title, description) =>
    ipcRenderer.send('show-notification', title, description),
  saveLogs: (data) => ipcRenderer.invoke('save-logs', data),
  saveLogsForSupport: (data) =>
    ipcRenderer.invoke('save-logs-for-support', data),
  cleanupSupportLogs: () => ipcRenderer.invoke('cleanup-support-logs'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  openPath: (filePath) => ipcRenderer.send('open-path', filePath),
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  onRampWindow,
  web3AuthWindow,
  web3AuthSwapOwnerWindow,
  termsAndConditionsWindow,
  logEvent: (message) => ipcRenderer.invoke('log-event', message),
  nextLogError: (error, errorInfo) =>
    ipcRenderer.invoke('next-log-error', error, errorInfo),
});
