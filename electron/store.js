const Store = require('electron-store');

const defaultInitialAgentSettings = {
  isInitialFunded: false,
  isProfileWarningDisplayed: false,
};

// Schema for validating store data
const schema = {
  // Global settings
  environmentName: { type: 'string', default: '' },
  lastSelectedAgentType: { type: 'string', default: 'trader' },
  knownVersion: { type: 'string', default: '' },

  // First time user settings
  firstStakingRewardAchieved: { type: 'boolean', default: false },
  firstRewardNotificationShown: { type: 'boolean', default: false },
  agentEvictionAlertShown: { type: 'boolean', default: false },

  // Each agent has its own settings
  trader: {
    type: 'object',
    default: defaultInitialAgentSettings,
  },
  memeooorr: { type: 'object', default: defaultInitialAgentSettings },
  modius: {
    type: 'object',
    default: defaultInitialAgentSettings,
  },
  optimus: {
    type: 'object',
    default: defaultInitialAgentSettings,
  },
  pett_ai: {
    type: 'object',
    default: defaultInitialAgentSettings,
  },
  polymarket_trader: {
    type: 'object',
    default: defaultInitialAgentSettings,
  },

  // Backup wallet information
  lastProvidedBackupWallet: {
    type: 'object',
    default: { address: null, type: 'manual' },
  },
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
  const traderAgent = store.get('trader') || {};

  if (store.has('isInitialFunded')) {
    store.set('trader', {
      ...traderAgent,
      isInitialFunded: store.get('isInitialFunded') || false,
    });
    store.delete('isInitialFunded');
  } else if (store.has('isInitialFunded_trader')) {
    store.set('trader', {
      ...traderAgent,
      isInitialFunded: store.get('isInitialFunded_trader') || false,
    });
    store.delete('isInitialFunded_trader');
  }

  /**
   * agent: agentsFun Migration
   */
  if (store.has('isInitialFunded_memeooorr')) {
    const agentsFunAgent = store.get('memeooorr') || {};
    store.set('memeooorr', {
      ...agentsFunAgent,
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
  ipcMain.handle('store-clear', (_) => store.clear());
};

module.exports = { setupStoreIpc };
