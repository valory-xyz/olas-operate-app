const { contextBridge, ipcRenderer } = require('electron/renderer');

/** IPC methods for controlling agent activity window */
const agentActivityWindow = {
  init: () => ipcRenderer.invoke('agent-activity-window-init'),
  goto: (url) => ipcRenderer.invoke('agent-activity-window-goto', url),
  hide: () => ipcRenderer.invoke('agent-activity-window-hide'),
  show: () => ipcRenderer.invoke('agent-activity-window-show'),
  close: () => ipcRenderer.invoke('agent-activity-window-close'),
  minimize: () => ipcRenderer.invoke('agent-activity-window-minimize'),
};

/** IPC methods for transak window */
const onRampWindow = {
  show: (amountToPay) => ipcRenderer.invoke('onramp-window-show', amountToPay),
  close: () => ipcRenderer.invoke('onramp-window-close'),
  transactionSuccess: () => ipcRenderer.invoke('onramp-transaction-success'),
  transactionFailure: () => ipcRenderer.invoke('onramp-transaction-failure'),
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
  setAppHeight: (height) => ipcRenderer.send('set-height', height),
  showNotification: (title, description) =>
    ipcRenderer.send('show-notification', title, description),
  saveLogs: (data) => ipcRenderer.invoke('save-logs', data),
  openPath: (filePath) => ipcRenderer.send('open-path', filePath),
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  healthCheck: () => ipcRenderer.invoke('health-check'),
  agentActivityWindow,
  onRampWindow,
  logEvent: (message) => ipcRenderer.invoke('log-event', message),
});
