import AdmZip from 'adm-zip';
import { spawn } from 'child_process';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  Notification,
  shell,
  Tray,
} from 'electron';
import fs from 'fs';
import http from 'http';
import next from 'next';
import os from 'os';
import path from 'path';

import { APP_HEIGHT, APP_WIDTH } from './constants/appSizes.mjs';
import { isDev } from './constants/env.mjs';
import { isMac, isWindows } from './constants/os.mjs';
import { paths } from './constants/paths.mjs';
import { PORT_RANGE } from './constants/ports.mjs';
import { Env } from './install.mjs';
import { setupStoreIpc } from './store.mjs';
import { macUpdater } from './update.mjs';
import { TRAY_ICONS, TRAY_ICONS_PATHS } from './utils/icons.mjs';
import { logger } from './utils/logger.mjs';
import { findAvailablePort, isPortAvailable } from './utils/ports.mjs';
import { killProcesses } from './utils/processes.mjs';

// Attempt to acquire the single instance lock
const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) app.quit();

const platform = os.platform();

const binaryPaths = {
  darwin: {
    arm64: 'bins/pearl_arm64',
    x64: 'bins/pearl_x64',
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

let tray,
  mainWindow,
  splashWindow,
  operateDaemon,
  operateDaemonPid,
  nextAppProcess,
  nextAppProcessPid;

function showNotification(title, body) {
  new Notification({ title, body }).show();
}

async function beforeQuit() {
  if (operateDaemonPid) {
    try {
      await killProcesses(operateDaemonPid);
    } catch (e) {
      logger.electron(e);
    }
  }

  if (nextAppProcessPid) {
    try {
      await killProcesses(nextAppProcessPid);
    } catch (e) {
      logger.electron(e);
    }
  }

  tray && tray.destroy();
  mainWindow && mainWindow.destroy();
}

const getUpdatedTrayIcon = (iconPath) => {
  const icon = iconPath;
  if (icon.resize) {
    icon.resize({ width: 16 });
    icon.setTemplateImage(true);
  }

  return icon;
};

/**
 * Creates the tray
 */
const createTray = () => {
  const trayPath = getUpdatedTrayIcon(
    isWindows || isMac ? TRAY_ICONS.LOGGED_OUT : TRAY_ICONS_PATHS.LOGGED_OUT,
  );

  const tray = new Tray(trayPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show app',
      click: function () {
        mainWindow.show();
      },
    },
    {
      label: 'Hide app',
      click: function () {
        mainWindow.hide();
      },
    },
    {
      label: 'Quit',
      click: async function () {
        await beforeQuit();
        app.quit();
      },
    },
  ]);
  tray.setToolTip('Pearl');
  tray.setContextMenu(contextMenu);

  ipcMain.on('tray', (_event, status) => {
    switch (status) {
      case 'low-gas': {
        const icon = getUpdatedTrayIcon(
          isWindows || isMac ? TRAY_ICONS.LOW_GAS : TRAY_ICONS_PATHS.LOW_GAS,
        );
        tray.setImage(icon);
        break;
      }
      case 'running': {
        const icon = getUpdatedTrayIcon(
          isWindows || isMac ? TRAY_ICONS.RUNNING : TRAY_ICONS_PATHS.RUNNING,
        );
        tray.setImage(icon);

        break;
      }
      case 'paused': {
        const icon = getUpdatedTrayIcon(
          isWindows || isMac ? TRAY_ICONS.PAUSED : TRAY_ICONS_PATHS.PAUSED,
        );
        tray.setImage(icon);
        break;
      }
    }
  });
};

/**
 * Creates the splash window
 */
const createSplashWindow = () => {
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
  splashWindow.loadURL('file://' + import.meta.dirname + '/loading/index.html');

  if (isDev) {
    splashWindow.webContents.openDevTools({
      mode: 'detach',
    });
  }
};

/**
 * Creates the main window
 */
const createMainWindow = async () => {
  mainWindow = new BrowserWindow({
    title: 'Pearl',
    resizable: false,
    draggable: true,
    frame: false,
    transparent: true,
    fullscreenable: false,
    maximizable: false,
    width: APP_WIDTH,
    maxHeight: APP_HEIGHT,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(import.meta.dirname, 'preload.cjs'),
    },
  });

  mainWindow.setMenuBarVisibility(true);

  if (isDev) {
    mainWindow.loadURL(`http://localhost:${appConfig.ports.dev.next}`);
  } else {
    mainWindow.loadURL(`http://localhost:${appConfig.ports.prod.next}`);
  }

  ipcMain.on('close-app', () => {
    mainWindow.close();
  });

  ipcMain.on('minimize-app', () => {
    mainWindow.minimize();
  });

  app.on('activate', () => {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    } else {
      mainWindow.show();
    }
  });

  ipcMain.on('set-height', (_event, height) => {
    mainWindow.setSize(APP_WIDTH, height);
  });

  ipcMain.on('show-notification', (_event, title, description) => {
    showNotification(title, description || undefined);
  });

  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow.webContents.reloadIgnoringCache();
  });

  mainWindow.webContents.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // open url in a browser and prevent default
    import('electron').then((mod) => mod.shell.openExternal(url));
    return { action: 'deny' };
  });

  mainWindow.on('close', function (event) {
    event.preventDefault();
    mainWindow.hide();
  });

  const storeInitialValues = {
    version: app.getVersion(),
    environmentName: process.env.IS_STAGING ? 'staging' : '',
  };

  await setupStoreIpc(ipcMain, mainWindow, storeInitialValues);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
};

async function launchDaemon() {
  // Free up backend port if already occupied
  try {
    await fetch(`http://localhost:${appConfig.ports.prod.operate}/api`);
    logger.electron('Killing backend server!');
    let endpoint = fs
      .readFileSync(`${paths.dotOperateDirectory}/operate.kill`)
      .toString()
      .trim();

    await fetch(`http://localhost:${appConfig.ports.prod.operate}/${endpoint}`);
  } catch (err) {
    logger.electron('Backend not running!');
  }

  const check = new Promise(function (resolve) {
    operateDaemon = spawn(
      path.join(
        process.resourcesPath,
        binaryPaths[platform][process.arch.toString()],
      ),
      [
        'daemon',
        `--port=${appConfig.ports.prod.operate}`,
        `--home=${paths.dotOperateDirectory}`,
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
      logger.cli(data.toString().trim());
      if (data.toString().includes('Uvicorn running on')) {
        resolve({ running: true, error: null });
      }
      if (
        data.toString().includes('error while attempting to bind on address')
      ) {
        resolve({ running: false, error: 'Port already in use' });
      }
    });
    operateDaemon.stdout.on('data', (data) => {
      logger.cli(data.toString().trim());
    });
  });

  return await check;
}

async function launchDaemonDev() {
  const check = new Promise(function (resolve) {
    operateDaemon = spawn('poetry', [
      'run',
      'operate',
      'daemon',
      `--port=${appConfig.ports.dev.operate}`,
      '--home=.operate',
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
  logger.next('Launching Next App');
  const nextApp = next({
    dev: false,
    dir: path.join(import.meta.dirname),
    isNodeDebugging: true,
    port: appConfig.ports.prod.next,
    env: {
      // ...process.env,
      FORK_URL: process.env.FORK_URL,
      DEV_RPC: process.env.DEV_RPC,
      NEXT_PUBLIC_BACKEND_PORT:
        process.env.NODE_ENV === 'production'
          ? appConfig.ports.prod.operate
          : appConfig.ports.dev.operate,
    },
  });

  logger.next('Preparing Next App');
  await nextApp.prepare();

  logger.next('Creating Next App Server');
  const server = http.createServer((req, res) => {
    nextApp.getRequestHandler()(req, res);
  });

  logger.next(`Listening to Next App Server on port ${appConfig.ports.prod.next}`);
  server.listen(appConfig.ports.prod.next, (out)=>{
    logger.next(out);
  });
  }

async function launchNextAppDev() {
  await new Promise(function (resolve) {
    process.env.NEXT_PUBLIC_BACKEND_PORT = appConfig.ports.dev.operate; // must set next env var to connect to backend
    nextAppProcess = spawn(
      'yarn',
      ['dev:frontend', '--port', appConfig.ports.dev.next],
      {
        env: {
          ...process.env,
          NEXT_PUBLIC_BACKEND_PORT: appConfig.ports.dev.operate,
        },
      },
    );
    nextAppProcessPid = nextAppProcess.pid;
    nextAppProcess.stdout.on('data', (data) => {
      logger.next(data.toString().trim());
      if (data.toString().includes('Ready in', 'ms')) {
        resolve();
      }
    });
  });
}

// Fires after splash screen is loaded
ipcMain.on('check', async function (event) {
  // Setup
  try {
    event.sender.send('response', 'Checking installation');

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
      await launchDaemon().catch((e) =>
        logger.electron('Failed to launch daemon', e),
      );

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
    createMainWindow().then(() => {
      splashWindow.destroy();
    });
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
app.on('ready', async () => {
  logger.electron('App ready');
  createTray();
  if (isMac) {
    app.dock?.setIcon(
      path.join(import.meta.dirname, 'assets/icons/splash-robot-head-dock.png'),
    );
  }
  createSplashWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', beforeQuit);

// UPDATER EVENTS
macUpdater.once('update-downloaded', () => {
  mainWindow.webContents.send('update-downloaded');
});

macUpdater.on('download-progress', (progress) => {
  mainWindow.webContents.send('download-progress', progress);
});

ipcMain.once('start-download', async () => {
  logger.electron('Downloading update...');
  await macUpdater.downloadUpdate();
});

ipcMain.once('install-update', async () => {
  logger.electron('Quitting and installing...');
  macUpdater.quitAndInstall();
});

ipcMain.handleOnce('check-for-updates', async () => {
  logger.electron('Checking for updates...');
  const updateCheckResult = await macUpdater
    .checkForUpdates()
    .then((res) => {
      logger.electron('Update check result:', res);
      return res;
    })
    .catch((e) => {
      logger.electron('Update check error:', e);
      return { error: e };
    });
  return updateCheckResult.updateInfo;
});

// PROCESS SPECIFIC EVENTS (HANDLES NON-GRACEFUL TERMINATION)
process.on('uncaughtException', (error) => {
  logger.electron('Uncaught Exception:', error);
  // Clean up your child processes here
  beforeQuit().then(() => {
    process.exit(1); // Exit with a failure code
  });
});

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    logger.electron(`Received ${signal}. Cleaning up...`);
    beforeQuit().then(() => {
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

  if (!fs.existsSync(destPath)) fs.mkdirSync(destPath);

  fs.writeFileSync(sanitizedLogsFilePath, sanitizedData);

  return sanitizedLogsFilePath;
}

// EXPORT LOGS
ipcMain.handle('save-logs', async (_, data) => {
  sanitizeLogs({
    name: 'cli.log',
    filePath: paths.cliLogFile,
  });

  sanitizeLogs({
    name: 'next.log',
    filePath: paths.nextLogFile,
  });

  sanitizeLogs({
    name: 'electron.log',
    filePath: paths.electronLogFile,
  });

  // OS info
  const osInfo = `
    OS Type: ${os.type()}
    OS Platform: ${os.platform()}
    OS Arch: ${os.arch()}
    OS Release: ${os.release()}
    Total Memory: ${os.totalmem()}
    Free Memory: ${os.freemem()}
  `;
  const osInfoFilePath = path.join(paths.osPearlTempDir, 'os_info.txt');
  fs.writeFileSync(osInfoFilePath, osInfo);

  // Persistent store
  if (data.store)
    sanitizeLogs({
      name: 'store.txt',
      data: JSON.stringify(data.store, null, 2),
    });

  // Other debug data: balances, addresses, etc.
  if (data.debugData)
    sanitizeLogs({
      name: 'debug_data.txt',
      data: JSON.stringify(data.debugData, null, 2),
    });

  // Agent logs
  try {
    fs.readdirSync(paths.servicesDir).map((serviceDirName) => {
      const servicePath = path.join(paths.servicesDir, serviceDirName);
      if (!fs.existsSync(servicePath)) return;
      if (!fs.statSync(servicePath).isDirectory()) return;

      const agentLogFilePath = path.join(
        servicePath,
        'deployment',
        'agent',
        'log.txt',
      );
      if (!fs.existsSync(agentLogFilePath)) return;

      return sanitizeLogs({
        name: `${serviceDirName}_agent.log`,
        filePath: agentLogFilePath,
      });
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
      `pearl_logs_${new Date(Date.now()).toISOString()}-${app.getVersion()}.zip`,
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
  fs.existsSync(paths.osPearlTempDir) &&
    fs.rmSync(paths.osPearlTempDir, {
      recursive: true,
      force: true,
    });

  return result;
});
