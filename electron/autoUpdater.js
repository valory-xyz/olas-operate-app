const fs = require('fs');
const { app, ipcMain, autoUpdater: nativeUpdater } = require('electron');
const { CancellationToken } = require('electron-updater');

const { autoUpdater } = require('./update');
const { logger } = require('./logger');
const { isMac, paths } = require('./constants');

const QUIT_AND_INSTALL_FALLBACK_MS = 5000;

let squirrelReady = false;
// The IPC quit-and-install call carries no version, so remember the one electron-updater downloaded
let downloadedVersion = null;
let downloadCancellationToken = null;
let pendingSquirrelListener = null;

const ota = (message) =>
  logger.electron(`[OTA] (current=${app.getVersion()}) ${message}`);

/**
 * Records the install attempt so the next launch can tell whether it worked.
 * Never throws: a missing marker only costs a log line, a thrown error would block the install.
 */
const recordPendingInstall = (store) => {
  if (!downloadedVersion) {
    ota('No downloaded version known, skipping pending install marker');
    return;
  }
  if (!store) {
    ota('Store unavailable, skipping pending install marker');
    return;
  }
  try {
    store.set('pendingUpdateInstall', {
      targetVersion: downloadedVersion,
      fromVersion: app.getVersion(),
      requestedAt: new Date().toISOString(),
    });
  } catch (e) {
    ota(`Failed to write pending install marker: ${e.message}`);
  }
};

/**
 * Checks the marker left by the previous quit-and-install and logs whether the update applied.
 * On failure the attempted version is marked as already offered, so the update modal stays
 * closed until a newer version is published.
 * @param {import('electron-store')} store
 */
const verifyPendingInstall = (store) => {
  try {
    const pending = store.get('pendingUpdateInstall');
    if (!pending) return;
    // Removed before acting on it, so a marker can never be handled twice
    store.delete('pendingUpdateInstall');

    const { targetVersion, fromVersion } = pending;
    const runningVersion = app.getVersion();

    if (targetVersion && runningVersion === targetVersion) {
      ota(`Update to ${targetVersion} installed successfully`);
      return;
    }

    if (targetVersion && runningVersion === fromVersion) {
      ota(
        `Install failed: attempted=${targetVersion} running=${runningVersion}`,
      );
      if (isMac) {
        const exists = (filePath) =>
          fs.existsSync(filePath) ? 'present' : 'missing';
        ota(
          `ShipIt logs: stderr=${exists(paths.shipItStderrLogFile)} stdout=${exists(paths.shipItStdoutLogFile)}`,
        );
      }
      store.set('updateAvailableKnownVersion', targetVersion);
      return;
    }

    ota(
      `Discarding pending install marker: attempted=${targetVersion ?? 'unknown'} from=${fromVersion ?? 'unknown'} running=${runningVersion}`,
    );
  } catch (e) {
    ota(`Failed to verify pending install: ${e.message}`);
  }
};

const registerAutoUpdaterHandlers = ({
  getMainWindow,
  setAppRealClose,
  getOperateDaemonPid,
  killProcesses,
  getStore,
}) => {
  const send = (channel, payload) =>
    getMainWindow()?.webContents.send(channel, payload);

  // Native Electron autoUpdater tracks Squirrel completion on macOS
  nativeUpdater.on('update-downloaded', () => {
    ota('Native Squirrel update-downloaded');
    squirrelReady = true;
  });

  nativeUpdater.on('error', (err) => {
    ota(`Native updater error: ${err.message}`);
  });

  autoUpdater.on('update-available', async (info) => {
    ota(`Update available: ${info.version}`);
    // Hourly re-checks re-announce the version already downloaded, which must not forget it
    if (info.version !== downloadedVersion) downloadedVersion = null;
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
        // The renderer injects this via dangerouslySetInnerHTML, so only
        // accept the HTML-rendered form. Never fall back to data.body
        // (raw markdown), which would be rendered as literal text.
        releaseNotes = data.body_html || null;
      }
    } catch (e) {
      ota(`Failed to fetch release notes: ${e.message}`);
    }
    send('update-available', { version: info.version, releaseNotes });
  });

  autoUpdater.on('update-not-available', () => {
    ota('No update available');
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

  autoUpdater.on('update-downloaded', (info) => {
    ota(
      `electron-updater update-downloaded version=${info?.version ?? 'unknown'} squirrelReady=${squirrelReady}`,
    );
    downloadedVersion = info?.version ?? null;
    if (process.platform === 'darwin') {
      // On macOS, wait for Squirrel to finish before notifying renderer
      if (squirrelReady) {
        ota('Squirrel already ready, notifying renderer');
        send('update-downloaded');
      } else {
        ota('Waiting for Squirrel to finish...');
        // Remove only our previously-registered fallback listener (if any) —
        // must NOT use removeAllListeners, which would also strip the
        // module-scope nativeUpdater.on('update-downloaded', …) tracker above.
        if (pendingSquirrelListener) {
          nativeUpdater.removeListener(
            'update-downloaded',
            pendingSquirrelListener,
          );
        }
        pendingSquirrelListener = () => {
          pendingSquirrelListener = null;
          ota('Squirrel finished, notifying renderer');
          send('update-downloaded');
        };
        nativeUpdater.once('update-downloaded', pendingSquirrelListener);
      }
    } else {
      send('update-downloaded');
    }
  });

  autoUpdater.on('error', (err) => {
    ota(`Error: ${err.message}`);
    send('update-error', { message: err.message });
  });

  // Remove any pre-existing handlers to avoid duplicate registration errors
  // (e.g. during dev hot-reload where this module may be re-evaluated).
  ipcMain.removeHandler('update-check');
  ipcMain.removeHandler('update-download');
  ipcMain.removeHandler('update-cancel');
  ipcMain.removeHandler('update-quit-and-install');

  ipcMain.handle('update-check', async () => {
    ota('Checking for updates...');
    return autoUpdater.checkForUpdates();
  });

  ipcMain.handle('update-download', () => {
    ota('Starting download...');
    downloadCancellationToken = new CancellationToken();
    return autoUpdater.downloadUpdate(downloadCancellationToken);
  });

  ipcMain.handle('update-cancel', () => {
    ota('Cancelling download');
    downloadCancellationToken?.cancel();
    downloadCancellationToken = null;
  });

  ipcMain.handle('update-quit-and-install', async () => {
    ota(`quitAndInstall called squirrelReady=${squirrelReady}`);
    const pid = getOperateDaemonPid();
    if (pid) {
      try {
        await killProcesses(pid);
      } catch (e) {
        ota(`killProcesses error (non-fatal): ${JSON.stringify(e)}`);
      }
    }
    recordPendingInstall(getStore());
    // Allow the app to quit — the before-quit and mainWindow close handlers check this
    setAppRealClose(true);
    ota('appRealClose set to true, calling autoUpdater.quitAndInstall()');
    autoUpdater.quitAndInstall();
    // Fallback: if quitAndInstall doesn't exit within the timeout, force exit
    setTimeout(() => {
      ota('Fallback: quitAndInstall did not exit, forcing app.exit(0)');
      app.exit(0);
    }, QUIT_AND_INSTALL_FALLBACK_MS);
  });
};

module.exports = { registerAutoUpdaterHandlers, verifyPendingInstall };
