const Store = require('electron-store');

const defaultInitialAgentSettings = {
  isInitialFunded: false,
  firstStakingRewardAchieved: false,
  firstRewardNotificationShown: false,
  agentEvictionAlertShown: false,
  currentStakingProgram: false,
};

// Schema for validating store data
const schema = {
  environmentName: { type: 'string', default: '' },
  lastSelectedAgentType: { type: 'string', default: 'trader' },

  // Each agent has its own settings
  trader: { type: 'object', default: defaultInitialAgentSettings },
  memeooorr: { type: 'object', default: defaultInitialAgentSettings },
};

/**
 * Sets up the IPC communication and initializes the Electron store with default values and schema.
 * @param {Electron.IpcMain} ipcMain - The IPC channel for communication.
 * @param {Electron.BrowserWindow} mainWindow - The main Electron browser window.
 */
const setupStoreIpc = (ipcMain, mainWindow) => {
  const store = new Store({ schema });

  /**
   * agent: trader Migration
   *
   * Initially the store was setup with only trader agent settings.
   * The following code migrates the old store to the new store schema.
   */
  const traderAgent = {
    ...(store.get('trader') || {}),
    isInitialFunded:
      store.get('isInitialFunded_trader') ||
      store.get('isInitialFunded') ||
      false,
    firstRewardNotificationShown:
      store.get('firstRewardNotificationShown') || false,
    agentEvictionAlertShown: store.get('agentEvictionAlertShown') || false,
    currentStakingProgram: store.get('currentStakingProgram') || false,
  };

  // Set the trader agent and delete old keys
  store.set('trader', traderAgent);
  [
    'isInitialFunded',
    'isInitialFunded_trader',
    'firstRewardNotificationShown',
    'agentEvictionAlertShown',
    'currentStakingProgram',
  ].forEach((key) => store.delete(key));

  /**
   * agent: memeooorr Migration
   */
  if (store.has('isInitialFunded_memeooorr')) {
    const memeooorrAgent = store.get('memeooorr') || {};
    store.set('memeooorr', {
      ...memeooorrAgent,
      isInitialFunded: store.get('isInitialFunded_memeooorr') || false,
    });
    store.delete('isInitialFunded_memeooorr');
  }

  // Notify renderer process when store changes
  store.onDidAnyChange((data) => {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send('store-changed', data);
    }
  });

  // exposed to electron browser window
  ipcMain.handle('store', () => store.store);
  ipcMain.handle('store-get', (_, key) => store.get(key));
  ipcMain.handle('store-set', (_, key, value) => store.set(key, value));
  ipcMain.handle('store-delete', (_, key) => store.delete(key));
  ipcMain.handle('store-clear', () => store.clear());
};

module.exports = { setupStoreIpc };
