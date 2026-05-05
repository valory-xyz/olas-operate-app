const psTree = require('ps-tree');
const { exec } = require('child_process');

const unixKillCommand = 'kill -9';
const windowsKillCommand = 'taskkill /F /PID';
const { logger } = require('./logger');
const isWindows = process.platform === 'win32';

function killProcesses(pid) {
  return new Promise((resolve, reject) => {
    psTree(pid, (err, children) => {
      if (err) {
        reject(err);
        return;
      }

      // Array of PIDs to kill, starting with the children
      const pidsToKill = children.map((p) => p.PID);
      logger.electron('Pids to kill ' + JSON.stringify(pidsToKill));

      if (pidsToKill.length === 0) {
        resolve();
        return;
      }

      const killCommand = isWindows ? windowsKillCommand : unixKillCommand;

      const errors = [];
      let pending = pidsToKill.length;

      for (const pid of pidsToKill) {
        logger.electron('killing: ' + pid);
        exec(`${killCommand} ${pid}`, (err) => {
          if (err) {
            logger.electron(`error killing pid ${pid}`);
            logger.electron(JSON.stringify(err, null, 2));
            if (
              !err.message?.includes(isWindows ? 'not found' : 'No such process')
            ) {
              errors.push(err);
            }
          }
          pending--;
          if (pending === 0) {
            if (errors.length > 0) {
              reject(errors);
            } else {
              resolve();
            }
          }
        });
      }
    });
  });
}

module.exports = { killProcesses };
