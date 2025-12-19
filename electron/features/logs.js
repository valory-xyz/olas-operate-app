const { app, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');

const { logger } = require('../logger');
const { paths } = require('../constants');
const { sanitizeLogs } = require('../utils/sanitizers');

const FILE_SIZE_LIMITS = {
  FIVE_HUNDRED_KB: 500 * 1024,
  ONE_MB: 1024 * 1024,
  THREE_MB: 3 * 1024 * 1024,
};

/**
 * Reads the tail (last N bytes) of a log file to reduce size.
 * Keeps the most recent log entries which are usually most relevant for debugging
 */
function readLogFileTail(filePath, maxBytes) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size <= maxBytes) {
      return fs.readFileSync(filePath, 'utf-8');
    }

    // Reads only the last maxBytes of the file.
    const fileDescriptor = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(maxBytes);
    fs.readSync(fileDescriptor, buffer, 0, maxBytes, stats.size - maxBytes);
    fs.closeSync(fileDescriptor);

    const content = buffer.toString('utf-8');
    return `[File truncated - original size: ${(stats.size / 1024 / 1024).toFixed(2)}MB, showing last ${(maxBytes / 1024 / 1024).toFixed(2)}MB]\n${content}`;
  } catch (e) {
    logger.electron(`Error reading log file tail ${filePath}: ${e.message}`);
    // Fallback to reading whole file.
    return fs.readFileSync(filePath, 'utf-8');
  }
}

function sanitizeLogFile({ logFileName, filePath, isForSupport, sizeLimit }) {
  if (isForSupport && sizeLimit) {
    const logContent = readLogFileTail(filePath, sizeLimit);
    sanitizeLogs({ name: logFileName, data: logContent });
  } else {
    sanitizeLogs({ name: logFileName, filePath });
  }
}

function prepareLogsForDebug(data, forSupport = false) {
  const cliLogFiles = fs
    .readdirSync(paths.dotOperateDirectory)
    .filter((file) => file.startsWith('cli') && file.endsWith('.log'));

  if (cliLogFiles.length >= 1) {
    if (forSupport) {
      // For support logs, only include the latest CLI log file
      const filesWithStats = cliLogFiles.map((file) => {
        const filePath = path.join(paths.dotOperateDirectory, file);
        const stats = fs.statSync(filePath);
        return { file, filePath, mtime: stats.mtime };
      });

      const latestFile = filesWithStats.sort((a, b) => b.mtime - a.mtime)[0];
      sanitizeLogFile({
        logFileName: latestFile.file,
        filePath: latestFile.filePath,
        isForSupport: forSupport,
        sizeLimit: FILE_SIZE_LIMITS.THREE_MB,
      });
    } else {
      // For regular logs, include all CLI log files
      cliLogFiles.forEach((file) => {
        const filePath = path.join(paths.dotOperateDirectory, file);
        sanitizeLogs({ name: file, filePath });
      });
    }
  }

  sanitizeLogFile({
    logFileName: 'next.log',
    filePath: paths.nextLogFile,
    isForSupport: forSupport,
    sizeLimit: FILE_SIZE_LIMITS.FIVE_HUNDRED_KB,
  });
  sanitizeLogFile({
    logFileName: 'electron.log',
    filePath: paths.electronLogFile,
    isForSupport: forSupport,
    sizeLimit: FILE_SIZE_LIMITS.ONE_MB,
  });

  // OS info
  const osInfo = `
      OS Type: ${os.type()}
      OS Platform: ${os.platform()}
      OS Arch: ${os.arch()}
      OS Release: ${os.release()}
      Total Memory: ${os.totalmem()}
      Free Memory: ${os.freemem()}
      Available Parallelism: ${os.availableParallelism()}
      CPUs: ${JSON.stringify(os.cpus())}
    `;
  const osInfoFilePath = path.join(paths.osPearlTempDir, 'os_info.txt');
  fs.writeFileSync(osInfoFilePath, osInfo);

  // Persistent store
  if (data.store) {
    sanitizeLogs({
      name: 'store.txt',
      data: JSON.stringify(data.store, null, 2),
    });
  }

  // Other debug data: balances, addresses, etc.
  if (data.debugData) {
    const clonedDebugData = JSON.parse(JSON.stringify(data.debugData)); // TODO: deep clone with better method
    const servicesData = clonedDebugData.services;
    if (servicesData && Array.isArray(servicesData.services)) {
      Object.entries(servicesData.services).forEach(([_, eachService]) => {
        if (eachService && eachService.env_variables) {
          Object.entries(eachService.env_variables).forEach(([_, envVar]) => {
            if (envVar.provision_type === 'user') {
              envVar.value = '*****';
            }
          });
        }
      });
    }

    clonedDebugData.services = servicesData;

    sanitizeLogs({
      name: 'debug_data.json',
      data: JSON.stringify(clonedDebugData, null, 2),
    });
  }

  // Bridge logs
  try {
    const bridgeLogFilePath = path.join(paths.bridgeDirectory, 'bridge.json');
    if (fs.existsSync(bridgeLogFilePath)) {
      sanitizeLogs({ name: 'bridge.json', filePath: bridgeLogFilePath });
    }
  } catch (e) {
    logger.electron(e);
  }

  // agent_runner.log wraps agent runner process even before agent started, so can check issues with executable start
  try {
    if (fs.existsSync(paths.agentRunnerLogFile)) {
      sanitizeLogFile({
        logFileName: 'agent_runner.log',
        filePath: paths.agentRunnerLogFile,
        isForSupport: forSupport,
        sizeLimit: FILE_SIZE_LIMITS.THREE_MB,
      });
    }
  } catch (e) {
    logger.electron(e);
  }

  // tm.log wraps tendermint logs
  try {
    if (fs.existsSync(paths.agentRunnerLogFile)) {
      sanitizeLogFile({
        logFileName: 'tm.log',
        filePath: paths.tmLogFile,
        isForSupport: forSupport,
        sizeLimit: FILE_SIZE_LIMITS.THREE_MB,
      });
    }
  } catch (e) {
    logger.electron(e);
  }

  // Agent logs
  try {
    fs.readdirSync(paths.servicesDir).forEach((serviceDirName) => {
      const servicePath = path.join(paths.servicesDir, serviceDirName);
      if (!fs.existsSync(servicePath)) return;
      if (!fs.statSync(servicePath).isDirectory()) return;

      // Most recent agent log
      try {
        const agentLogFilePath = path.join(
          servicePath,
          'deployment',
          'agent',
          'log.txt',
        );
        if (fs.existsSync(agentLogFilePath)) {
          sanitizeLogFile({
            logFileName: `${serviceDirName}_agent.log`,
            filePath: agentLogFilePath,
            isForSupport: forSupport,
            sizeLimit: FILE_SIZE_LIMITS.ONE_MB,
          });
        }
      } catch (e) {
        logger.electron(e);
      }

      // Previous log (skip for support logs)
      if (!forSupport) {
        try {
          const prevAgentLogFilePath = path.join(servicePath, 'prev_log.txt');
          if (fs.existsSync(prevAgentLogFilePath)) {
            sanitizeLogs({
              name: `${serviceDirName}_prev_agent.log`,
              filePath: prevAgentLogFilePath,
            });
          }
        } catch (e) {
          logger.electron(e);
        }
      }
    });
  } catch (e) {
    logger.electron(e);
  }

  // Create a zip archive
  const zip = new AdmZip();
  fs.readdirSync(paths.osPearlTempDir).forEach((file) => {
    const filePath = path.join(paths.osPearlTempDir, file);
    if (!fs.existsSync(filePath)) return;
    if (fs.statSync(filePath).isDirectory()) return;

    zip.addLocalFile(filePath);
  });

  return zip;
}

function removeTemporaryLogFiles() {
  if (fs.existsSync(paths.osPearlTempDir)) {
    fs.rmSync(paths.osPearlTempDir, {
      recursive: true,
      force: true,
    });
  }
}

function getPearlLogsFileName() {
  const timestamp = new Date(Date.now())
    .toISOString()
    .replaceAll(':', '-')
    .replaceAll('.', '-');
  return `pearl_logs_${timestamp}-${app.getVersion()}.zip`;
}

/**
 * Exports logs by creating a zip file containing sanitized logs and other relevant data.
 */
ipcMain.handle('save-logs', async (_, data) => {
  const zip = prepareLogsForDebug(data);

  // Show save dialog
  const { filePath } = await dialog.showSaveDialog({
    title: 'Save Logs',
    defaultPath: path.join(os.homedir(), getPearlLogsFileName()),
    filters: [{ name: 'Zip Files', extensions: ['zip'] }],
  });

  let result;
  if (filePath) {
    // Write the zip file to the selected path
    zip.writeZip(filePath);
    result = { success: true, dirPath: path.dirname(filePath) };
  } else {
    result = { success: false };
  }
  removeTemporaryLogFiles();
  return result;
});

ipcMain.handle('save-logs-for-support', async (_, data) => {
  const zip = prepareLogsForDebug(data, true);
  const supportLogsDir = path.join(paths.osPearlTempDir, 'support-logs');

  // Ensure the directory exists
  if (!fs.existsSync(supportLogsDir)) {
    fs.mkdirSync(supportLogsDir, { recursive: true });
  }

  // Generate filename with timestamp
  const fileName = getPearlLogsFileName();
  const filePath = path.join(supportLogsDir, fileName);

  // Write the zip file
  zip.writeZip(filePath);
  return { success: true, filePath, fileName };
});

/**
 * Clean up Support logs after ticket submission
 */
ipcMain.handle('cleanup-support-logs', async () => {
  try {
    const supportLogsDir = path.join(paths.osPearlTempDir, 'support-logs');

    removeTemporaryLogFiles();

    if (fs.existsSync(supportLogsDir)) {
      // Remove all files in the support-logs directory
      const files = fs.readdirSync(supportLogsDir);
      files.forEach((file) => {
        const filePath = path.join(supportLogsDir, file);
        try {
          fs.unlinkSync(filePath);
          logger.electron(`Cleaned up Support log file: ${file}`);
        } catch (error) {
          logger.electron(
            `Failed to delete Support log file ${file}: ${error.message}`,
          );
        }
      });

      // Remove the directory
      try {
        fs.rmSync(supportLogsDir, { recursive: true, force: true });
        logger.electron('Cleaned up Support logs directory');
      } catch (error) {
        logger.electron(
          `Could not remove Support logs directory: ${error.message}`,
        );
      }
    }

    return { success: true };
  } catch (error) {
    logger.electron(`Error cleaning up Support logs: ${error.message}`);
    return { success: false, error: error.message };
  }
});

/**
 * Read file content
 */
ipcMain.handle('read-file', async (_, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File does not exist' };
    }

    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const base64Content = fileContent.toString('base64');

    return {
      success: true,
      fileName,
      fileContent: `data:application/octet-stream;base64,${base64Content}`,
      mimeType: 'application/zip',
    };
  } catch (error) {
    logger.electron(`Error reading file: ${error.message}`);
    return { success: false, error: error.message };
  }
});
