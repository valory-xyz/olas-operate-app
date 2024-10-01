const { ipcMain } = require('electron');
const { MacUpdater, NsisUpdater } = require('electron-updater');
const { logger } = require('../logger');
const { isWindows, isMac, isDev } = require('../constants');
const { githubUpdateOptions } = require('../constants/config');

/** Over-the-air update manager
 * @example
 * const { PearlOTA } = require('./PearlOTA');
 * const ota = new PearlOTA();
 * ota.updater.checkForUpdates();
 * ota.updater.downloadUpdate();
 * ota.updater.quitAndInstall();
 * @see https://www.electron.build/auto-update
 * @note updater only supports Windows and Mac
 */
class PearlOTA {
  /**
   * @type {MacUpdater | NsisUpdater | null} */
  updater = null;

  constructor() {
    if (isWindows) this.updater = new NsisUpdater(githubUpdateOptions);
    if (isMac) this.updater = new MacUpdater(githubUpdateOptions);

    if (this.updater) {
      this.updater.autoDownload = false;
      this.updater.autoInstallOnAppQuit = false;
      this.updater.logger = logger;

      this.updater.setFeedURL(githubUpdateOptions);

      this.#bindUpdaterEvents();
    }

    this.#bindIpcMainEvents();
  }

  /** Binds events to the updater
   */
  #bindUpdaterEvents = () => {
    this.updater.on('error', (error) => {
      logger.electron('Update error:', error);
    });
    this.updater.on('update-available', () => {
      logger.electron('Update available');
    });
    this.updater.on('update-not-available', () => {
      logger.electron('No update available');
    });
    this.updater.on('checking-for-update', () => {
      logger.electron('Checking for update');
    });
    this.updater.on('download-progress', (progress) => {
      logger.electron('Download progress:', progress);
    });
    this.updater.on('update-not-available', () => {
      logger.electron('No update available');
    });
  };

  #bindIpcMainEvents = () => {
    ipcMain.handle('ota.checkForUpdates', async () => {
      if (!this.updater) return "Updater doesn't support this platform";
      try {
        await this.updater.checkForUpdates();
        return true;
      } catch (error) {
        logger.electron('Failed to check for updates:', error);
        return false;
      }
    });

    ipcMain.handle('ota.downloadUpdate', async () => {
      if (!this.updater) return "Updater doesn't support this platform";
      try {
        await this.updater.downloadUpdate();
        return true;
      } catch (error) {
        logger.electron('Failed to download update:', error);
        return false;
      }
    });

    ipcMain.handle('ota.quitAndInstall', async () => {
      if (!this.updater) return "Updater doesn't support this platform";
      try {
        await this.updater.quitAndInstall();
        return true;
      } catch (error) {
        logger.electron('Failed to quit and install:', error);
        return false;
      }
    });
  };
}

module.exports = {
  PearlOTA,
};
