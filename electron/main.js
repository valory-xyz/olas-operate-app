require('dotenv').config();
const {
  app,
  BrowserWindow,
  Notification,
  ipcMain,
  dialog,
  shell,
} = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const next = require('next/dist/server/next');
const http = require('http');
const AdmZip = require('adm-zip');

const { setupDarwin, setupUbuntu, setupWindows, Env } = require('./install');

const { paths } = require('./constants');
const { killProcesses } = require('./processes');
const { isPortAvailable, findAvailablePort } = require('./ports');
const { PORT_RANGE } = require('./constants');
const { setupStoreIpc } = require('./store');
const { logger } = require('./logger');
const { isDev } = require('./constants');
const { PearlTray } = require('./components/PearlTray');
const { checkUrl } = require('./utils');
const { pki } = require('node-forge');

// Configure Electron to accept self-signed certificates for localhost
app.on('certificate-error', (event, _webContents, url, error, _certificate, callback) => {
  // Allow self-signed certificates for localhost only for specific SSL format errors
  logger.electron(`Certificate error for URL: ${url}, Error: ${error}`);
  if (url.startsWith('https://localhost:') && error === 'net::ERR_CERT_AUTHORITY_INVALID') {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

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

    createAgentActivityWindow();
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
    arm64: 'bins/pearl_arm64',
    x64: 'bins/pearl_x64',
  },
  win32: {
    x64: 'bins/pearl_win.exe',
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

/** @type {Electron.BrowserWindow | null} */
let mainWindow = null;
/** @type {Electron.BrowserWindow | null} */
let splashWindow = null;
/** @type {Electron.BrowserWindow | null} */
let agentWindow = null;
const getAgentWindow = () => agentWindow;

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
  logger.electron('Set app autostart: ' + is_set);
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
    logger.electron('Loaded app settings file ' + JSON.stringify(data));
    setAppAutostart(data.app_auto_start);
  } catch {
    logger.electron('Error loading settings');
  }
}

let isBeforeQuitting = false;
let appRealClose = false;

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
  try {
    logger.electron(
      `Killing backend server by shutdown endpoint: https://localhost:${appConfig.ports.prod.operate}/shutdown`,
    );
    let result = await fetch(
      `https://localhost:${appConfig.ports.prod.operate}/shutdown`,
    );
    logger.electron('Killed backend server by shutdown endpoint!');
    logger.electron(
      `Killed backend server by shutdown endpoint! result: ${JSON.stringify(result)}`,
    );
  } catch (err) {
    logger.electron('Backend stopped with error!');
    logger.electron(
      'Backend stopped with error, result: ' + JSON.stringify(err),
    );
  }

  if (operateDaemon || operateDaemonPid) {
    // clean-up via pid first*
    // may have dangling subprocesses
    try {
      logger.electron('Killing backend server kill process');
      operateDaemonPid && (await killProcesses(operateDaemonPid));
    } catch (e) {
      logger.electron("Couldn't kill daemon processes via pid:");
    }

    // attempt to kill the daemon process via kill
    // if the pid-based cleanup fails
    try {
      const dead = operateDaemon?.kill();
      if (!dead) {
        logger.electron('Daemon process still alive after kill');
      }
    } catch (e) {
      logger.electron("Couldn't kill operate daemon process via kill:");
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
      logger.electron("Couldn't kill devNextApp process via kill:");
    }

    // attempt to kill the dev next app process via pid
    try {
      devNextAppPid && (await killProcesses(devNextAppPid));
    } catch (e) {
      logger.electron("Couldn't kill devNextApp processes via pid:");
    }
  }

  if (nextApp) {
    // attempt graceful close of prod next app
    await nextApp.close().catch(() => {
      logger.electron("Couldn't close NextApp gracefully:");
    });
    // electron will kill next service on exit
  }
  appRealClose = true;
  app.quit();
}

const APP_WIDTH = 480;

/**
 * Creates the splash window
 */
const createSplashWindow = () => {
  /** @type {Electron.BrowserWindow} */
  splashWindow = new BrowserWindow({
    width: APP_WIDTH,
    height: APP_WIDTH,
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

const HEIGHT = 700;
/**
 * Creates the main window
 */
const createMainWindow = async () => {
  if (mainWindow) return;
  const width = APP_WIDTH;
  mainWindow = new BrowserWindow({
    title: 'Pearl',
    resizable: false,
    draggable: true,
    frame: false,
    transparent: true,
    fullscreenable: false,
    maximizable: false,
    width,
    maxHeight: HEIGHT,
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

  ipcMain.on('set-height', (_event, height) => {
    mainWindow?.setSize(width, height);
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

  // Get the agent's current state
  ipcMain.handle('health-check', async (_event) => {
    try {
      const response = await fetch('http://127.0.0.1:8716/healthcheck', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch health check');
      }

      const data = await response.json();
      return { response: data };
    } catch (error) {
      console.error('Health check error:', error);
      return { error: error.message };
    }
  });

  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow.webContents.reloadIgnoringCache();
  });

  mainWindow.webContents.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // open url in a browser and prevent default
    require('electron').shell.openExternal(url);
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
    logger.electron('Store IPC failed:', JSON.stringify(e));
  }
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  await mainWindow.loadURL(nextUrl());
};

/**Create the agent specific window */
/** @type {()=>Promise<BrowserWindow|undefined>} */
const createAgentActivityWindow = async () => {
  if (!getAgentWindow() || getActiveWindow()?.isDestroyed) {
    agentWindow = new BrowserWindow({
      title: 'Agent activity window',
      frame: true,
      maxHeight: 900,
      maxWidth: 1200,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      show: false,
      paintWhenInitiallyHidden: true,
      // parent: mainWindow,
      autoHideMenuBar: true,
    });
  } else {
    logger.electron('Agent activity window already exists');
  }

  agentWindow.on('close', function (event) {
    event.preventDefault();
    agentWindow?.hide();
  });

  return agentWindow;
};

// Create SSL certificate for the backend
function createSSLCertificate() {
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
    cert.validity.notAfter = new Date(cert.validity.notBefore.getTime() + 365 * 24 * 60 * 60 * 1000); // Valid for 1 year

    const attrs = [
      { name: 'countryName', value: 'CH' },
      { name: 'stateOrProvinceName', value: 'Local' },
      { name: 'localityName', value: 'Local' },
      { name: 'organizationName', value: 'Valory AG' },
      { name: 'commonName', value: 'localhost' }
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

async function launchDaemon() {
  // Free up backend port if already occupied
  try {
    await fetch(`https://localhost:${appConfig.ports.prod.operate}/api`);
    logger.electron('Killing backend server!');
    let endpoint = fs
      .readFileSync(`${paths.dotOperateDirectory}/operate.kill`)
      .toString()
      .trim();

    await fetch(`https://localhost:${appConfig.ports.prod.operate}/${endpoint}`);
  } catch (err) {
    logger.electron('Backend not running!' + JSON.stringify(err, null, 2));
  }

  try {
    logger.electron('Killing backend server by shutdown endpoint!');
    let result = await fetch(
      `https://localhost:${appConfig.ports.prod.operate}/shutdown`,
    );
    logger.electron(
      'Backend stopped with result: ' + JSON.stringify(result, null, 2),
    );
  } catch (err) {
    logger.electron(
      'Backend stopped with error: ' + JSON.stringify(err, null, 2),
    );
  }

  const check = new Promise(function (resolve, _reject) {
    const { keyPath, certPath } = createSSLCertificate();
    operateDaemon = spawn(
      path.join(
        process.resourcesPath,
        binaryPaths[platform][process.arch.toString()],
      ),
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
    // fs.appendFileSync(
    //   `${paths.OperateDirectory}/operate.pip`,
    //   `${operateDaemon.pid}`,
    //   {
    //     encoding: 'utf-8',
    //   },
    // );

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
  const { keyPath, certPath } = createSSLCertificate();
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
  // Update
  try {
    // macUpdater.checkForUpdates().then((res) => {
    //   if (!res) return;
    //   if (!res.downloadPromise) return;
    //   new Notification({
    //     title: 'Update Available',
    //     body: 'Downloading update...',
    //   }).show();
    //   res.downloadPromise.then(() => {
    //     new Notification({
    //       title: 'Update Downloaded',
    //       body: 'Restarting application...',
    //     }).show();
    //     macUpdater.quitAndInstall();
    //   });
    // });
  } catch (e) {
    logger.electron(e);
  }

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
    new Notification({
      title: 'Error',
      body: e,
    }).show();
    event.sender.send('response', e);
    // app.quit();
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
 * Sanitizes logs by replacing usernames in the log data with asterisks.
 * If a file path is provided, it reads the log data from the file and sanitizes it.
 * If the file path does not exist, it returns null.
 * If no file path is provided, it sanitizes the provided data directly.
 * The sanitized log data is then written to the destination path.
 * @param {Object} options - The options for sanitizing logs.
 * @param {string} options.name - The name of the log file.
 * @param {string} options.filePath - The file path to read the log data from.
 * @param {string} options.data - The log data to sanitize if no file path is provided.
 * @param {string} options.destPath - The destination path where the logs should be stored after sanitization.
 * @returns {string|null} - The file path of the sanitized log data, or null if the file path does not exist.
 */
function sanitizeLogs({
  name,
  filePath,
  data = '',
  destPath = paths.osPearlTempDir,
}) {
  if (filePath && !fs.existsSync(filePath)) return null;

  const logs = filePath ? fs.readFileSync(filePath, 'utf-8') : data;

  const usernameRegex = /\/(Users|home)\/([^/]+)/g;
  const sanitizedData = logs.replace(usernameRegex, '/$1/*****');
  const sanitizedLogsFilePath = path.join(destPath, name);

  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
  }

  fs.writeFileSync(sanitizedLogsFilePath, sanitizedData);

  return sanitizedLogsFilePath;
}

/**
 * Exports logs by creating a zip file containing sanitized logs and other relevant data.
 */
ipcMain.handle('save-logs', async (_, data) => {
  const cliLogFiles = fs
    .readdirSync(paths.dotOperateDirectory)
    .filter((file) => file.startsWith('cli') && file.endsWith('.log'));

  if (cliLogFiles.length >= 1) {
    cliLogFiles.forEach((file) => {
      const filePath = path.join(paths.dotOperateDirectory, file);
      sanitizeLogs({ name: file, filePath });
    });
  }

  sanitizeLogs({ name: 'next.log', filePath: paths.nextLogFile });

  sanitizeLogs({ name: 'electron.log', filePath: paths.electronLogFile });

  // OS info
  const osInfo = `
    OS Type: ${os.type()}
    OS Platform: ${os.platform()}
    OS Arch: ${os.arch()}
    OS Release: ${os.release()}
    Total Memory: ${os.totalmem()}
    Free Memory: ${os.freemem()}
    Available Parallelism: ${os.availableParallelism()}
    CPUs: ${JSON.stringify(os.cpus())}
  `;
  const osInfoFilePath = path.join(paths.osPearlTempDir, 'os_info.txt');
  fs.writeFileSync(osInfoFilePath, osInfo);

  // Persistent store
  if (data.store) {
    sanitizeLogs({
      name: 'store.txt',
      data: JSON.stringify(data.store, null, 2),
    });
  }

  // Other debug data: balances, addresses, etc.
  if (data.debugData) {
    const clonedDebugData = JSON.parse(JSON.stringify(data.debugData)); // TODO: deep clone with better method
    const servicesData = clonedDebugData.services;
    if (servicesData && Array.isArray(servicesData.services)) {
      Object.entries(servicesData.services).forEach(([_, eachService]) => {
        if (eachService && eachService.env_variables) {
          Object.entries(eachService.env_variables).forEach(([_, envVar]) => {
            if (envVar.provision_type === 'user') {
              envVar.value = '*****';
            }
          });
        }
      });
    }

    clonedDebugData.services = servicesData;

    sanitizeLogs({
      name: 'debug_data.json',
      data: JSON.stringify(clonedDebugData, null, 2),
    });
  }

  // Bridge logs
  try {
    const bridgeLogFilePath = path.join(paths.bridgeDirectory, 'bridge.json');
    if (fs.existsSync(bridgeLogFilePath)) {
      sanitizeLogs({ name: 'bridge.json', filePath: bridgeLogFilePath });
    }
  } catch (e) {
    logger.electron(e);
  }

  // agent_runner.log wraps agent runner process even before agent started, so can check issues with executable start
  try {
    if (fs.existsSync(paths.agentRunnerLogFile)) {
      sanitizeLogs({
        name: 'agent_runner.log',
        filePath: paths.agentRunnerLogFile,
      });
    }
  } catch (e) {
    logger.electron(e);
  }

  // Agent logs
  try {
    fs.readdirSync(paths.servicesDir).forEach((serviceDirName) => {
      const servicePath = path.join(paths.servicesDir, serviceDirName);
      if (!fs.existsSync(servicePath)) return;
      if (!fs.statSync(servicePath).isDirectory()) return;

      // Most recent log
      try {
        const agentLogFilePath = path.join(
          servicePath,
          'deployment',
          'agent',
          'log.txt',
        );
        if (fs.existsSync(agentLogFilePath)) {
          sanitizeLogs({
            name: `${serviceDirName}_agent.log`,
            filePath: agentLogFilePath,
          });
        }
      } catch (e) {
        logger.electron(e);
      }

      // Previous log
      try {
        const prevAgentLogFilePath = path.join(servicePath, 'prev_log.txt');
        if (fs.existsSync(prevAgentLogFilePath)) {
          sanitizeLogs({
            name: `${serviceDirName}_prev_agent.log`,
            filePath: prevAgentLogFilePath,
          });
        }
      } catch (e) {
        logger.electron(e);
      }
    });
  } catch (e) {
    logger.electron(e);
  }

  // Create a zip archive
  const zip = new AdmZip();
  fs.readdirSync(paths.osPearlTempDir).forEach((file) => {
    const filePath = path.join(paths.osPearlTempDir, file);
    if (!fs.existsSync(filePath)) return;
    if (fs.statSync(filePath).isDirectory()) return;

    zip.addLocalFile(filePath);
  });

  // Show save dialog
  const { filePath } = await dialog.showSaveDialog({
    title: 'Save Logs',
    defaultPath: path.join(
      os.homedir(),
      `pearl_logs_${new Date(Date.now())
        .toISOString()
        .replaceAll(':', '-')}-${app.getVersion()}.zip`,
    ),
    filters: [{ name: 'Zip Files', extensions: ['zip'] }],
  });

  let result;
  if (filePath) {
    // Write the zip file to the selected path
    zip.writeZip(filePath);
    result = { success: true, dirPath: path.dirname(filePath) };
  } else {
    result = { success: false };
  }

  // Remove temporary files
  if (fs.existsSync(paths.osPearlTempDir)) {
    fs.rmSync(paths.osPearlTempDir, {
      recursive: true,
      force: true,
    });
  }
  return result;
});

ipcMain.handle('agent-activity-window-goto', async (_event, url) => {
  logger.electron(`agent-activity-window-goto: ${url}`);

  let agentWindow = getAgentWindow();
  if (!agentWindow || agentWindow.isDestroyed()) {
    agentWindow = await createAgentActivityWindow();
  }
  if (!agentWindow) {
    logger.electron('Failed to create agent window');
    return;
  }

  await agentWindow.loadURL(`file://${__dirname}/resources/agent-loading.html`);
  logger.electron('Showing loading screen');

  const checkAndLoadUrl = async () => {
    logger.electron(`Starting URL check: ${url}`);

    try {
      if (await checkUrl(url)) {
        await agentWindow.loadURL(url);
        logger.electron(`Successfully loaded: ${url}`);
        return true;
      }
    } catch (error) {
      logger.electron(`Error checking URL: ${error.message}`);
    }
    return false;
  };

  if (await checkAndLoadUrl()) return;

  const interval = setInterval(async () => {
    if (await checkAndLoadUrl()) {
      clearInterval(interval);
    } else {
      logger.electron(`Valid URL not available yet, retrying in 5s...`);
    }
  }, 5000);
});

ipcMain.handle('agent-activity-window-hide', () => {
  logger.electron('agent-activity-window-hide');
  if (!getAgentWindow() || getAgentWindow().isDestroyed()) return; // already destroyed
  getAgentWindow()?.hide();
});

ipcMain.handle('agent-activity-window-show', () => {
  logger.electron('agent-activity-window-show');
  if (!getAgentWindow() || getAgentWindow().isDestroyed()) {
    createAgentActivityWindow()?.then((aaw) => aaw.show());
  } else {
    getAgentWindow()?.show();
  }
});

ipcMain.handle('agent-activity-window-minimize', () => {
  logger.electron('agent-activity-window-minimize');
  if (!getAgentWindow() || getAgentWindow().isDestroyed()) return; // nothing to minimize
  getAgentWindow()?.then((aaw) => aaw.minimize());
});
