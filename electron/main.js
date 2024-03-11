require('dotenv').config();

const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  shell,
  Notification,
  ipcMain,
} = require('electron');
const { spawn, exec } = require('child_process');
const path = require('path');
const url = require('url');
const os = require('os');
const next = require('next');
const http = require('http');

const { isDockerRunning } = require('./docker');
const {
  isInstalled,
  setupDarwin,
  setupUbuntu,
  OperateCmd,
  OperateDirectory,
} = require('./install');
const { killProcesses } = require('./processes');
const { isPortAvailable, findAvailablePort } = require('./ports');
const { PORT_RANGE } = require('./constants');

// Attempt to acquire the single instance lock
const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) app.quit();

const platform = os.platform();
const isDev = process.env.NODE_ENV === 'development';
let appConfig = {
  width: 600,
  height: 800,
  ports: {
    dev: {
      operate: 8000,
      next: 3000,
    },
    prod: {
      operate: 8000,
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

async function beforeQuit() {
  if (operateDaemonPid) {
    try {
      await killProcesses(operateDaemonPid);
    } catch (e) {
      console.error(e);
    }
  }

  if (nextAppProcessPid) {
    try {
      await killProcesses(nextAppProcessPid);
    } catch (e) {
      console.error(e);
    }
  }

  tray && tray.destroy();
  mainWindow && mainWindow.destroy();
}

/**
 * Creates the tray
 */
const createTray = () => {
  tray = new Tray(path.join(__dirname, 'assets/icons/robot-head-tray.png'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: function () {
        mainWindow.show();
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
  tray.setToolTip('Olas Operate');
  tray.setContextMenu(contextMenu);
};

/**
 * Creates the splash window
 */
const createSplashWindow = () => {
  splashWindow = new BrowserWindow({
    width: appConfig.width,
    height: appConfig.height,
    resizable: false,
    show: true,
    title: 'Olas Operate',
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  splashWindow.loadURL('file://' + __dirname + '/loading/index.html');
  if (isDev) {
    splashWindow.webContents.openDevTools();
  }
};

/**
 * Creates the main window
 */
const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: appConfig.width,
    height: appConfig.height,
    resizable: false,
    title: 'Olas Operate',
  });

  // Ensure that external links are opened in native browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  mainWindow.setMenuBarVisibility(false);
  if (isDev) {
    mainWindow.loadURL(`http://localhost:${appConfig.ports.dev.next}`);
  } else {
    mainWindow.loadURL(`http://localhost:${appConfig.ports.prod.next}`);
  }
  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow.webContents.reloadIgnoringCache();
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', function (event) {
    event.preventDefault();
    mainWindow.hide();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
};

async function launchDaemon() {
  const check = new Promise(function (resolve, reject) {
    operateDaemon = spawn(OperateCmd, [
      'daemon',
      `--port=${appConfig.ports.prod.operate}`,
      `--home=${OperateDirectory}`,
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
    });
  });
  return await check;
}

async function launchDaemonDev() {
  const check = new Promise(function (resolve, reject) {
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
      console.log(data.toString().trim());
    });
    operateDaemon.stdout.on('data', (data) => {
      console.log(data.toString().trim());
    });
  });
  return await check;
}

async function launchNextApp() {
  const nextApp = next({
    dev: false,
    dir: path.join(__dirname),
    port: appConfig.ports.prod.next,
  });
  await nextApp.prepare();

  const handle = nextApp.getRequestHandler();
  const server = http.createServer((req, res) => {
    handle(req, res); // Handle requests using the Next.js request handler
  });
  server.listen(appConfig.ports.prod.next, (err) => {
    if (err) throw err;
    console.log(
      `> Next server runinng on http://localhost:${appConfig.ports.prod.next}`,
    );
  });
}

async function launchNextAppDev() {
  await new Promise(function (resolve, reject) {
    process.env.NEXT_PUBLIC_BACKEND_PORT = appConfig.ports.dev.operate; // must set next env var to connect to backend
    nextAppProcess = spawn('yarn', [
      'dev:frontend',
      '--port',
      appConfig.ports.dev.next,
    ]);
    nextAppProcessPid = nextAppProcess.pid;
    nextAppProcess.stdout.on('data', (data) => {
      console.log(data.toString().trim());
      setTimeout(function () {
        resolve(true);
      }, 1000);
    });
  });
}

ipcMain.on('check', async function (event, argument) {
  try {
    event.sender.send('response', 'Checking installation');
    if (!isDev && !isInstalled()) {
      event.sender.send('response', 'Installing Operate Daemon');
      if (platform === 'darwin') {
        await setupDarwin();
      } else if (platform === 'win32') {
        // TODO
      } else {
        await setupUbuntu();
      }
    }

    if (isDev) {
      event.sender.send(
        'response',
        'Starting Operate Daemon In Development Mode',
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
      event.sender.send('response', 'Starting Operate Daemon');
      const daemonPortAvailable = await isPortAvailable(
        appConfig.ports.prod.operate,
      );
      if (!daemonPortAvailable) {
        appConfig.ports.prod.operate = await findAvailablePort({
          ...PORT_RANGE,
        });
      }
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
    createTray();
    splashWindow.destroy();
  } catch (e) {
    console.log(e);
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
  if (platform === 'darwin') {
    app.dock?.setIcon(path.join(__dirname, 'assets/icons/robot-head.png'));
  }
  createSplashWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  beforeQuit();
});

// PROCESS SPECIFIC EVENTS (HANDLES NON-GRACEFUL TERMINATION)

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Clean up your child processes here
  beforeQuit().then(() => {
    process.exit(1); // Exit with a failure code
  });
});

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    console.log(`Received ${signal}. Cleaning up...`);
    beforeQuit().then(() => {
      process.exit(0);
    });
  });
});
