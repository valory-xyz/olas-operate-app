const Store = require('electron-store');
// set schema to validate store data
const schema = {
  isInitialFunded: { type: 'boolean', default: false }, // TODO: reconsider this default, can be problematic if user has already funded prior to implementation
  firstStakingRewardAchieved: { type: 'boolean', default: false },
  firstRewardNotificationShown: { type: 'boolean', default: false },
  agentEvictionAlertShown: { type: 'boolean', default: false },

  environmentName: { type: 'string', default: '' },
  currentStakingProgram: { type: 'string', default: '' },
};

/**
 * Sets up the IPC communication and initializes the Electron store with default values and schema.
 * @param {Electron.IpcMain} ipcMain - The IPC channel for communication.
 * @param {Electron.BrowserWindow} mainWindow - The main Electron browser window.
 * @returns {Promise<void>} - A promise that resolves once the store is set up.
 */
const setupStoreIpc = async (ipcMain, mainWindow) => {
  const store = new Store({ schema });

  store.onDidAnyChange((data) => {
    if (mainWindow?.webContents)
      mainWindow.webContents.send('store-changed', data);
  });

  // exposed to electron browser window
  ipcMain.handle('store', () => store.store);
  ipcMain.handle('store-get', (_, key) => store.get(key));
  ipcMain.handle('store-set', (_, key, value) => store.set(key, value));
  ipcMain.handle('store-delete', (_, key) => store.delete(key));
  ipcMain.handle('store-clear', (_) => store.clear());
};

module.exports = { setupStoreIpc };
