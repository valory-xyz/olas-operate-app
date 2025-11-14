// Installation helpers.
const fs = require('fs');
const process = require('process');
const { spawnSync } = require('child_process');
const { logger } = require('./logger');
const { paths } = require('./constants');

const path = require('path');
const { app } = require('electron');

// load env vars
require('dotenv').config({
  path: app.isPackaged
    ? path.join(process.resourcesPath, '.env')
    : path.resolve(process.cwd(), '../.env'),
});

const Env = {
  ...process.env,
  PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin`,
  HOMEBREW_NO_AUTO_UPDATE: '1',
  PYTHONUTF8: '1',
  PYTHONIOENCODING: 'utf-8',
};

function getBinPath(command) {
  return spawnSync('/usr/bin/which', [command], { env: Env })
    .stdout?.toString()
    .trim();
}

function isTendermintInstalledUnix() {
  return Boolean(getBinPath('tendermint'));
}

function isTendermintInstalledWindows() {
  return true;
}

function createDirectory(path) {
  if (fs.existsSync(path)) {
    return;
  }
  return new Promise((resolve, _reject) => {
    fs.mkdir(path, { recursive: true }, (error) => {
      resolve(!error);
    });
  });
}

/*******************************/
// NOTE: "Installing" is string matched in loading.html to detect installation
/*******************************/

async function setupDarwin(ipcChannel) {
  logger.electron('Creating required directories');
  await createDirectory(`${paths.dotOperateDirectory}`);
  await createDirectory(`${paths.tempDir}`);

  logger.electron('Checking tendermint installation');
  if (!isTendermintInstalledUnix()) {
    ipcChannel.send('response', 'Installing Pearl Daemon');
  }
}

// TODO: Add Tendermint installation
async function setupUbuntu(ipcChannel) {
  logger.electron('Creating required directories');
  await createDirectory(`${paths.dotOperateDirectory}`);
  await createDirectory(`${paths.tempDir}`);

  logger.electron('Checking tendermint installation');
  if (!isTendermintInstalledUnix()) {
    ipcChannel.send('response', 'Installing Pearl Daemon');
  }
}

async function setupWindows(ipcChannel) {
  logger.electron('Creating required directories');
  await createDirectory(`${paths.dotOperateDirectory}`);
  await createDirectory(`${paths.tempDir}`);

  logger.electron(
    'Checking tendermint installation: ' + isTendermintInstalledWindows(),
  );
  if (!isTendermintInstalledWindows()) {
    ipcChannel.send('response', 'Installing tendermint');
  }
}

module.exports = {
  setupDarwin,
  setupUbuntu,
  setupWindows,
  Env,
};
