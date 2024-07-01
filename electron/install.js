// Installation helpers.
const fs = require('fs');
const os = require('os');
const path = require('path');
const sudo = require('sudo-prompt');
const process = require('process');
const axios = require('axios');
const { spawnSync } = require('child_process');

/**
 * current version of the pearl release
 * - use "" (nothing as a suffix) for latest release candidate, for example "0.1.0rc26"
 * - use "alpha" for alpha release, for example "0.1.0rc26-alpha"
 */
const OlasMiddlewareVersion = '0.1.0rc61';
const OperateDirectory = path.join(os.homedir(), '.operate');

// Create operate directory if it doesn't exist
if (!fs.existsSync(OperateDirectory)) {
  fs.mkdirSync(OperateDirectory);
}

const paths = {
  OperateDirectory,
  VenvDir: path.join(OperateDirectory, '.operate', 'venv'),
  TempDir: path.join(OperateDirectory, '.operate', 'temp'),
  VersionFile: path.join(OperateDirectory, '.operate', 'version.txt'),
  LogFile: path.join(OperateDirectory, '.operate', 'logs.txt'),
  OperateInstallationLog: path.join(os.homedir(), 'operate.log'),
};

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

function appendInstallationLog(log) {
  fs.appendFileSync(paths.OperateInstallationLog, `${log}\n`, {
    encoding: 'utf-8',
  });
  return log;
}

function runCmdUnix(command, options) {
  console.log(
    appendInstallationLog(
      `Running ${command} with options ${JSON.stringify(options)}`,
    ),
  );
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
  console.log(appendInstallationLog(`Executed ${command} ${options} with`));
  console.log(appendInstallationLog(`===== stdout =====  \n${output.stdout}`));
  console.log(appendInstallationLog(`===== stderr =====  \n${output.stderr}`));
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
        console.log(
          appendInstallationLog(`Executed ${command} ${options} with`),
        );
        console.log(
          appendInstallationLog(`===== stdout =====  \n${output.stdout}`),
        );
        console.log(
          appendInstallationLog(`===== stderr =====  \n${output.stderr}`),
        );
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
  const cwd = process.cwd();
  process.chdir(paths.TempDir);

  console.log(
    appendInstallationLog(
      `Installing tendermint for ${os.platform()}-${process.arch}`,
    ),
  );
  const url = TendermintUrls[os.platform()][process.arch];

  console.log(
    appendInstallationLog(`Downloading ${url}, might take a while...`),
  );
  await downloadFile(url, `${paths.TempDir}/tendermint.tar.gz`);

  console.log(appendInstallationLog(`Installing tendermint binary`));
  runCmdUnix('tar', ['-xvf', 'tendermint.tar.gz']);

  // TOFIX: Install tendermint in .operate instead of globally
  if (!Env.CI) {
    if (!fs.existsSync('/usr/local/bin')) {
      await runSudoUnix('mkdir', '/usr/local/bin');
    }
    await runSudoUnix('install', 'tendermint /usr/local/bin/tendermint');
  }
  process.chdir(cwd);
}

function createVirtualEnvUnix(path) {
  runCmdUnix('python3.10', ['-m', 'venv', path]);
}

function isPythonInstalledUbuntu() {
  return Boolean(getBinPath('python3.10'));
}

function isGitInstalledUbuntu() {
  return Boolean(getBinPath('git'));
}

function installPythonUbuntu() {
  return runSudoUnix('apt', 'install -y python3.10 python3.10-dev python3-pip');
}

function installGitUbuntu() {
  return runSudoUnix('apt', 'install -y git');
}

function installOperatePackageUnix(path) {
  runCmdUnix(`${path}/venv/bin/python3.10`, [
    '-m',
    'pip',
    'install',
    `olas-operate-middleware==${OlasMiddlewareVersion}`,
  ]);
}

function reInstallOperatePackageUnix(path) {
  console.log(appendInstallationLog('Reinstalling pearl CLI'));
  runCmdUnix(`${path}/venv/bin/python3.10`, [
    '-m',
    'pip',
    'install',
    `olas-operate-middleware==${OlasMiddlewareVersion}`,
    '--force-reinstall',
  ]);
}

function installOperateCli(path) {
  let installPath = `${path}/operate`;
  if (fs.existsSync(installPath)) {
    fs.rmSync(installPath);
  }
  return new Promise((resolve, _reject) => {
    fs.copyFile(
      `${OperateDirectory}/venv/bin/operate`,
      installPath,
      function (error, _stdout, _stderr) {
        resolve(!error);
      },
    );
  });
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

function writeVersion() {
  fs.writeFileSync(paths.VersionFile, OlasMiddlewareVersion);
}

function versionBumpRequired() {
  if (!fs.existsSync(paths.VersionFile)) {
    return true;
  }
  const olasMiddlewareVersionInFile = fs
    .readFileSync(paths.VersionFile)
    .toString();
  return olasMiddlewareVersionInFile != OlasMiddlewareVersion;
}

function removeLogFile() {
  if (fs.existsSync(paths.LogFile)) {
    fs.rmSync(paths.LogFile);
  }
}

function removeInstallationLogFile() {
  if (fs.existsSync(paths.OperateInstallationLog)) {
    fs.rmSync(paths.OperateInstallationLog);
  }
}

/*******************************/
// NOTE: "Installing" is string matched in loading.html to detect installation
/*******************************/

async function setupDarwin(ipcChannel) {
  removeInstallationLogFile();
  console.log(appendInstallationLog('Creating required directories'));
  await createDirectory(`${OperateDirectory}`);
  await createDirectory(`${OperateDirectory}/temp`);

  console.log(appendInstallationLog('Checking tendermint installation'));
  if (!isTendermintInstalledUnix()) {
    ipcChannel.send('response', 'Installing Pearl Daemon');
    console.log(appendInstallationLog('Installing tendermint'));
    await installTendermintUnix();
  }

  console.log(appendInstallationLog('Checking if upgrade is required'));
  if (versionBumpRequired()) {
    console.log(
      appendInstallationLog(
        `Upgrading pearl daemon to ${OlasMiddlewareVersion}`,
      ),
    );
    writeVersion();
    removeLogFile();
    // reInstallOperatePackageUnix(OperateDirectory);
  }
}

// TODO: Add Tendermint installation
async function setupUbuntu(ipcChannel) {
  removeInstallationLogFile();

  console.log(appendInstallationLog('Checking python installation'));
  if (!isPythonInstalledUbuntu()) {
    ipcChannel.send('response', 'Installing Pearl Daemon');
    console.log(appendInstallationLog('Installing Python'));
    await installPythonUbuntu(OperateDirectory);
  }

  console.log(appendInstallationLog('Checking git installation'));
  if (!isGitInstalledUbuntu()) {
    ipcChannel.send('response', 'Installing Pearl Daemon');
    console.log(appendInstallationLog('Installing git'));
    await installGitUbuntu(OperateDirectory);
  }

  console.log(appendInstallationLog('Creating required directories'));
  await createDirectory(`${OperateDirectory}`);
  await createDirectory(`${OperateDirectory}/temp`);

  console.log(appendInstallationLog('Checking tendermint installation'));
  if (!isTendermintInstalledUnix()) {
    ipcChannel.send('response', 'Installing Pearl Daemon');
    console.log(appendInstallationLog('Installing tendermint'));
    await installTendermintUnix();
  }

  if (!fs.existsSync(paths.VenvDir)) {
    ipcChannel.send('response', 'Installing Pearl Daemon');
    console.log(appendInstallationLog('Creating virtual environment'));
    createVirtualEnvUnix(paths.VenvDir);

    console.log(appendInstallationLog('Installing pearl backend'));
    installOperatePackageUnix(OperateDirectory);
  }

  console.log(appendInstallationLog('Checking if upgrade is required'));
  if (versionBumpRequired()) {
    console.log(
      appendInstallationLog(
        `Upgrading pearl daemon to ${OlasMiddlewareVersion}`,
      ),
    );
    reInstallOperatePackageUnix(OperateDirectory);
    writeVersion();
    removeLogFile();
  }

  if (!fs.existsSync(`${OperateDirectory}/venv/bin/operate`)) {
    reInstallOperatePackageUnix(OperateDirectory);
  }

  console.log(appendInstallationLog('Installing pearl CLI'));
  await installOperateCli('/usr/local/bin');
}

module.exports = {
  setupDarwin,
  setupUbuntu,
  Env,
  paths,
};
