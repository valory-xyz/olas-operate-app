// Installation helpers.

const fs = require('fs');
const os = require('os');
const sudo = require('sudo-prompt');
const process = require('process');
const { spawnSync } = require('child_process');
const Docker = require('dockerode');

const Version = '0.1.0rc26';
const OperateDirectory = `${os.homedir()}/.operate`;
const VenvDir = `${OperateDirectory}/venv`;
const VersionFile = `${OperateDirectory}/version.txt`;
const LogFile = `${OperateDirectory}/logs.txt`;
const OperateInstallationLog = `${os.homedir()}/operate.log`;
const OperateCmd = `${os.homedir()}/.operate/venv/bin/operate`;
const Env = {
  ...process.env,
  PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin`,
};
const SudoOptions = {
  name: 'Pearl',
  env: Env,
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
  fs.appendFileSync(
    OperateInstallationLog,
    `Runninng ${command} with options ${JSON.stringify(options)}`,
    { encoding: 'utf-8' },
  );
  let bin = getBinPath(command);
  if (!bin) {
    throw new Error(`Command ${command} not found; Path : ${Env.PATH}`);
  }
  let output = spawnSync(bin, options);
  if (output.stdout) {
    appendLog(output.stdout.toString());
  }
  if (output.stderr) {
    appendLog(output.stdout.toString());
  }
  if (output.error) {
    throw new Error(
      `Error running ${command} with options ${options};
            Error: ${output.error}; Stdout: ${output.stdout}; Stderr: ${output.stderr}`,
    );
  }
  return {
    error: output.error,
    stdout: output.stdout?.toString(),
    stderr: output.stderr?.toString(),
  };
}

function runSudoUnix(command, options) {
  let bin = getBinPath(command);
  if (!bin) {
    throw new Error(`Command ${command} not found`);
  }
  return new Promise(function (resolve, reject) {
    sudo.exec(
      `${bin} ${options}`,
      SudoOptions,
      function (error, stdout, stderr) {
        resolve({
          error: error,
          stdout: stdout,
          stderr: stderr,
        });
      },
    );
  });
}

function isBrewInstalled() {
  return Boolean(getBinPath(getBinPath('brew')));
}

function installBrew() {
  return runCmdUnix('bash', [
    '-c',
    '$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)',
  ]);
}

function isDockerInstalledDarwin() {
  return Boolean(getBinPath('docker'));
}

function installDockerDarwin() {
  return runCmdUnix('brew', ['install', 'docker']);
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
  return runCmdUnix('brew', ['install', 'python@3.10']);
}

function createVirtualEnvUnix(path) {
  return runCmdUnix('python3.10', ['-m', 'venv', path]);
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
  return runCmdUnix('python3.10', ['-m', 'venv', path]);
}

function installOperatePackageUnix(path) {
  return runCmdUnix(`${path}/venv/bin/python3.10`, [
    '-m',
    'pip',
    'install',
    `olas-operate-middleware==${Version}`,
  ]);
}

function reInstallOperatePackageUnix(path) {
  console.log(appendLog('Reinstalling pearl CLI'));
  return runCmdUnix(`${path}/venv/bin/python3.10`, [
    '-m',
    'pip',
    'install',
    `olas-operate-middleware==${Version}`,
    '--force-reinstall',
  ]);
}

function installOperateCli(path) {
  let installPath = `${path}/operate`;
  if (fs.existsSync(installPath)) {
    fs.rmSync(installPath);
  }
  return new Promise((resolve, reject) => {
    fs.copyFile(
      `${OperateDirectory}/venv/bin/operate`,
      installPath,
      function (error, stdout, stderr) {
        resolve(!error);
      },
    );
  });
}

function createDirectory(path) {
  if (fs.existsSync(path)) {
    return;
  }
  return new Promise((resolve, reject) => {
    fs.mkdir(path, { recursive: true }, (error) => {
      resolve(!error);
    });
  });
}

function writeVersion() {
  fs.writeFileSync(VersionFile, Version);
}

function versionBumpRequired() {
  if (!fs.existsSync(VersionFile)) {
    return true;
  }
  const version = fs.readFileSync(VersionFile).toString();
  return version != Version;
}

function removeLogFile() {
  if (fs.existsSync()) {
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
    installBrew();
  }

  console.log(appendLog('Checking docker installation'));
  if (!isDockerInstalledDarwin()) {
    ipcChannel.send('response', 'Installing Pearl Daemon');
    console.log(appendLog('Installing docker'));
    installDockerDarwin();
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

  if (!fs.existsSync(VenvDir)) {
    ipcChannel.send('response', 'Installing Pearl Daemon');
    console.log(appendLog('Creating virtual environment'));
    createVirtualEnvUnix(VenvDir);

    console.log(appendLog('Installing pearl backend'));
    installOperatePackageUnix(OperateDirectory);
  }

  console.log(appendLog('Checking if upgrade is required'));
  if (versionBumpRequired()) {
    console.log(appendLog(`Upgrading pearl daemon to ${Version}`));
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

async function setupUbuntu(ipcChannel) {
  removeInstallationLogFile();
  console.log(appendLog('Checking docker installation'));
  if (!isDockerInstalledUbuntu()) {
    ipcChannel.send('response', 'Installing Pearl Daemon');
    console.log(appendLog('Installing docker'));
    await installDockerUbuntu();
  }

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

  if (versionBumpRequired()) {
    // removePreviousInstallation();
    writeVersion();
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
    console.log(appendLog(`Upgrading pearl daemon to ${Version}`));
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
