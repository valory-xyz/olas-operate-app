// set schema to validate store data
const defaultSchema = {
  environmentName: { type: 'string', default: '' },
  isInitialFunded: { type: 'boolean', default: false },
  firstStakingRewardAchieved: { type: 'boolean', default: false },
  firstRewardNotificationShown: { type: 'boolean', default: false },
  agentEvictionAlertShown: { type: 'boolean', default: false },
};

const setupStoreIpc = async (ipcChannel, mainWindow, storeInitialValues) => {
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
    if (mainWindow?.webContents)
      mainWindow.webContents.send('store-changed', data);
  });

  // exposed to electron browser window
  ipcChannel.handle('store', () => store.store);
  ipcChannel.handle('store-get', (_, key) => store.get(key));
  ipcChannel.handle('store-set', (_, key, value) => store.set(key, value));
  ipcChannel.handle('store-delete', (_, key) => store.delete(key));
  ipcChannel.handle('store-clear', (_) => store.clear());
};

module.exports = { setupStoreIpc };
