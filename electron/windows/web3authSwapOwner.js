const { BrowserWindow } = require('electron');
const path = require('path');

const { logger } = require('../logger');
const { WIDTH, HEIGHT } = require('../constants/size');

/** @type {Electron.BrowserWindow | null} */
let web3AuthSwapOwnerWindow = null;
const getWeb3AuthOwnerSwapWindow = () => web3AuthSwapOwnerWindow;

/**
 * Creates the Web3Auth Swap Owner window.
 * @param {string} baseUrl - Base URL for the window.
 * @param {{safeAddress: string, oldOwnerAddress: string, newOwnerAddress: string, backupOwnerAddress: string, chainId: number}} params - Transaction parameters.
 * @returns {Promise<Electron.BrowserWindow|undefined>} The created BrowserWindow instance or undefined.
 */
const createWeb3AuthSwapOwnerWindow = async (baseUrl, params) => {
  if (
    !getWeb3AuthOwnerSwapWindow() ||
    getWeb3AuthOwnerSwapWindow().isDestroyed()
  ) {
    web3AuthSwapOwnerWindow = new BrowserWindow({
      title: 'Web3Auth Swap Owner',
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

    const queryParams = new URLSearchParams(params).toString();
    const web3AuthUrl = `${baseUrl}/web3auth-swap-owner?${queryParams}`;

    web3AuthSwapOwnerWindow.loadURL(web3AuthUrl).then(() => {
      logger.electron(
        `Open Web3Auth Swap Owner window: ${web3AuthSwapOwnerWindow.url}`,
      );
    });
  } else {
    logger.electron('Web3Auth Swap Owner window already exists');
  }

  web3AuthSwapOwnerWindow.on('close', function (event) {
    event.preventDefault();
    web3AuthSwapOwnerWindow?.destroy();
  });

  return web3AuthSwapOwnerWindow;
};

const handleWeb3AuthSwapOwnerWindowShow = (baseUrl, params) => {
  logger.electron('web3auth-swap-owner-window-show');
  if (
    !getWeb3AuthOwnerSwapWindow() ||
    getWeb3AuthOwnerSwapWindow().isDestroyed()
  ) {
    createWeb3AuthSwapOwnerWindow(baseUrl, params)?.then((window) =>
      window.show(),
    );
  } else {
    // If window exists, reload it with new params
    const queryParams = new URLSearchParams(params).toString();
    const web3AuthUrl = `${baseUrl}/web3auth-swap-owner?${queryParams}`;
    logger.electron(`Reloading Web3Auth Swap Owner URL: ${web3AuthUrl}`);
    getWeb3AuthOwnerSwapWindow()?.loadURL(web3AuthUrl);
    getWeb3AuthOwnerSwapWindow()?.show();
  }
};

const handleWeb3AuthWindowSwapOwnerClose = () => {
  logger.electron('web3auth-swap-owner-window-close');

  if (
    !getWeb3AuthOwnerSwapWindow() ||
    getWeb3AuthOwnerSwapWindow().isDestroyed()
  ) {
    return;
  }

  getWeb3AuthOwnerSwapWindow()?.destroy();

  // Notify all windows that the swap owner window has been closed
  BrowserWindow.getAllWindows().forEach((win) => {
    logger.electron(`web3auth-swap-owner-window-closed to ${win.id}`);
    win.webContents.send('web3auth-swap-owner-window-closed');
  });
};

const handleWeb3AuthSwapOwnerSuccess = (mainWindow, result) => {
  if (!result) return;

  logger.electron(`web3auth-swap-owner-success: ${result}`);
  mainWindow.webContents.send('web3auth-swap-owner-success', result);
};

const handleWeb3AuthSwapOwnerFailure = (mainWindow, result) => {
  if (!result) return;

  logger.electron(`web3auth-swap-owner-failure: ${result}`);
  mainWindow.webContents.send('web3auth-swap-owner-failure', result);
};

module.exports = {
  handleWeb3AuthSwapOwnerWindowShow,
  handleWeb3AuthWindowSwapOwnerClose,
  handleWeb3AuthSwapOwnerSuccess,
  handleWeb3AuthSwapOwnerFailure,
};
