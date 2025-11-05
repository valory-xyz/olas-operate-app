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
const createTermsAndConditionsWindow = async (hash) => {
  if (
    !getTermsAndConditionsWindow() ||
    getTermsAndConditionsWindow().isDestroyed
  ) {
    termsAndConditionsWindow = new BrowserWindow({
      title: 'Terms & Conditions',
      resizable: false,
      draggable: true,
      frame: true,
      fullscreenable: false,
      maximizable: false,
      closable: true,
      width: 800,
      height: 700,
    });

    termsAndConditionsWindow.webContents.setWindowOpenHandler(({ url }) => {
      // open url in a browser and prevent default
      shell.openExternal(url);
      return { action: 'deny' };
    });

    const termsUrl = `https://olas.network/pearl-terms?hideLayout=true${hash ? `#${hash}` : ''}`;
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

const handleTermsAndConditionsWindowShow = (hash) => {
  logger.electron('terms-window-show');
  if (
    !getTermsAndConditionsWindow() ||
    getTermsAndConditionsWindow().isDestroyed()
  ) {
    createTermsAndConditionsWindow(hash)?.then((window) => window.show());
  } else {
    getTermsAndConditionsWindow()?.show();
  }
};

module.exports = {
  handleTermsAndConditionsWindowShow,
};
