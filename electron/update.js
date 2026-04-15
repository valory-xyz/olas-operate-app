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
autoUpdater.logger = logger;

module.exports = { autoUpdater };
