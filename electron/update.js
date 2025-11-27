const { updateFeedOptions } = require('./constants');
const { autoUpdater } = require('electron-updater');
const { logger } = require('./logger');

const updateOptions = {
  ...updateFeedOptions,
  // token is not required as repo is public
  token: undefined,
  channels: ['latest', 'beta', 'alpha'],
};

// Configure autoUpdater (works for both Mac and Windows)
autoUpdater.setFeedURL(updateOptions);
autoUpdater.autoDownload = false; // Prompt user before downloading updates
autoUpdater.autoInstallOnAppQuit = true; // Install when app quits
autoUpdater.logger = logger;

// Set update check interval (check every 4 hours)
autoUpdater.checkForUpdatesInterval = 4 * 60 * 60 * 1000;

// UPDATER EVENTS
let updateWindow = null;

autoUpdater.on('checking-for-update', () => {
  logger.electron('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  logger.electron('Update available:', info.version);
  if (updateWindow) {
    updateWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', (info) => {
  logger.electron(
    'Update not available. Current version is up-to-date:',
    info.version,
  );
});

autoUpdater.on('error', (err) => {
  logger.electron('Error in auto-updater:', err);
  if (updateWindow) {
    updateWindow.webContents.send('update-error', err.message);
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
  logger.electron(message);
  if (updateWindow) {
    updateWindow.webContents.send('download-progress', progressObj);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  logger.electron('Update downloaded:', info.version);
  if (updateWindow) {
    updateWindow.webContents.send('update-downloaded', info);
  }
  // Auto install on quit is enabled, so update will install when app quits
});

/**
 * Set the main window for update notifications
 * @param {BrowserWindow} window
 */
function setUpdateWindow(window) {
  updateWindow = window;
}

/**
 * Check for updates
 * @returns {Promise}
 */
async function checkForUpdates() {
  if (process.env.NODE_ENV === 'development') {
    logger.electron('Skipping update check in development mode');
    return null;
  }

  try {
    return await autoUpdater.checkForUpdates();
  } catch (error) {
    logger.electron('Failed to check for updates:', error);
    return null;
  }
}

/**
 * Download update
 * @returns {Promise}
 */
async function downloadUpdate() {
  try {
    return await autoUpdater.downloadUpdate();
  } catch (error) {
    logger.electron('Failed to download update:', error);
    throw error;
  }
}

/**
 * Quit and install update
 */
function quitAndInstall() {
  autoUpdater.quitAndInstall(false, true);
}

module.exports = {
  autoUpdater,
  setUpdateWindow,
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
};
