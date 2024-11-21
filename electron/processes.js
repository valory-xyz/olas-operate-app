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

      const killCommand = isWindows ? windowsKillCommand : unixKillCommand;

      let errors = [];
      for (const pid of pidsToKill) {
        logger.electron('killing: ' + pid);
        exec(`${killCommand} ${pid}`, (err) => {
          err && logger.electron(`error killing pid ${pid}`);
          err && logger.electron(JSON.stringify(err, null, 2));
          if (
            err?.message?.includes(isWindows ? 'not found' : 'No such process')
          ) {
            return; // Ignore errors for processes that are already dead
          }
          errors.push(err);
        });
      }

      if (errors.length === 0) {
        reject(errors);
      } else resolve();
    });
  });
}

module.exports = { killProcesses };
