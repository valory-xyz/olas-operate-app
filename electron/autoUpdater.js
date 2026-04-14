const { app, ipcMain, autoUpdater: nativeUpdater } = require('electron');
const { CancellationToken } = require('electron-updater');

const { autoUpdater } = require('./update');
const { logger } = require('./logger');

const QUIT_AND_INSTALL_FALLBACK_MS = 5000;

let squirrelReady = false;
let downloadCancellationToken = null;

const registerAutoUpdaterHandlers = ({
  getMainWindow,
  setAppRealClose,
  getOperateDaemonPid,
  killProcesses,
}) => {
  const send = (channel, payload) =>
    getMainWindow()?.webContents.send(channel, payload);

  // Native Electron autoUpdater tracks Squirrel completion on macOS
  nativeUpdater.on('update-downloaded', () => {
    logger.electron('[OTA] Native Squirrel update-downloaded');
    squirrelReady = true;
  });

  nativeUpdater.on('error', (err) => {
    logger.electron(`[OTA] Native updater error: ${err.message}`);
  });

  autoUpdater.on('update-available', async (info) => {
    logger.electron(`[OTA] Update available: ${info.version}`);
    // electron-updater's GitHubProvider has a bug where releaseNotes come from
    // the wrong Atom feed entry when allowPrerelease is true. Fetch directly
    // from the GitHub API to get the correct release notes for this version.
    let releaseNotes = null;
    try {
      const tag = `v${info.version}`;
      const res = await fetch(
        `https://api.github.com/repos/valory-xyz/olas-operate-app/releases/tags/${tag}`,
        { headers: { Accept: 'application/vnd.github.v3.html+json' } },
      );
      if (res.ok) {
        const data = await res.json();
        releaseNotes = data.body_html || data.body || null;
      }
    } catch (e) {
      logger.electron(`[OTA] Failed to fetch release notes: ${e.message}`);
    }
    send('update-available', { version: info.version, releaseNotes });
  });

  autoUpdater.on('update-not-available', () => {
    logger.electron('[OTA] No update available');
    send('update-not-available');
  });

  autoUpdater.on('download-progress', (progress) => {
    send('update-download-progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', () => {
    logger.electron(
      `[OTA] electron-updater update-downloaded (squirrelReady=${squirrelReady})`,
    );
    if (process.platform === 'darwin') {
      // On macOS, wait for Squirrel to finish before notifying renderer
      if (squirrelReady) {
        logger.electron('[OTA] Squirrel already ready, notifying renderer');
        send('update-downloaded');
      } else {
        logger.electron('[OTA] Waiting for Squirrel to finish...');
        // Remove any previous listener before adding a new one to prevent
        // accumulation if electron-updater fires update-downloaded multiple times.
        nativeUpdater.removeAllListeners('update-downloaded');
        nativeUpdater.once('update-downloaded', () => {
          squirrelReady = true;
          logger.electron('[OTA] Squirrel finished, notifying renderer');
          send('update-downloaded');
        });
      }
    } else {
      send('update-downloaded');
    }
  });

  autoUpdater.on('error', (err) => {
    logger.electron(`[OTA] Error: ${err.message}`);
    send('update-error', { message: err.message });
  });

  // Remove any pre-existing handlers to avoid duplicate registration errors
  // (e.g. during dev hot-reload where this module may be re-evaluated).
  ipcMain.removeHandler('update-check');
  ipcMain.removeHandler('update-download');
  ipcMain.removeHandler('update-cancel');
  ipcMain.removeHandler('update-quit-and-install');

  ipcMain.handle('update-check', async () => {
    logger.electron('[OTA] Checking for updates...');
    return autoUpdater.checkForUpdates();
  });

  ipcMain.handle('update-download', () => {
    logger.electron('[OTA] Starting download...');
    downloadCancellationToken = new CancellationToken();
    return autoUpdater.downloadUpdate(downloadCancellationToken);
  });

  ipcMain.handle('update-cancel', () => {
    logger.electron('[OTA] Cancelling download');
    downloadCancellationToken?.cancel();
    downloadCancellationToken = null;
  });

  ipcMain.handle('update-quit-and-install', async () => {
    logger.electron(
      `[OTA] quitAndInstall called (squirrelReady=${squirrelReady})`,
    );
    const pid = getOperateDaemonPid();
    if (pid) {
      try {
        await killProcesses(pid);
      } catch (e) {
        logger.electron(
          `[OTA] killProcesses error (non-fatal): ${JSON.stringify(e)}`,
        );
      }
    }
    // Allow the app to quit — the before-quit and mainWindow close handlers check this
    setAppRealClose(true);
    logger.electron(
      '[OTA] appRealClose set to true, calling autoUpdater.quitAndInstall()',
    );
    autoUpdater.quitAndInstall();
    // Fallback: if quitAndInstall doesn't exit within the timeout, force exit
    setTimeout(() => {
      logger.electron(
        '[OTA] Fallback: quitAndInstall did not exit, forcing app.exit(0)',
      );
      app.exit(0);
    }, QUIT_AND_INSTALL_FALLBACK_MS);
  });
};

module.exports = { registerAutoUpdaterHandlers };
