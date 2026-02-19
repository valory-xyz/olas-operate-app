const Electron = require('electron');
const { isMac, isLinux, isWindows, isDev } = require('../constants');
const { logger } = require('../logger');
const { nativeTheme } = Electron;

// Used to resize the tray icon on macOS
const macTrayIconSize = { width: 16, height: 16 };

/** Status supported by tray icons.
 * @readonly
 * @enum {'logged-out' | 'low-gas' | 'paused' | 'running'}
 */
const TrayIconStatus = {
  LoggedOut: 'logged-out',
  LowGas: 'low-gas',
  Paused: 'paused',
  Running: 'running',
};

const invertImage = (nativeImg) => {
  const size = nativeImg.getSize();
  // Get raw pixel data (RGBA)
  const buffer = nativeImg.toBitmap();

  // Go through each pixel and invert the colors
  // Structure: [R, G, B, A, R, G, B, A, ...]
  for (let i = 0; i < buffer.length; i += 4) {
    // Invert only RGB, leave the Alpha channel (transparency) [i+3] untouched
    buffer[i] = 255 - buffer[i];     // Red
    buffer[i + 1] = 255 - buffer[i + 1]; // Green
    buffer[i + 2] = 255 - buffer[i + 2]; // Blue
  }

  // Create new image from the modified buffer
  return Electron.nativeImage.createFromBitmap(buffer, {
    width: size.width,
    height: size.height,
  });
};

const appPath = Electron.app.getAppPath();

/** Paths to tray icons for different statuses.
 * @readonly
 * @type {Record<TrayIconStatus, string>}
 */
const trayIconPaths = {
  [TrayIconStatus.LoggedOut]: `${appPath}/electron/assets/icons/tray/logged-out.png`,
  [TrayIconStatus.LowGas]: `${appPath}/electron/assets/icons/tray/low-gas.png`,
  [TrayIconStatus.Paused]: `${appPath}/electron/assets/icons/tray/paused.png`,
  [TrayIconStatus.Running]: `${appPath}/electron/assets/icons/tray/running.png`,
};

/** Tray icons as native images
 * @note macOS icons are resized
 * @readonly
 * @type {Record<TrayIconStatus, Electron.NativeImage | string>} */
const trayIcons = Object.entries(trayIconPaths).reduce(
  (acc, [status, path]) => ({
    ...acc,
    [status]: (() => {


      // Windows and macOS support nativeImage
      let trayIcon = Electron.nativeImage.createFromPath(path);

      if (isLinux) {
        logger.electron(`LINUX: ${isLinux}`);
        logger.electron(`LINUX DARK: ${nativeTheme.shouldUseDarkColors}`);
        trayIcon = trayIcon.resize({ width: 22, height: 22 });
        // make it white! cause linux does not respect reverse color schemas. darkmode autodetect does not work for evey linux
        try {
          trayIcon = invertImage(trayIcon);
        } catch (e) {
          console.error('Failed to invert tray icon:', e);
          logger.electron(`LINUX DARK: Failed to invert tray icon`);
        }
      }


      if (isMac) {
        // Resize icon for tray
        trayIcon = trayIcon.resize(macTrayIconSize);
        // Mark the image as a template image for MacOS to apply correct color
        trayIcon.setTemplateImage(true);
      }

      return trayIcon;
    })(),
  }),
  {},
);

/** Cross-platform Electron Tray for Pearl, with context menu, icon, events. */
class PearlTray extends Electron.Tray {
  /** @param {() => Electron.BrowserWindow | null} activeWindowCallback */
  constructor(activeWindowCallback) {
    // Set the tray icon to the logged-out state by default
    super(trayIcons[TrayIconStatus.LoggedOut]);

    // Store the callback to retrieve the active window
    this.activeWindowCallback = activeWindowCallback;

    this.setContextMenu(new PearlTrayContextMenu(activeWindowCallback));
    this.setToolTip('Pearl');

    this.#bindClickEvents();
    this.#bindIpcListener();
  }

  #bindClickEvents = () => {
    if (isWindows) {
      isDev && logger.electron('binding windows click events to tray');
      // Windows: Handle single and double-clicks to show the window
      this.on('click', () => this.activeWindowCallback()?.show());
      this.on('double-click', () => this.activeWindowCallback()?.show());
      this.on('right-click', () => this.popUpContextMenu());
      return;
    }
    isDev &&
      logger.electron('no click events bound to tray as not using win32');
    // macOS and Linux handle all clicks by displaying the context menu
    // can show window by selecting 'Show app' on dropdown
    // or clicking the app icon in the dock
  };

  #bindIpcListener = () => {
    isDev && logger.electron('binding ipc listener for tray icon status');
    Electron.ipcMain.on('tray', (_event, status) => {
      isDev && logger.electron('received tray icon status:', status);
      switch (status) {
        case TrayIconStatus.LoggedOut: {
          this.setImage(trayIcons[TrayIconStatus.LoggedOut]);
          break;
        }
        case TrayIconStatus.Running: {
          this.setImage(trayIcons[TrayIconStatus.Running]);
          break;
        }
        case TrayIconStatus.Paused: {
          this.setImage(trayIcons[TrayIconStatus.Paused]);
          break;
        }
        case TrayIconStatus.LowGas: {
          this.setImage(trayIcons[TrayIconStatus.LowGas]);
          break;
        }
        default: {
          logger.electron('Unknown tray icon status:', status);
        }
      }
    });
  };
}

/**
 * Builds the context menu for the tray.
 * @param {() => Electron.BrowserWindow | null} activeWindowCallback - A callback to retrieve the active window.
 * @returns {Electron.Menu} The context menu for the tray.
 */
class PearlTrayContextMenu {
  constructor(activeWindowCallback) {
    return Electron.Menu.buildFromTemplate([
      {
        label: 'Show app',
        click: () => activeWindowCallback()?.show(),
      },
      {
        label: 'Hide app',
        click: () => activeWindowCallback()?.hide(),
      },
      {
        label: 'Quit',
        click: async () => {
          Electron.app.quit();
        },
      },
    ]);
  }
}

module.exports = { PearlTray };
