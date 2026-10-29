const { exec, execFile } = require('child_process');

const unixKillCommand = 'kill -9';
const windowsKillCommand = 'taskkill /F /PID';
const { logger } = require('./logger');
const isWindows = process.platform === 'win32';

// Prints one "<ppid> <pid>" line per process. Uses PowerShell because wmic
// is removed from recent Windows 11 releases.
const windowsListCommand =
  "Get-CimInstance Win32_Process | ForEach-Object { '{0} {1}' -f $_.ParentProcessId, $_.ProcessId }";

/**
 * Parses "<ppid> <pid>" lines into [{ ppid, pid }], skipping anything else.
 */
function parseProcessList(stdout) {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/).map(Number))
    .filter(
      (columns) => columns.length === 2 && columns.every(Number.isInteger),
    )
    .map(([ppid, pid]) => ({ ppid, pid }));
}

function listProcesses() {
  const [file, args] = isWindows
    ? [
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', windowsListCommand],
      ]
    : ['ps', ['-A', '-o', 'ppid=,pid=']];

  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true }, (err, stdout) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(parseProcessList(stdout));
    });
  });
}

/**
 * Returns every descendant PID of rootPid, parents before children.
 * Walks a parent-to-children map instead of relying on listing order:
 * after the PID counter wraps, a child can have a lower PID than its parent.
 */
function findDescendantPids(rootPid, processes) {
  const childrenByParent = new Map();
  for (const { ppid, pid } of processes) {
    if (!childrenByParent.has(ppid)) childrenByParent.set(ppid, []);
    childrenByParent.get(ppid).push(pid);
  }

  const root = Number(rootPid);
  const visited = new Set([root]);
  const descendants = [];
  const queue = [root];
  while (queue.length > 0) {
    for (const child of childrenByParent.get(queue.shift()) ?? []) {
      if (visited.has(child)) continue;
      visited.add(child);
      descendants.push(child);
      queue.push(child);
    }
  }
  return descendants;
}

async function killProcesses(pid) {
  // Array of PIDs to kill, starting with the children
  const pidsToKill = findDescendantPids(pid, await listProcesses());
  logger.electron('Pids to kill ' + JSON.stringify(pidsToKill));

  if (pidsToKill.length === 0) return;

  const killCommand = isWindows ? windowsKillCommand : unixKillCommand;

  return new Promise((resolve, reject) => {
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
}

module.exports = { killProcesses, findDescendantPids, parseProcessList };
