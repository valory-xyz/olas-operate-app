const { publishOptions } = require('./constants');
const electronUpdater = require('electron-updater');
const { logger } = require('./logger');

const updateOptions = {
  ...publishOptions,
  channels: ['latest'],
};

const autoUpdater = electronUpdater.autoUpdater;

autoUpdater.setFeedURL({ ...updateOptions });

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
// Always download the full zip. The differential/blockmap path causes
// the progress bar to report the diff size first, then jump to the full
// size when it falls back — confusing and a frequent source of bugs.
autoUpdater.disableDifferentialDownload = true;

// electron-updater calls logger.info/.warn/.error/.debug during its
// lifecycle (upstream URL, version compare, staged ZIP path, code-sign
// verification). The base winston logger emits those at non-'electron'
// levels, which the electron.log file transport filters out. Re-emit at
// the 'electron' level so the entries reach electron.log.
autoUpdater.logger = {
  info: (message) => logger.electron(`[OTA-internal] ${message}`),
  warn: (message) => logger.electron(`[OTA-internal][warn] ${message}`),
  error: (message) => logger.electron(`[OTA-internal][error] ${message}`),
  debug: (message) => logger.electron(`[OTA-internal][debug] ${message}`),
};

module.exports = { autoUpdater };
