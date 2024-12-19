const Store = require('electron-store');

// set schema to validate store data
const schema = {
  firstStakingRewardAchieved: { type: 'boolean', default: false },
  firstRewardNotificationShown: { type: 'boolean', default: false },
  agentEvictionAlertShown: { type: 'boolean', default: false },

  environmentName: { type: 'string', default: '' },
  currentStakingProgram: { type: 'string', default: '' },

  // agent settings
  lastSelectedAgentType: { type: 'string', default: 'trader' },
  isInitialFunded_trader: { type: 'boolean', default: false },
  isInitialFunded_memeooorr: { type: 'boolean', default: false },
  isInitialFunded_modius: { type: 'boolean', default: false },
};

/**
 * Sets up the IPC communication and initializes the Electron store with default values and schema.
 * @param {Electron.IpcMain} ipcMain - The IPC channel for communication.
 * @param {Electron.BrowserWindow} mainWindow - The main Electron browser window.
 * @returns {Promise<void>} - A promise that resolves once the store is set up.
 */
const setupStoreIpc = (ipcMain, mainWindow) => {
  const store = new Store({ schema });

  /**
   * isInitialFunded Migration
   *
   * Writes the old isInitialFunded value to the new isInitialFunded_trader
   * And removes it from the store afterward
   */
  if (store.has('isInitialFunded')) {
    store.set('isInitialFunded_trader', store.get('isInitialFunded'));
    store.delete('isInitialFunded');
  }

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
