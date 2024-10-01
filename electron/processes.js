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
      logger.info('Pids to kill ' + JSON.stringify(pidsToKill));

      const killCommand = isWindows ? windowsKillCommand : unixKillCommand;

      let errors = [];
      for (const ppid of pidsToKill) {
        logger.info('kill: ' + ppid);
        exec(`${killCommand} ${ppid}`, (err) => {
          logger.error('Pids to kill error:' + err);
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
