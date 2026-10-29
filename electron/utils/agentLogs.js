const fs = require('fs');
const path = require('path');

// The middleware keeps the previous agent run as `prev_log.txt` and older runs
// as `prev_log_<generation>.txt`, counting from 2.
const PREVIOUS_AGENT_LOG_PATTERN = /^prev_log(?:_(\d+))?\.txt$/;

/**
 * Lists the logs of a service's previous agent runs.
 * @returns {{ generation: number, filePath: string }[]}
 */
function listPreviousAgentLogs(servicePath) {
  return fs.readdirSync(servicePath).flatMap((fileName) => {
    const match = PREVIOUS_AGENT_LOG_PATTERN.exec(fileName);
    if (!match) return [];
    return [
      {
        generation: match[1] ? Number(match[1]) : 1,
        filePath: path.join(servicePath, fileName),
      },
    ];
  });
}

module.exports = { listPreviousAgentLogs };
