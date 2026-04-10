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
autoUpdater.logger = logger;

module.exports = { autoUpdater };
