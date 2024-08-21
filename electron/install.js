// Installation helpers.
const fs = require('fs');
const os = require('os');
const sudo = require('sudo-prompt');
const process = require('process');
const axios = require('axios');
const { spawnSync } = require('child_process');
const { logger } = require('./logger');

const { paths } = require('./constants');

/**
 * current version of the pearl release
 * - use "" (nothing as a suffix) for latest release candidate, for example "0.1.0rc26"
 * - use "alpha" for alpha release, for example "0.1.0rc26-alpha"
 */
const OlasMiddlewareVersion = '0.1.0rc115';

const path = require('path');
const { app } = require('electron');

// load env vars
require('dotenv').config({
  path: app.isPackaged
    ? path.join(process.resourcesPath, '.env')
    : path.resolve(process.cwd(), '.env'),
});

const Env = {
  ...process.env,
  PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin`,
  HOMEBREW_NO_AUTO_UPDATE: '1',
};

const SudoOptions = {
  name: 'Pearl',
  env: Env,
};

const TendermintUrls = {
  darwin: {
    x64: 'https://github.com/tendermint/tendermint/releases/download/v0.34.19/tendermint_0.34.19_darwin_amd64.tar.gz',
    arm64:
      'https://github.com/tendermint/tendermint/releases/download/v0.34.19/tendermint_0.34.19_darwin_arm64.tar.gz',
  },
  linux: {
    x64: 'https://github.com/tendermint/tendermint/releases/download/v0.34.19/tendermint_0.34.19_linux_amd64.tar.gz',
    arm64:
      'https://github.com/tendermint/tendermint/releases/download/v0.34.19/tendermint_0.34.19_linux_arm64.tar.gz',
  },
  win32: {
    x64: 'https://github.com/tendermint/tendermint/releases/download/v0.34.19/tendermint_0.34.19_windows_amd64.tar.gz',
    arm64:
      'https://github.com/tendermint/tendermint/releases/download/v0.34.19/tendermint_0.34.19_windows_arm64.tar.gz',
  },
};

function getBinPath(command) {
  return spawnSync('/usr/bin/which', [command], { env: Env })
    .stdout?.toString()
    .trim();
}

function runCmdUnix(command, options) {
  logger.electron(`Running ${command} with options ${JSON.stringify(options)}`);
  let bin = getBinPath(command);
  if (!bin) {
    throw new Error(`Command ${command} not found; Path : ${Env.PATH}`);
  }
  let output = spawnSync(bin, options);
  if (output.error) {
    throw new Error(
      `Error running ${command} with options ${options};
            Error: ${output.error}; Stdout: ${output.stdout}; Stderr: ${output.stderr}`,
    );
  }
  logger.electron(`Executed ${command} ${options} with`);
  logger.electron(`===== stdout =====  \n${output.stdout}`);
  logger.electron(`===== stderr =====  \n${output.stderr}`);
}

function runSudoUnix(command, options) {
  let bin = getBinPath(command);
  if (!bin) {
    throw new Error(`Command ${command} not found`);
  }
  return new Promise(function (resolve, _reject) {
    sudo.exec(
      `${bin} ${options}`,
      SudoOptions,
      function (error, stdout, stderr) {
        let output = {
          error: error,
          stdout: stdout,
          stderr: stderr,
        };
        if (output.error) {
          throw new Error(
            `Error running ${command} with options ${options};
            Error: ${output.error}; Stdout: ${output.stdout}; Stderr: ${output.stderr}`,
          );
        }
        logger.electron(`Executed ${command} ${options} with`);
        logger.electron(`===== stdout =====  \n${output.stdout}`);
        logger.electron(`===== stderr =====  \n${output.stderr}`);
        resolve();
      },
    );
  });
}

function isTendermintInstalledUnix() {
  return Boolean(getBinPath('tendermint'));
}

async function downloadFile(url, dest) {
  const writer = fs.createWriteStream(dest);
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (err) {
    fs.unlink(dest, () => {}); // Delete the file if there is an error
    console.error('Error downloading the file:', err.message);
  }
}

async function installTendermintUnix() {
  logger.electron(`Installing tendermint for ${os.platform()}-${process.arch}`);
  const cwd = process.cwd();
  process.chdir(paths.tempDir);

  const url = TendermintUrls[os.platform()][process.arch];

  logger.electron(
    `Downloading ${url} to ${paths.tempDir}. This might take a while...`,
  );
  await downloadFile(url, `${paths.tempDir}/tendermint.tar.gz`);

  logger.electron(`Installing tendermint binary`);
  runCmdUnix('tar', ['-xvf', 'tendermint.tar.gz']);

  // TOFIX: Install tendermint in .operate instead of globally
  if (!Env.CI) {
    if (!fs.existsSync('/usr/local/bin')) {
      await runSudoUnix('mkdir', '/usr/local/bin');
    }
    await runSudoUnix(
      'install',
      `${paths.tempDir}/tendermint /usr/local/bin/tendermint`,
    );
  }
  process.chdir(cwd);
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
    logger.electron('Installing tendermint');
    await installTendermintUnix();
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
    logger.electron('Installing tendermint');
    await installTendermintUnix();
  }
}

module.exports = {
  setupDarwin,
  setupUbuntu,
  Env,
};
