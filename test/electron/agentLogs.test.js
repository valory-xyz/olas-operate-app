const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  listPreviousAgentLogs,
  previousAgentLogName,
} = require('../../electron/utils/agentLogs');

test('listPreviousAgentLogs: lists every previous agent run log', (t) => {
  const servicePath = fs.mkdtempSync(path.join(os.tmpdir(), 'pearl-service-'));
  t.after(() => fs.rmSync(servicePath, { recursive: true, force: true }));
  [
    'prev_log.txt',
    'prev_log_2.txt',
    'prev_log_20.txt',
    'prev_log_old.txt',
    'config.json',
  ].forEach((fileName) =>
    fs.writeFileSync(path.join(servicePath, fileName), ''),
  );

  const logs = listPreviousAgentLogs(servicePath).sort(
    (a, b) => a.generation - b.generation,
  );

  assert.deepEqual(logs, [
    { generation: 1, filePath: path.join(servicePath, 'prev_log.txt') },
    { generation: 2, filePath: path.join(servicePath, 'prev_log_2.txt') },
    { generation: 20, filePath: path.join(servicePath, 'prev_log_20.txt') },
  ]);
});

test('previousAgentLogName: builds the exported zip entry names', () => {
  assert.equal(previousAgentLogName('sc-1', 1), 'sc-1_prev_agent.log');
  assert.equal(previousAgentLogName('sc-1', 2), 'sc-1_prev_agent_2.log');
  assert.equal(previousAgentLogName('sc-1', 20), 'sc-1_prev_agent_20.log');
});
