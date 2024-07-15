import os from 'os';
import path from 'path';

import { isProd } from './env.js';

// Paths
const dotOperateDirectory = isProd
  ? path.join(os.homedir(), '.operate')
  : path.join(process.cwd(), '../.operate');

console.log('dotOperateDirectory', dotOperateDirectory);

export const paths = {
  dotOperateDirectory,
  servicesDir: path.join(dotOperateDirectory, 'services'),
  venvDir: path.join(dotOperateDirectory, 'venv'),
  tempDir: path.join(dotOperateDirectory, 'temp'),
  versionFile: path.join(dotOperateDirectory, 'version.txt'),
  cliLogFile: path.join(dotOperateDirectory, 'cli.log'),
  electronLogFile: path.join(dotOperateDirectory, 'electron.log'),
  nextLogFile: path.join(dotOperateDirectory, 'next.log'),
  osPearlTempDir: path.join(os.tmpdir(), 'pearl'),
};
