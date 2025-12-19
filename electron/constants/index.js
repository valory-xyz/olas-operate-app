const os = require('os');
const path = require('path');
require('dotenv').config();

const PORT_RANGE = { startPort: 39152, endPort: 65535 };
const ERROR_ADDRESS_IN_USE = 'EADDRINUSE';

// OS specific constants
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

// Environment specific constants
const isDev = process.env.NODE_ENV === 'development';
const isProd = !isDev;

// Paths
const dotOperateDirectory = isProd
  ? path.join(os.homedir(), '.operate')
  : path.join(process.cwd(), '.operate');

const paths = {
  dotOperateDirectory,
  servicesDir: path.join(dotOperateDirectory, 'services'),
  venvDir: path.join(dotOperateDirectory, 'venv'),
  tempDir: path.join(dotOperateDirectory, 'temp'),
  versionFile: path.join(dotOperateDirectory, 'version.txt'),
  cliLogFile: path.join(dotOperateDirectory, 'cli.log'),
  electronLogFile: path.join(dotOperateDirectory, 'electron.log'),
  nextLogFile: path.join(dotOperateDirectory, 'next.log'),
  osPearlTempDir: path.join(os.tmpdir(), 'pearl'),
  bridgeDirectory: path.join(dotOperateDirectory, 'bridge'),
  agentRunnerLogFile: path.join(dotOperateDirectory, 'agent_runner.log'),
  tmLogFile: path.join(dotOperateDirectory, 'tm.log'),
};

// Publish options
const publishOptions = {
  provider: 'github',
  owner: 'valory-xyz',
  repo: 'olas-operate-app',
  releaseType: 'draft',
  token: process.env.GH_TOKEN,
  private: false,
  publishAutoUpdate: false,
};

// URLs allowed to open as pop-ups from the agent UI
const popupAllowedUrls = [
  'http://127.0.0.1:8716/privy-login',
  'http://localhost:8716/privy-login',
];

module.exports = {
  PORT_RANGE,
  ERROR_ADDRESS_IN_USE,
  isWindows,
  isMac,
  isLinux,
  isProd,
  isDev,
  publishOptions,
  paths,
  popupAllowedUrls,
};
