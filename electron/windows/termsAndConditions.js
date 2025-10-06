const { BrowserWindow, shell } = require('electron');
const path = require('path');

const { logger } = require('../logger');

/** @type {Electron.BrowserWindow | null} */
let termsAndConditionsWindow = null;
const getTermsAndConditionsWindow = () => termsAndConditionsWindow;

/**
 * Create the terms window for displaying terms iframe
 */
/** @type {()=>Promise<BrowserWindow|undefined>} */
const createTermsAndConditionsWindow = async (baseUrl, type) => {
  if (
    !getTermsAndConditionsWindow() ||
    getTermsAndConditionsWindow().isDestroyed
  ) {
    termsAndConditionsWindow = new BrowserWindow({
      title: 'Terms & Conditions',
      resizable: false,
      draggable: true,
      frame: false,
      transparent: true,
      fullscreenable: false,
      maximizable: false,
      closable: true,
      width: 480,
      height: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload.js'),
      },
    });

    termsAndConditionsWindow.webContents.setWindowOpenHandler(({ url }) => {
      // open url in a browser and prevent default
      shell.openExternal(url);
      return { action: 'deny' };
    });

    const termsUrl = `${baseUrl}/terms-and-conditions?type=${type}`;
    logger.electron(`Terms URL: ${termsUrl}`);
    termsAndConditionsWindow.loadURL(termsUrl).then(() => {
      logger.electron(
        `Open Terms And Conditions window: ${termsAndConditionsWindow.url}`,
      );
    });
  } else {
    logger.electron('Terms window already exists');
  }

  termsAndConditionsWindow.on('close', function (event) {
    event.preventDefault();
    termsAndConditionsWindow?.destroy();
  });

  return termsAndConditionsWindow;
};

const handleTermsAndConditionsWindowShow = (baseUrl, type) => {
  logger.electron('terms-window-show');
  if (
    !getTermsAndConditionsWindow() ||
    getTermsAndConditionsWindow().isDestroyed()
  ) {
    createTermsAndConditionsWindow(baseUrl, type)?.then((window) =>
      window.show(),
    );
  } else {
    getTermsAndConditionsWindow()?.show();
  }
};

const handleTermsAndConditionsWindowClose = () => {
  logger.electron('terms-window-close');
  if (
    !getTermsAndConditionsWindow() ||
    getTermsAndConditionsWindow().isDestroyed()
  )
    return;
  getTermsAndConditionsWindow()?.destroy();
};

module.exports = {
  handleTermsAndConditionsWindowShow,
  handleTermsAndConditionsWindowClose,
};
