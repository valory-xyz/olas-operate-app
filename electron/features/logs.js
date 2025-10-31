const { app, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');

const { logger } = require('../logger');
const { paths } = require('../constants');
const { sanitizeLogs } = require('../utils/sanitizers');

function prepareLogsForDebug(data) {
  const cliLogFiles = fs
    .readdirSync(paths.dotOperateDirectory)
    .filter((file) => file.startsWith('cli') && file.endsWith('.log'));

  if (cliLogFiles.length >= 1) {
    cliLogFiles.forEach((file) => {
      const filePath = path.join(paths.dotOperateDirectory, file);
      sanitizeLogs({ name: file, filePath });
    });
  }

  sanitizeLogs({ name: 'next.log', filePath: paths.nextLogFile });
  sanitizeLogs({ name: 'electron.log', filePath: paths.electronLogFile });

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
      sanitizeLogs({
        name: 'agent_runner.log',
        filePath: paths.agentRunnerLogFile,
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

      // Most recent log
      try {
        const agentLogFilePath = path.join(
          servicePath,
          'deployment',
          'agent',
          'log.txt',
        );
        if (fs.existsSync(agentLogFilePath)) {
          sanitizeLogs({
            name: `${serviceDirName}_agent.log`,
            filePath: agentLogFilePath,
          });
        }
      } catch (e) {
        logger.electron(e);
      }

      // Previous log
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
  const zip = prepareLogsForDebug(data);
  const supportLogsDir = path.join(__dirname, 'support-logs');

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
    const supportLogsDir = path.join(__dirname, 'support-logs');

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
