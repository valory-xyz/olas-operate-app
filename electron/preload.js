const { contextBridge, ipcRenderer } = require('electron/renderer');

const otaConfig = {
  // App APIotaConfig
  closeApp: () => ipcRenderer.send('close-app'),
  minimizeApp: () => ipcRenderer.send('minimize-app'),
  setAppHeight: (height) => ipcRenderer.send('set-height', height),

  // Tray API
  setTrayIcon: (status) => ipcRenderer.send('tray', status),

  // Electron store API
  store: {
    store: () => ipcRenderer.invoke('store'),
    get: (key) => ipcRenderer.invoke('store-get', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
    delete: (key) => ipcRenderer.invoke('store-delete', key),
    clear: () => ipcRenderer.invoke('store-clear'),
  },

  // Notification API
  showNotification: (title, description) =>
    ipcRenderer.send('show-notification', title, description),

  // Log export API
  saveLogs: (data) => ipcRenderer.invoke('save-logs', data),
  openPath: (filePath) => ipcRenderer.send('open-path', filePath),

  // OTA API
  ota: {
    checkForUpdates: () => ipcRenderer.invoke('ota.checkForUpdates'),
    downloadUpdate: () => ipcRenderer.invoke('ota.downloadUpdate'),
    quitAndInstall: () => ipcRenderer.invoke('ota.quit-and-install'),
  },

  // IPC API
  ipcRenderer: {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) =>
      ipcRenderer.on(channel, (event, ...args) => func(...args)),
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  },

  // App state API
  setIsAppLoaded: (isAppLoaded) =>
    ipcRenderer.send('is-app-loaded', isAppLoaded),
};

/**
 * Exposes Electron APIs to the renderer process
 * @note Accessible in the renderer process (Next.js app) as `window.electronAPI`
 * @see https://www.electronjs.org/docs/api/context-bridge
 * @see https://www.electronjs.org/docs/api/ipc-renderer
 * @see https://www.electronjs.org/docs/api/ipc-main
 */
contextBridge.exposeInMainWorld('electronAPI', otaConfig);
