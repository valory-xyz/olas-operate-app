// TODO: move here all windows in Pearl V1

const { BrowserWindow } = require('electron');
const path = require('path');

const { logger } = require('../logger');
const { WIDTH, HEIGHT } = require('../constants/size');

/** @type {Electron.BrowserWindow | null} */
let web3AuthWindow = null;
const getWeb3AuthWindow = () => web3AuthWindow;

/**
 * Create the web3auth window for displaying web3auth modal
 */
/** @type {()=>Promise<BrowserWindow|undefined>} */
const createWeb3AuthWindow = async (baseUrl) => {
  if (!getWeb3AuthWindow() || getWeb3AuthWindow().isDestroyed()) {
    web3AuthWindow = new BrowserWindow({
      title: 'Web3Auth',
      resizable: false,
      draggable: true,
      frame: false,
      transparent: true,
      fullscreenable: false,
      maximizable: false,
      closable: false,
      width: WIDTH,
      height: HEIGHT,
      media: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload.js'),
      },
    });

    const web3AuthUrl = `${baseUrl}/web3auth`;

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

const handleWeb3AuthWindowShow = (baseUrl) => {
  logger.electron('web3auth-window-show');

  if (!getWeb3AuthWindow() || getWeb3AuthWindow().isDestroyed()) {
    createWeb3AuthWindow(baseUrl)?.then((window) => window.show());
  } else {
    getWeb3AuthWindow()?.show();
  }
};

const handleWeb3AuthWindowClose = () => {
  logger.electron('web3auth-window-close');

  // already destroyed or not created
  if (!getWeb3AuthWindow() || getWeb3AuthWindow().isDestroyed()) return;

  getWeb3AuthWindow()?.destroy();
};

const handleWeb3AuthSuccessLogin = (mainWindow, address) => {
  if (!address) return;

  logger.electron(`web3auth-address-received: ${address}`);
  mainWindow.webContents.send('web3auth-address-received', address);
};

module.exports = {
  handleWeb3AuthWindowShow,
  handleWeb3AuthWindowClose,
  handleWeb3AuthSuccessLogin,
};
