import { exec } from 'child_process';
import psTree from 'ps-tree';

import { isWindows } from '../constants/os.mjs';

const unixKillCommand = 'kill -9';
const windowsKillCommand = 'taskkill /F /PID';

/**
 * Kills the specified process and its children.
 *
 * @param {number} pid - The process ID to kill.
 * @returns {Promise<void>} A promise that resolves when the process and its children are killed, or rejects with an error.
 */
export function killProcesses(pid) {
  return new Promise((resolve, reject) => {
    psTree(pid, (err, children) => {
      if (err) {
        reject(err);
        return;
      }

      // Array of PIDs to kill, starting with the children
      const pidsToKill = children.map((p) => p.PID);
      pidsToKill.push(pid); // Also kill the main process

      const killCommand = isWindows ? windowsKillCommand : unixKillCommand;
      const joinedCommand = pidsToKill
        .map((pid) => `${killCommand} ${pid}`)
        .join('; '); // Separate commands with a semicolon, so they run in sequence even if one fails. Also works on Windows.

      exec(joinedCommand, (err) => {
        if (
          err?.message?.includes(isWindows ? 'not found' : 'No such process')
        ) {
          return; // Ignore errors for processes that are already dead
        }
        reject(err);
      });

      resolve();
    });
  });
}
