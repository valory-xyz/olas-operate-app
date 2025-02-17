const { contextBridge, ipcRenderer } = require('electron/renderer');

/** IPC methods for controlling agent activity window */
const agentActivityWindow = {
  init: () => ipcRenderer.send('agent-activity-window-init'),
  goto: (url) => ipcRenderer.send('agent-activity-window-goto', url),
  hide: () => ipcRenderer.send('agent-activity-window-hide'),
  show: () => ipcRenderer.send('agent-activity-window-show'),
  close: () => ipcRenderer.send('agent-activity-window-close'),
  minimize: () => ipcRenderer.send('agent-activity-window-minimize'),
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
  validateTwitterLogin: (credentials) =>
    ipcRenderer.invoke('validate-twitter-login', credentials),
  healthCheck: () => ipcRenderer.invoke('health-check'),
  agentActivityWindow,
});
