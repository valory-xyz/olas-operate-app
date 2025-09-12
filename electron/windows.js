// TODO: move here all windows in Pearl V1

const { BrowserWindow } = require('electron');
const path = require('path');

const { logger } = require('./logger');

/** @type {Electron.BrowserWindow | null} */
let web3AuthWindow = null;
const getWeb3AuthWindow = () => web3AuthWindow;

/**
 * Create the web3auth window for displaying web3auth modal
 */
/** @type {()=>Promise<BrowserWindow|undefined>} */
const createWeb3AuthWindow = async () => {
  if (!getWeb3AuthWindow() || getWeb3AuthWindow().isDestroyed) {
    web3AuthWindow = new BrowserWindow({
      title: 'Web3Auth',
      resizable: false,
      draggable: true,
      frame: false,
      transparent: true,
      fullscreenable: false,
      maximizable: false,
      closable: false,
      width: 600,
      height: 700,
      media: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    const web3AuthUrl =
      'https://pearl-api-git-feat-pearl-api-app-autonolas.vercel.app/web3auth/login';

    web3AuthWindow.loadURL(web3AuthUrl).then(() => {
      logger.electron(`Open Web3Auth window: ${web3AuthWindow.url}`);
    });
  } else {
    logger.electron('Web3Auth window already exists');
  }

  web3AuthWindow.on('close', function (event) {
    event.preventDefault();
    web3AuthWindow?.destroy();
  });

  return web3AuthWindow;
};

const handleWeb3AuthWindowShow = () => {
  logger.electron('web3auth-window-show');

  if (!getWeb3AuthWindow() || getWeb3AuthWindow().isDestroyed()) {
    createWeb3AuthWindow()?.then((window) => window.show());
  } else {
    getWeb3AuthWindow()?.show();
  }
};

const handleWeb3AuthWindowClose = () => {
  logger.electron('web3auth-window-show');

  if (!getWeb3AuthWindow() || getWeb3AuthWindow().isDestroyed()) {
    createWeb3AuthWindow()?.then((window) => window.show());
  } else {
    getWeb3AuthWindow()?.show();
  }
};

const handleWeb3AuthSuccessLogin = (window, address) => {
  if (!address) return;

  logger.electron(`web3auth-address-received: ${address}`);
  window.webContents.send('web3auth-address-received', address);
};

module.exports = {
  handleWeb3AuthWindowShow,
  handleWeb3AuthWindowClose,
  handleWeb3AuthSuccessLogin,
};
