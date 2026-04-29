const { app, ipcMain, autoUpdater: nativeUpdater } = require('electron');
const { CancellationToken } = require('electron-updater');

const { autoUpdater } = require('./update');
const { logger } = require('./logger');

const QUIT_AND_INSTALL_FALLBACK_MS = 5000;

let squirrelReady = false;
let downloadCancellationToken = null;
let pendingSquirrelListener = null;

const ota = (message) =>
  logger.electron(`[OTA] (current=${app.getVersion()}) ${message}`);

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
    ota('Native Squirrel update-downloaded');
    squirrelReady = true;
  });

  nativeUpdater.on('error', (err) => {
    ota(`Native updater error: ${err.message}`);
  });

  autoUpdater.on('update-available', async (info) => {
    ota(`Update available: ${info.version}`);
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

module.exports = { registerAutoUpdaterHandlers };
