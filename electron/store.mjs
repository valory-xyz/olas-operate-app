import { logger } from './utils/logger.mjs';

const defaultSchema = {
  version: { type: 'string', default: '' },
  environmentName: { type: 'string', default: '' },
  isInitialFunded: { type: 'boolean', default: false },
  firstStakingRewardAchieved: { type: 'boolean', default: false },
  firstRewardNotificationShown: { type: 'boolean', default: false },
  canCheckForUpdates: { type: 'boolean', default: true },
};

/**
 * Sets up the IPC communication and initializes the electron store with default values.
 * @param {string} ipcChannel - The IPC channel for communication.
 * @param {Electron.BrowserWindow} mainWindow - The main Electron browser window.
 * @param {Object} storeInitialValues - The initial values for the store.
 * @returns {Promise<void>} - A promise that resolves when the setup is complete.
 */
export const setupStoreIpc = async (
  ipcChannel,
  mainWindow,
  storeInitialValues,
) => {
  /** @type {import('electron-store').default} */
  const Store = (await import('electron-store')).default;

  // set default values for store
  const schema = Object.assign({}, defaultSchema);
  Object.keys(schema).forEach((key) => {
    if (storeInitialValues[key] !== undefined) {
      schema[key].default = storeInitialValues[key];
    }
  });

  /** @type import Store from 'electron-store' */
  const store = new Store({ schema });

  store.onDidAnyChange((data) => {
    if (mainWindow?.webContents) {
      logger.electron('store-changed', data);
      mainWindow.webContents.send('store-changed', data);
    }
  });

  // exposed to electron browser window
  ipcChannel.handle('store', () => store.store);
  ipcChannel.handle('store-get', (_, key) => store.get(key));
  ipcChannel.handle('store-set', (_, key, value) => store.set(key, value));
  ipcChannel.handle('store-delete', (_, key) => store.delete(key));
  ipcChannel.handle('store-clear', () => store.clear());
};
