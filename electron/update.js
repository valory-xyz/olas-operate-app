const { publishOptions } = require('./constants');
const electronUpdater = require('electron-updater');
const logger = require('./logger');

const updateOptions = {
  ...publishOptions,
  channels: ['latest'],
};

const autoUpdater = electronUpdater.autoUpdater;

autoUpdater.setFeedURL({ ...updateOptions });

autoUpdater.autoDownload = false;
// Keep autoInstallOnAppQuit disabled: the `update-quit-and-install` IPC handler
// in main.js explicitly awaits killProcesses before calling quitAndInstall(),
// ensuring the daemon is cleaned up before the installer runs. Enabling
// autoInstallOnAppQuit would race with the async before-quit cleanup.
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.logger = logger;

module.exports = { autoUpdater };
