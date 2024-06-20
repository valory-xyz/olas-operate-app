// Installation helpers.

const nfs = require('node:fs');
const fs = require('fs');
const os = require('os');
const sudo = require('sudo-prompt');
const process = require('process');
const axios = require('axios');

const Docker = require('dockerode');
const { spawnSync } = require('child_process');
const { BrewScript } = require('./scripts');

/**
 * current version of the pearl release
 * - use "" (nothing as a suffix) for latest release candidate, for example "0.1.0rc26"
 * - use "alpha" for alpha release, for example "0.1.0rc26-alpha"
 */
const OlasMiddlewareVersion = '0.1.0rc54';
const OperateDirectory = `${os.homedir()}/.operate`;
const VenvDir = `${OperateDirectory}/venv`;
const TempDir = `${OperateDirectory}/temp`;
const VersionFile = `${OperateDirectory}/version.txt`;
const LogFile = `${OperateDirectory}/logs.txt`;
const OperateInstallationLog = `${os.homedir()}/operate.log`;
const OperateCmd = `${os.homedir()}/.operate/venv/bin/operate`;
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

function isPackageInstalledUbuntu(package) {
  const result = spawnSync(
    '/usr/bin/bash',
    ['-c', `/usr/bin/apt list --installed | grep -q "^${package}/"`],
    { env: Env },
  );
  return result.status === 0;
}

function appendLog(log) {
  fs.appendFileSync(OperateInstallationLog, `${log}\n`, { encoding: 'utf-8' });
  return log;
}

function runCmdUnix(command, options) {
  console.log(
    appendLog(`Running ${command} with options ${JSON.stringify(options)}`),
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
  console.log(appendLog(`Executed ${command} ${options} with`));
  console.log(appendLog(`===== stdout =====  \n${output.stdout}`));
  console.log(appendLog(`===== stderr =====  \n${output.stderr}`));
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
        console.log(appendLog(`Executed ${command} ${options} with`));
        console.log(appendLog(`===== stdout =====  \n${output.stdout}`));
        console.log(appendLog(`===== stderr =====  \n${output.stderr}`));
        resolve();
      },
    );
  });
}

function isBrewInstalled() {
  return Boolean(getBinPath(getBinPath('brew')));
}

async function installBrew() {
  console.log(appendLog('Fetching homebrew source'));
  let outdir = `${os.homedir()}/homebrew`;
  let outfile = `${os.homedir()}/homebrew.tar`;

  // Make temporary source dir
  fs.mkdirSync(outdir);

  // Fetch brew source
  runCmdUnix('curl', [
    '-L',
    'https://github.com/Homebrew/brew/tarball/master',
    '--output',
    outfile,
  ]);
  runCmdUnix('tar', ['-xvf', outfile, '--strip-components', '1', '-C', outdir]);

  // Check for cache and uninstall leftovers
  if (fs.existsSync('/opt/homebrew')) {
    console.log(appendLog('Removing homebrew leftovers'));
    if (!Env.CI) {
      await runSudoUnix('rm', `-rf /opt/homebrew`);
    } else {
      fs.rmdirSync('/opt/homebrew');
    }
  }

  console.log(appendLog('Installing homebrew'));
  if (!Env.CI) {
    await runSudoUnix('mv', `${outdir} /opt/homebrew`);
    await runSudoUnix('chown', `-R ${os.userInfo().username} /opt/homebrew`);
  } else {
    runCmdUnix('mv', [outdir, '/opt/homebrew']);
    runCmdUnix('chown', ['-R', os.userInfo().username, '/opt/homebrew']);
  }
  runCmdUnix('brew', ['doctor']);
  fs.rmSync(outfile);
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
  process.chdir(TempDir);

  console.log(
    appendLog(`Installing tendermint for ${os.platform()}-${process.arch}`),
  );
  const url = TendermintUrls[os.platform()][process.arch];

  console.log(appendLog(`Downloading ${url}, might take a while...`));
  await downloadFile(url, `${TempDir}/tendermint.tar.gz`);

  console.log(appendLog(`Installing tendermint binary`));
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

function isDockerInstalledDarwin() {
  return Boolean(getBinPath('docker'));
}

function installDockerDarwin() {
  runCmdUnix('brew', ['install', 'docker']);
}

function isDockerInstalledUbuntu() {
  return Boolean(getBinPath('docker'));
}

function installDockerUbuntu() {
  return runSudoUnix('bash', `${__dirname}/scripts/install_docker_ubuntu.sh`);
}

function isPythonInstalledDarwin() {
  return Boolean(getBinPath('python3.10'));
}

function installPythonDarwin() {
  runCmdUnix('brew', ['install', 'python@3.10']);
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

function createVirtualEnvUbuntu(path) {
  runCmdUnix('python3.10', ['-m', 'venv', path]);
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
  console.log(appendLog('Reinstalling pearl CLI'));
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
  fs.writeFileSync(VersionFile, OlasMiddlewareVersion);
}

function versionBumpRequired() {
  if (!fs.existsSync(VersionFile)) {
    return true;
  }
  const olasMiddlewareVersionInFile = fs.readFileSync(VersionFile).toString();
  return olasMiddlewareVersionInFile != OlasMiddlewareVersion;
}

function removeLogFile() {
  if (fs.existsSync(LogFile)) {
    fs.rmSync(LogFile);
  }
}

function removeInstallationLogFile() {
  if (fs.existsSync(OperateInstallationLog)) {
    fs.rmSync(OperateInstallationLog);
  }
}

/*******************************/
// NOTE: "Installing" is string matched in loading.html to detect installation
/*******************************/

async function setupDarwin(ipcChannel) {
  removeInstallationLogFile();
  console.log(appendLog('Checking brew installation'));
  if (!isBrewInstalled()) {
    ipcChannel.send('response', 'Installing Pearl Daemon');
    console.log(appendLog('Installing brew'));
    await installBrew();
  }

  console.log(appendLog('Checking python installation'));
  if (!isPythonInstalledDarwin()) {
    ipcChannel.send('response', 'Installing Pearl Daemon');
    console.log(appendLog('Installing python'));
    installPythonDarwin();
  }

  console.log(appendLog('Creating required directories'));
  await createDirectory(`${OperateDirectory}`);
  await createDirectory(`${OperateDirectory}/temp`);

  console.log(appendLog('Checking tendermint installation'));
  if (!isTendermintInstalledUnix()) {
    ipcChannel.send('response', 'Installing Pearl Daemon');
    console.log(appendLog('Installing tendermint'));
    await installTendermintUnix();
  }

  if (!fs.existsSync(VenvDir)) {
    ipcChannel.send('response', 'Installing Pearl Daemon');
    console.log(appendLog('Creating virtual environment'));
    createVirtualEnvUnix(VenvDir);

    console.log(appendLog('Installing pearl backend'));
    installOperatePackageUnix(OperateDirectory);
  }

  console.log(appendLog('Checking if upgrade is required'));
  if (versionBumpRequired()) {
    console.log(
      appendLog(`Upgrading pearl daemon to ${OlasMiddlewareVersion}`),
    );
    reInstallOperatePackageUnix(OperateDirectory);
    writeVersion();
    removeLogFile();
  }

  if (!fs.existsSync(`${OperateDirectory}/venv/bin/operate`)) {
    reInstallOperatePackageUnix(OperateDirectory);
  }

  console.log(appendLog('Installing pearl CLI'));
  await installOperateCli('/opt/homebrew/bin/operate');
}

// TODO: Add Tendermint installation
async function setupUbuntu(ipcChannel) {
  removeInstallationLogFile();

  console.log(appendLog('Checking python installation'));
  if (!isPythonInstalledUbuntu()) {
    ipcChannel.send('response', 'Installing Pearl Daemon');
    console.log(appendLog('Installing Python'));
    await installPythonUbuntu(OperateDirectory);
  }

  console.log(appendLog('Checking git installation'));
  if (!isGitInstalledUbuntu()) {
    ipcChannel.send('response', 'Installing Pearl Daemon');
    console.log(appendLog('Installing git'));
    await installGitUbuntu(OperateDirectory);
  }

  console.log(appendLog('Creating required directories'));
  await createDirectory(`${OperateDirectory}`);
  await createDirectory(`${OperateDirectory}/temp`);

  console.log(appendLog('Checking tendermint installation'));
  if (!isTendermintInstalledUnix()) {
    ipcChannel.send('response', 'Installing Pearl Daemon');
    console.log(appendLog('Installing tendermint'));
    await installTendermintUnix();
  }

  if (!fs.existsSync(VenvDir)) {
    ipcChannel.send('response', 'Installing Pearl Daemon');
    console.log(appendLog('Creating virtual environment'));
    createVirtualEnvUnix(VenvDir);

    console.log(appendLog('Installing pearl backend'));
    installOperatePackageUnix(OperateDirectory);
  }

  console.log(appendLog('Checking if upgrade is required'));
  if (versionBumpRequired()) {
    console.log(
      appendLog(`Upgrading pearl daemon to ${OlasMiddlewareVersion}`),
    );
    reInstallOperatePackageUnix(OperateDirectory);
    writeVersion();
    removeLogFile();
  }

  if (!fs.existsSync(`${OperateDirectory}/venv/bin/operate`)) {
    reInstallOperatePackageUnix(OperateDirectory);
  }

  console.log(appendLog('Installing pearl CLI'));
  await installOperateCli('/usr/local/bin');
}

async function startDocker(ipcChannel) {
  const docker = new Docker();
  let running = await new Promise((resolve, reject) => {
    docker.ping((err) => {
      resolve(!err);
    });
  });
  if (!running) {
    console.log(appendLog('Starting docker'));
    ipcChannel.send('response', 'Starting docker');
    if (process.platform == 'darwin') {
      runCmdUnix('open', ['-a', 'Docker']);
    } else if (process.platform == 'win32') {
      // TODO
    } else {
      runSudoUnix('sudo', ['service', 'docker', 'restart']);
    }
  }
  while (!running) {
    running = await new Promise((resolve, reject) => {
      docker.ping((err) => {
        resolve(!err);
      });
    });
  }
}

module.exports = {
  setupDarwin,
  startDocker,
  setupUbuntu,
  OperateDirectory,
  OperateCmd,
  Env,
  dirs: {
    VersionFile,
    LogFile,
    OperateInstallationLog,
  },
};
