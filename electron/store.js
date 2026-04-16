const Store = require('electron-store');

// Schema for validating store data — only Electron-native fields belong here.
// All other persistence (agent settings, auto-run, backup wallet, etc.) lives in
// .operate/pearl_store.json served by the backend HTTP API, so it migrates with
// the .operate folder when a user moves to a new machine.
//
// Legacy keys (trader, autoRun, etc.) are NOT in this schema but are still readable
// via store.get() — electron-store returns existing values for keys not in the schema.
// The frontend migration in StoreProvider reads them on first launch and copies to
// pearl_store.json.
const schema = {
  environmentName: { type: 'string', default: '' },
  knownVersion: { type: 'string', default: '' },
  // Stores the latest app version for which the "update available" modal was dismissed.
  updateAvailableKnownVersion: { type: 'string', default: '' },
};

/**
 * Sets up the IPC communication and initializes the Electron store.
 * @param {Electron.IpcMain} ipcMain - The IPC main channel for communication.
 */
const setupStoreIpc = (ipcMain) => {
  const store = new Store({ schema });

  // exposed to electron browser window
  ipcMain.handle('store', () => store.store);
  ipcMain.handle('store-get', (_, key) => store.get(key));
  ipcMain.handle('store-set', (_, key, value) => store.set(key, value));
  ipcMain.handle('store-delete', (_, key) => store.delete(key));
  ipcMain.handle('store-clear', (_) => store.clear());
};

module.exports = { setupStoreIpc };
