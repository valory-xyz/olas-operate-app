/**
 * Tests for electron/processes.js. Uses Node's built-in test runner; run with
 * `yarn test:electron`.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawn } = require('node:child_process');

// Stub the logger so the tests write no log files and need no node_modules.
require.cache[require.resolve('./logger')] = {
  exports: { logger: { electron: () => {} } },
};

const {
  findDescendantPids,
  killProcesses,
  parseProcessList,
} = require('./processes');

test('parseProcessList: reads ps output and skips other lines', () => {
  const stdout = '    1     1\n99429 99596\n\n  ps: warning\n  99596  2743\n';
  assert.deepEqual(parseProcessList(stdout), [
    { ppid: 1, pid: 1 },
    { ppid: 99429, pid: 99596 },
    { ppid: 99596, pid: 2743 },
  ]);
});

test('parseProcessList: reads Windows CRLF output', () => {
  assert.deepEqual(parseProcessList('0 4\r\n4 128\r\n'), [
    { ppid: 0, pid: 4 },
    { ppid: 4, pid: 128 },
  ]);
});

test('findDescendantPids: finds children whose PID is lower than their parent', () => {
  // The 2026-10-26 update: PIDs wrapped from 99999, so the tendermint_bin
  // Flask server (2743) and its node (2750) sort before their parents.
  const processes = [
    { ppid: 1, pid: 1 },
    { ppid: 99714, pid: 2743 },
    { ppid: 2743, pid: 2750 },
    { ppid: 1, pid: 5000 },
    { ppid: 92000, pid: 92257 },
    { ppid: 92257, pid: 99429 },
    { ppid: 92257, pid: 99596 },
    { ppid: 99429, pid: 99714 },
  ];

  assert.deepEqual(
    findDescendantPids(92257, processes),
    [99429, 99596, 99714, 2743, 2750],
  );
});

test('findDescendantPids: stops on a parent cycle', () => {
  // Windows lists the System Idle Process as its own parent.
  const processes = [
    { ppid: 0, pid: 0 },
    { ppid: 0, pid: 4 },
    { ppid: 4, pid: 0 },
  ];
  assert.deepEqual(findDescendantPids(0, processes), [4]);
});

test('findDescendantPids: returns nothing for an unknown PID', () => {
  assert.deepEqual(findDescendantPids('123', [{ ppid: 1, pid: 2 }]), []);
});

test(
  'killProcesses: kills every descendant of a real process tree',
  { skip: process.platform === 'win32' },
  async () => {
    const root = spawn('sh', ['-c', 'sh -c "sleep 30 & wait" & wait']);
    const isAlive = (pid) => {
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    };

    try {
      // Wait until the grandchild exists, then capture the whole tree.
      let descendants = [];
      for (let i = 0; i < 50 && descendants.length < 2; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const ps = execFileSync('ps', ['-A', '-o', 'ppid=,pid=']).toString();
        descendants = findDescendantPids(root.pid, parseProcessList(ps));
      }
      assert.equal(descendants.length, 2, 'sh -> sleep started under root');

      await killProcesses(root.pid);
      await new Promise((resolve) => setTimeout(resolve, 200));

      assert.deepEqual(descendants.filter(isAlive), []);
    } finally {
      root.kill('SIGKILL');
    }
  },
);
