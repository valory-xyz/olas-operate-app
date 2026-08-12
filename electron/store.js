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
  // Set to true once the authoritative Electron→pearl_store migration is done.
  // Must be in the schema so electron-store persists it.
  pearlStoreMigrationComplete: { type: 'boolean', default: false },
  // Set to true once the autoRun.enabled repair has been checked.
  pearlStoreAutoRunRepaired: { type: 'boolean', default: false },
  // Queue of backend-bound writes and deletes that failed (e.g. backend
  // unreachable during shutdown). Flushed to the backend on the next successful
  // startup before hydration reads pearl_store.json. `op` is optional so
  // entries written before deletes were queued still validate; they read as
  // sets. `value` is unused for deletes.
  // Entries are constrained so a corrupted or hand-edited config.json cannot be
  // replayed to the backend on the next launch. Note this is not a per-key
  // rejection: conf validates the whole store in the Store constructor and
  // throws, which setupStoreIpc's caller in main.js logs and swallows — leaving
  // the session with no store IPC at all. That is pre-existing behaviour for
  // every other key in this schema; the frontend degrades by logging and
  // skipping the flush. StoreProvider narrows the value again on read, for the
  // paths where validation never runs.
  pendingStoreWrites: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        op: { type: 'string', enum: ['set', 'delete'] },
        value: {},
      },
      required: ['key'],
    },
  },
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
