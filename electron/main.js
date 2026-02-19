
require('dotenv').config();

const {
  configureSessionCertificates,
  loadLocalCertificate,
  stringifyJson,
  secureFetch,
} = require('./utils/certificate');

const {
  handleWeb3AuthWindowShow,
  handleWeb3AuthWindowClose,
  handleWeb3AuthSuccessLogin,
} = require('./windows/web3auth');

const {
  handleWeb3AuthSwapOwnerWindowShow,
  handleWeb3AuthSwapOwnerSuccess,
  handleWeb3AuthWindowSwapOwnerClose,
  handleWeb3AuthSwapOwnerFailure,
} = require('./windows/web3authSwapOwner');

const {
  handleTermsAndConditionsWindowShow,
} = require('./windows/termsAndConditions');

const { nextLogger } = require('./logger');

// Load the self-signed certificate for localhost HTTPS requests
loadLocalCertificate();

const {
  app,
  BrowserWindow,
  Notification,
  ipcMain,
  shell,
  systemPreferences,
  nativeImage,
} = require('electron');

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const next = require('next/dist/server/next');
const http = require('http');

const { setupDarwin, setupUbuntu, setupWindows, Env } = require('./install');

const iconPath = path.join(__dirname, 'assets/icons/512x512.png');
const appIcon = nativeImage.createFromPath(iconPath);

const {
  paths,
  isMac,
  isDev,
  popupAllowedUrls,
  PORT_RANGE,
  WIDTH,
  HEIGHT,
} = require('./constants');
const { killProcesses } = require('./processes');
const { isPortAvailable, findAvailablePort } = require('./ports');
const { setupStoreIpc } = require('./store');
const { logger } = require('./logger');
const { PearlTray } = require('./components/PearlTray');

const { pki } = require('node-forge');

// Register IPC handlers for logs
require('./features/logs');

// Validates environment variables required for Pearl
// kills the app/process if required environment variables are unavailable
// mostly RPC URLs and NODE_ENV
// TODO: only reintroduce once refactor completed
// validateEnv();

// Add devtools extension in Dev mode
if (isDev) {
  const {
    default: installExtension,
    REACT_DEVELOPER_TOOLS,
  } = require('electron-devtools-installer');
  app.whenReady().then(() => {
    installExtension([REACT_DEVELOPER_TOOLS], {
      loadExtensionOptions: { allowFileAccess: true },
      forceDownload: false,
    })
      .then(([react]) => console.log(`Added Extensions: ${react.name}`))
      .catch((e) =>
        console.log('An error occurred on loading extensions: ', e),
      );
  });
}

// Add context menu in development mode when enabled via environment variable
if (isDev && process.env.ENABLE_DEVELOPER_TOOLS_CONTEXT_MENU === 'true') {
  import('electron-context-menu')
    .then((contextMenuModule) => {
      const contextMenu = contextMenuModule.default;
      const disposeContextMenu = contextMenu({
        showInspectElement: true,
      });

      app.on('before-quit', () => {
        disposeContextMenu();
      });
    })
    .catch((error) => {
      console.error('Failed to load electron-context-menu:', error);
    });
}

// Attempt to acquire the single instance lock
const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  try {
    logger.electron('Could not obtain single instance lock. Quitting...');
  } catch (e) {
    console.error(e);
  } finally {
    app.exit();
  }
}

const platform = os.platform();

const binaryPaths = {
  darwin: {
    arm64: 'bins/middleware/pearl_arm64',
    x64: 'bins/middleware/pearl_x64',
  },
  win32: {
    x64: 'bins/middleware/pearl_win.exe',
  },
  linux: {
    x64: 'bins/middleware/pearl_x64',
  },
};

let appConfig = {
  ports: {
    dev: {
      operate: 8000,
      next: 3000,
    },
    prod: {
      operate: 8765,
      next: 3000,
    },
  },
};

const nextUrl = () =>
  `http://localhost:${isDev ? appConfig.ports.dev.next : appConfig.ports.prod.next}`;

const backendUrl = () =>
  `https://localhost:${isDev ? appConfig.ports.dev.operate : appConfig.ports.prod.operate}`;

/** @type {Electron.BrowserWindow | null} */
let mainWindow = null;
/** @type {Electron.BrowserWindow | null} */
let splashWindow = null;
/** @type {Electron.BrowserWindow | null} */
let onRampWindow = null;
const getOnRampWindow = () => onRampWindow;

/** @type {Electron.Tray | null} */
let tray = null;

// Used in production and development
let operateDaemon;
let operateDaemonPid;

// Child processes for running next app are only used in development
// required for hot reloads and other dev features
let devNextApp;
let devNextAppPid;

// Next.js app instance for production
// requires http server wrap to work; assign port, receive requests, deliver responses
// @ts-ignore - Workaround for the missing type definitions
const nextApp = next({
  dev: false, // DO NOT SET TO TRUE
  dir: path.join(__dirname),
});

const getActiveWindow = () => splashWindow ?? mainWindow;

function showNotification(title, body) {
  new Notification({ title, body }).show();
}

function setAppAutostart(is_set) {
  logger.electron(`Set app autostart: ${is_set}`);
  app.setLoginItemSettings({ openAtLogin: is_set });
}

function handleAppSettings() {
  logger.electron('Handle app settings');
  let app_settings_file = `${paths.dotOperateDirectory}/app_settings.json`;
  try {
    if (!fs.existsSync(app_settings_file)) {
      logger.electron('Create app settings file');
      let obj = { app_auto_start: true };
      fs.writeFileSync(app_settings_file, JSON.stringify(obj));
    }
    let data = JSON.parse(fs.readFileSync(app_settings_file));
    logger.electron(`Loaded app settings file: ${JSON.stringify(data)}`);
    setAppAutostart(data.app_auto_start);
  } catch {
    logger.electron('Error loading settings');
  }
}

let isBeforeQuitting = false;
let appRealClose = false;

/**
 * function to stop the backend server gracefully and
 * kill the child processes if they are running.
 */
async function stopBackend() {
  // Free up backend port if already occupied
  try {
    logger.electron('Killing backend server by shutdown endpoint!');
    const result = await secureFetch(`${backendUrl()}/shutdown`);
    logger.electron(
      `Backend stopped with result: ${stringifyJson(await result.json())}`,
    );
  } catch (e) {
    logger.electron(`Backend stopped with error: ${stringifyJson(e)}`);
  }

  try {
    await secureFetch(`${backendUrl()}/api`);
    logger.electron('Killing backend server!');
    const endpoint = fs
      .readFileSync(`${paths.dotOperateDirectory}/operate.kill`)
      .toString()
      .trim();

    await secureFetch(`${backendUrl()}/${endpoint}`);
  } catch (e) {
    logger.electron(`Backend not running: ${stringifyJson(e)}`);
  }
}

async function beforeQuit(event) {
  if (typeof event.preventDefault === 'function' && !appRealClose) {
    event.preventDefault();
    logger.electron('onquit event.preventDefault');
  }

  if (isBeforeQuitting) return;
  isBeforeQuitting = true;

  // destroy all ui components for immediate feedback
  tray?.destroy();
  splashWindow?.destroy();
  mainWindow?.destroy();

  logger.electron('Stop backend gracefully:');
  await stopBackend();

  if (operateDaemon || operateDaemonPid) {
    // clean-up via pid first
    // may have dangling subprocesses
    try {
      logger.electron('Killing backend server kill process');
      operateDaemonPid && (await killProcesses(operateDaemonPid));
    } catch (e) {
      logger.electron(
        `Couldn't kill daemon processes via pid: ${stringifyJson(e)}`,
      );
    }

    // attempt to kill the daemon process via kill
    // if the pid-based cleanup fails
    try {
      const dead = operateDaemon?.kill();
      if (!dead) {
        logger.electron('Daemon process still alive after kill');
      }
    } catch (e) {
      logger.electron(
        `Couldn't kill operate daemon process via kill: ${stringifyJson(e)}`,
      );
    }
  }

  if (devNextApp || devNextAppPid) {
    // attempt graceful kill first with next app
    try {
      const dead = devNextApp?.kill();
      if (!dead) {
        logger.electron('Dev NextApp process still alive after kill');
      }
    } catch (e) {
      logger.electron(
        `Couldn't kill devNextApp process via kill: ${stringifyJson(e)}`,
      );
    }

    // attempt to kill the dev next app process via pid
    try {
      devNextAppPid && (await killProcesses(devNextAppPid));
    } catch (e) {
      logger.electron(
        `Couldn't kill devNextApp processes via pid: ${stringifyJson(e)}`,
      );
    }
  }

  if (nextApp) {
    // attempt graceful close of prod next app
    await nextApp.close().catch((e) => {
      logger.electron(`Couldn't close NextApp gracefully: ${stringifyJson(e)}`);
    });
    // electron will kill next service on exit
  }
  appRealClose = true;
  app.quit();
}

const APP_WIDTH = 1320;
const APP_HEIGHT = 796;

/**
 * Creates the splash window
 */
const createSplashWindow = () => {
  /** @type {Electron.BrowserWindow} */
  splashWindow = new BrowserWindow({
    width: APP_WIDTH,
    icon: appIcon,
    height: APP_HEIGHT,
    resizable: false,
    show: true,
    title: 'Pearl',
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  splashWindow.loadURL('file://' + __dirname + '/resources/app-loading.html');
};

/**
 * Creates the main window
 */
const createMainWindow = async () => {
  if (mainWindow) return;
  mainWindow = new BrowserWindow({
    title: 'Pearl',
    icon: appIcon,
    resizable: false,
    draggable: true,
    frame: false,
    transparent: true,
    fullscreenable: false,
    maximizable: false,
    width: APP_WIDTH,
    maxWidth: APP_WIDTH,
    height: APP_HEIGHT,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.setMenuBarVisibility(true);

  ipcMain.on('close-app', () => {
    mainWindow?.close();
  });

  ipcMain.on('minimize-app', () => {
    mainWindow?.minimize();
  });

  app.on('activate', () => {
    if (mainWindow?.isMinimized()) {
      mainWindow?.restore();
    } else {
      mainWindow?.show();
    }
  });

  ipcMain.on('show-notification', (_event, title, description) => {
    showNotification(title, description || undefined);
  });

  // if app (ie. mainWindow) is loaded, destroy splash window.
  ipcMain.on('is-app-loaded', (_event, isLoaded) => {
    if (isLoaded && splashWindow) {
      splashWindow.destroy();
      splashWindow = null;
    }
  });

  ipcMain.handle('app-version', () => app.getVersion());

  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow.webContents.reloadIgnoringCache();
  });

  mainWindow.webContents.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // If it's in the list of urls we allow to open as pop-ups, do so
    if (popupAllowedUrls.includes(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          parent: mainWindow,
          modal: true,
          width: WIDTH,
          height: HEIGHT,
          autoHideMenuBar: true,
          resizable: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        },
      };
    }

    // If it's an external link, open url in a browser and prevent default
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', function (event) {
    event.preventDefault();
    mainWindow.hide();
  });

  try {
    logger.electron('Setting up store IPC');
    setupStoreIpc(ipcMain, mainWindow);
  } catch (e) {
    logger.electron(`Store IPC failed: ${stringifyJson(e)}`);
  }
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  await mainWindow.loadURL(nextUrl());
};

// Create SSL certificate for the backend
function createAndLoadSslCertificate() {
  try {
    logger.electron('Creating SSL certificate...');

    const certDir = path.join(paths.dotOperateDirectory, 'ssl');
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }

    const keyPath = path.join(certDir, 'key.pem');
    const certPath = path.join(certDir, 'cert.pem');

    // Generate a key pair
    const keys = pki.rsa.generateKeyPair(2048);

    // Create a certificate
    const cert = pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();

    // Valid for 1 year
    cert.validity.notAfter = new Date(
      cert.validity.notBefore.getTime() + 365 * 24 * 60 * 60 * 1000,
    );

    const attrs = [
      { name: 'countryName', value: 'CH' },
      { name: 'stateOrProvinceName', value: 'Local' },
      { name: 'localityName', value: 'Local' },
      { name: 'organizationName', value: 'Valory AG' },
      { name: 'commonName', value: 'localhost' },
    ];

    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.setExtensions([
      { name: 'basicConstraints', cA: false },
      { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
      { name: 'extKeyUsage', serverAuth: true },
    ]);

    // Sign the certificate
    cert.sign(keys.privateKey);

    // Convert to PEM format
    const privateKeyPem = pki.privateKeyToPem(keys.privateKey);
    const certificatePem = pki.certificateToPem(cert);

    // Write to files
    fs.writeFileSync(keyPath, privateKeyPem);
    fs.writeFileSync(certPath, certificatePem);
    loadLocalCertificate();
    logger.electron(
      `SSL certificate created successfully at ${keyPath} and ${certPath}`,
    );

    return {
      keyPath,
      certPath,
    };
  } catch (error) {
    logger.electron('Failed to create SSL certificate:', error.message);
    throw error;
  }
}

/**
 * Create the on-ramping window for displaying transak iframe
 */
/** @type {()=>Promise<BrowserWindow|undefined>} */
const createOnRampWindow = async (
  amountToPay,
  networkName,
  cryptoCurrencyCode,
) => {
  if (!getOnRampWindow() || getOnRampWindow().isDestroyed) {
    onRampWindow = new BrowserWindow({
      title: 'Buy Crypto on Transak',
      resizable: false,
      draggable: true,
      frame: false,
      transparent: true,
      fullscreenable: false,
      maximizable: false,
      closable: false,
      width: APP_WIDTH,
      height: 700,
      media: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    onRampWindow.webContents.setWindowOpenHandler(({ url }) => {
      // open url in a browser and prevent default
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // query parameters for the on-ramp URL
    const onRampQuery = new URLSearchParams();
    if (amountToPay) {
      onRampQuery.append('amount', amountToPay.toString());
    }
    if (networkName) {
      onRampQuery.append('networkName', networkName);
    }
    if (cryptoCurrencyCode) {
      onRampQuery.append('cryptoCurrencyCode', cryptoCurrencyCode);
    }
    const onRampUrl = `${nextUrl()}/onramp?${onRampQuery.toString()}`;
    logger.electron(`OnRamp URL: ${onRampUrl}`);

    // request camera access for KYC
    if (isMac) {
      try {
        const granted = await systemPreferences.askForMediaAccess('camera');
        logger.electron(`macOS camera permission granted: ${granted}`);
      } catch (e) {
        logger.electron(`Error requesting macOS camera permission: ${e}`);
      }
    }

    onRampWindow.loadURL(onRampUrl).then(() => {
      logger.electron(`onRampWindow: ${onRampWindow.url}`);
    });
  } else {
    logger.electron('OnRamp window already exists');
  }

  onRampWindow.on('close', function (event) {
    event.preventDefault();
    onRampWindow?.destroy();
  });

  return onRampWindow;
};

function removeQuarantine(filePath) {
  try {
    const { execSync } = require('child_process');
    execSync(`xattr -p com.apple.quarantine "${filePath}"`, {
      stdio: 'ignore',
    });
    execSync(`xattr -d com.apple.quarantine "${filePath}"`);
    logger.electron(`Removed quarantine attribute from ${filePath}`);
  } catch (e) {
    logger.electron(
      `Failed to remove quarantine attribute from ${filePath}: ${e}`,
    );
  }
}

async function launchDaemon() {
  const check = new Promise(function (resolve, _reject) {
    const { keyPath, certPath } = createAndLoadSslCertificate();

    const binPath = path.join(
      process.resourcesPath,
      binaryPaths[platform][process.arch.toString()],
    );
    if (platform === 'darwin') {
      removeQuarantine(binPath);
    }
    logger.electron(`middleware bin path: ${binPath}`);
    operateDaemon = spawn(
        binPath,
      [
        'daemon',
        `--port=${appConfig.ports.prod.operate}`,
        `--home=${paths.dotOperateDirectory}`,
        `--ssl-keyfile=${keyPath}`,
        `--ssl-certfile=${certPath}`,
      ],
      { env: Env },
    );
    operateDaemonPid = operateDaemon.pid;

    operateDaemon.stderr.on('data', (data) => {
      if (data.toString().includes('Uvicorn running on')) {
        resolve({ running: true, error: null });
      }
      if (
        data.toString().includes('error while attempting to bind on address')
      ) {
        resolve({ running: false, error: 'Port already in use' });
      }
      logger.cli(data.toString().trim());
    });
    operateDaemon.stdout.on('data', (data) => {
      logger.cli(data.toString().trim());
    });
  });

  return await check;
}

async function launchDaemonDev() {
  const { keyPath, certPath } = createAndLoadSslCertificate();
  const check = new Promise(function (resolve, _reject) {
    operateDaemon = spawn('poetry', [
      'run',
      'operate',
      'daemon',
      `--port=${appConfig.ports.dev.operate}`,
      '--home=.operate',
      `--ssl-keyfile=${keyPath}`,
      `--ssl-certfile=${certPath}`,
    ]);
    operateDaemonPid = operateDaemon.pid;
    operateDaemon.stderr.on('data', (data) => {
      if (data.toString().includes('Uvicorn running on')) {
        resolve({ running: true, error: null });
      }
      if (
        data.toString().includes('error while attempting to bind on address')
      ) {
        resolve({ running: false, error: 'Port already in use' });
      }
      logger.cli(data.toString().trim());
    });
    operateDaemon.stdout.on('data', (data) => {
      logger.cli(data.toString().trim());
    });
  });
  return await check;
}

async function launchNextApp() {
  logger.electron('Launching Next App');

  logger.electron('Preparing Next App');
  await nextApp.prepare();

  logger.electron('Getting Next App Handler');
  const handle = nextApp.getRequestHandler();

  logger.electron('Creating Next App Server');
  const server = http.createServer((req, res) => {
    handle(req, res); // Handle requests using the Next.js request handler
  });

  logger.electron('Listening on Next App Server');
  server.listen(appConfig.ports.prod.next, () => {
    logger.next(`> Next server running on ${nextUrl()}`);
  });
}

async function launchNextAppDev() {
  await new Promise(function (resolve, _reject) {
    process.env.NEXT_PUBLIC_BACKEND_PORT = appConfig.ports.dev.operate; // must set next env var to connect to backend
    devNextApp = spawn(
      'yarn',
      ['dev:frontend', '--port', appConfig.ports.dev.next],
      {
        shell: true,
        env: {
          ...process.env,
          NEXT_PUBLIC_BACKEND_PORT: appConfig.ports.dev.operate,
          NEXT_PUBLIC_PEARL_VERSION: app.getVersion(),
        },
      },
    );
    devNextAppPid = devNextApp.pid;
    devNextApp.stdout.on('data', (data) => {
      logger.next(data.toString().trim());
      resolve();
    });
  });
}

ipcMain.on('check', async function (event, _argument) {
  // Setup
  try {
    handleAppSettings();
    event.sender.send('response', 'Checking installation');

    if (platform === 'darwin') {
      await setupDarwin(event.sender);
    } else if (platform === 'win32') {
      await setupWindows(event.sender);
    } else {
      await setupUbuntu(event.sender);
    }

    // Free up backend port if already occupied
    await stopBackend();

    if (isDev) {
      event.sender.send(
        'response',
        'Starting Pearl Daemon In Development Mode',
      );

      const daemonDevPortAvailable = await isPortAvailable(
        appConfig.ports.dev.operate,
      );

      if (!daemonDevPortAvailable) {
        appConfig.ports.dev.operate = await findAvailablePort({
          ...PORT_RANGE,
        });
      }
      await launchDaemonDev();
      event.sender.send(
        'response',
        'Starting Frontend Server In Development Mode',
      );

      const frontendDevPortAvailable = await isPortAvailable(
        appConfig.ports.dev.next,
      );

      if (!frontendDevPortAvailable) {
        appConfig.ports.dev.next = await findAvailablePort({
          ...PORT_RANGE,
          excludePorts: [appConfig.ports.dev.operate],
        });
      }
      await launchNextAppDev();
    } else {
      event.sender.send('response', 'Starting Pearl Daemon');
      await launchDaemon();

      event.sender.send('response', 'Starting Frontend Server');
      const frontendPortAvailable = await isPortAvailable(
        appConfig.ports.prod.next,
      );
      if (!frontendPortAvailable) {
        appConfig.ports.prod.next = await findAvailablePort({
          ...PORT_RANGE,
          excludePorts: [appConfig.ports.prod.operate],
        });
      }
      await launchNextApp();
    }

    event.sender.send('response', 'Launching App');
    createMainWindow();
    tray = new PearlTray(getActiveWindow);
  } catch (e) {
    logger.electron(e);
    new Notification({ title: 'Error', body: e }).show();
    event.sender.send('response', e);
  }
});

// APP-SPECIFIC EVENTS
app.on('second-instance', () => {
  logger.electron('User attempted to open a second instance.');

  if (mainWindow) {
    logger.electron('Restoring primary main window.');
    mainWindow.show();
    return;
  }

  if (splashWindow) {
    logger.electron(
      'Restoring primary splash window as there is no main window.',
    );
    splashWindow.show();
    return;
  }
});

app.once('ready', async () => {
  configureSessionCertificates();

  app.on('window-all-closed', () => {
    app.quit();
  });

  app.on('before-quit', async (event) => {
    await beforeQuit(event);
  });

  if (platform === 'darwin') {
    app.dock?.setIcon(
      path.join(__dirname, 'assets/icons/splash-robot-head-dock.png'),
    );
  }

  createSplashWindow();
});

// PROCESS SPECIFIC EVENTS (HANDLES NON-GRACEFUL TERMINATION)
process.on('uncaughtException', (error) => {
  logger.electron('Uncaught Exception:', error);
  // Clean up your child processes here
  beforeQuit({}).then(() => {
    process.exit(1); // Exit with a failure code
  });
});

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    logger.electron(`Received ${signal}. Cleaning up...`);
    beforeQuit({}).then(() => {
      process.exit(0);
    });
  });
});

// OPEN PATH
ipcMain.on('open-path', (_, filePath) => {
  shell.openPath(filePath);
});

/**
 * Logs an event message to the logger.
 */
ipcMain.handle('log-event', (_event, message) => {
  logger.electron(message);
});

ipcMain.handle('next-log-error', (_event, error, errorInfo) => {
  nextLogger.error(error, errorInfo);
});

/**
 * OnRamp window handlers
 */
ipcMain.handle(
  'onramp-window-show',
  (_event, amountToPay, networkName, cryptoCurrencyCode) => {
    logger.electron('onramp-window-show');

    if (!getOnRampWindow() || getOnRampWindow().isDestroyed()) {
      createOnRampWindow(amountToPay, networkName, cryptoCurrencyCode)?.then(
        (window) => window.show(),
      );
    } else {
      getOnRampWindow()?.show();
    }
  },
);

ipcMain.handle('onramp-window-close', () => {
  logger.electron('onramp-window-close');

  // already destroyed or not created
  if (!getOnRampWindow() || getOnRampWindow().isDestroyed()) return;

  getOnRampWindow()?.destroy();

  // Notify all other windows that it has been closed
  BrowserWindow.getAllWindows().forEach((win) => {
    logger.electron(`onramp-window-did-close to ${win.id}`);
    win.webContents.send('onramp-window-did-close');
  });
});

ipcMain.handle('onramp-transaction-success', () => {
  logger.electron('onramp-transaction-success');

  // Notify all other windows that the transaction was successful
  BrowserWindow.getAllWindows().forEach((win) => {
    logger.electron(`onramp-transaction-success to ${win.id}`);
    win.webContents.send('onramp-transaction-success');
  });
});

ipcMain.handle('onramp-transaction-failure', () => {
  logger.electron('onramp-transaction-failure');

  // Notify all other windows that the transaction was failed
  BrowserWindow.getAllWindows().forEach((win) => {
    logger.electron(`onramp-transaction-failure to ${win.id}`);
    win.webContents.send('onramp-transaction-failure');
  });
});

/**
 * Web3Auth window handlers
 */
ipcMain.handle('web3auth-window-show', () =>
  handleWeb3AuthWindowShow(nextUrl()),
);
ipcMain.handle('web3auth-window-close', handleWeb3AuthWindowClose);
ipcMain.handle('web3auth-address-received', (_event, address) =>
  handleWeb3AuthSuccessLogin(mainWindow, address),
);

/**
 * Web3Auth swap owner window handlers
 */
ipcMain.handle('web3auth-swap-owner-window-show', (_event, params) =>
  handleWeb3AuthSwapOwnerWindowShow(nextUrl(), params),
);
ipcMain.handle(
  'web3auth-swap-owner-window-close',
  handleWeb3AuthWindowSwapOwnerClose,
);
ipcMain.handle('web3auth-swap-owner-success', (_event, result) =>
  handleWeb3AuthSwapOwnerSuccess(mainWindow, result),
);
ipcMain.handle('web3auth-swap-owner-failure', (_event, result) =>
  handleWeb3AuthSwapOwnerFailure(mainWindow, result),
);

/**
 * Terms window handlers
 */
ipcMain.handle('terms-window-show', (_event, hash) =>
  handleTermsAndConditionsWindowShow(hash),
);
