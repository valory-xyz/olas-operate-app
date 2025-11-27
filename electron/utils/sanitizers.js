const fs = require('fs');
const path = require('path');

const { paths } = require('../constants');

/**
 * Sanitizes logs by replacing usernames in the log data with asterisks.
 * If a file path is provided, it reads the log data from the file and sanitizes it.
 * If the file path does not exist, it returns null.
 * If no file path is provided, it sanitizes the provided data directly.
 * The sanitized log data is then written to the destination path.
 * @param {Object} options - The options for sanitizing logs.
 * @param {string} options.name - The name of the log file.
 * @param {string} options.filePath - The file path to read the log data from.
 * @param {string} options.data - The log data to sanitize if no file path is provided.
 * @param {string} options.destPath - The destination path where the logs should be stored after sanitization.
 * @returns {string|null} - The file path of the sanitized log data, or null if the file path does not exist.
 */
function sanitizeLogs({
  name,
  filePath,
  data = '',
  destPath = paths.osPearlTempDir,
}) {
  if (filePath && !fs.existsSync(filePath)) return null;

  const logs = filePath ? fs.readFileSync(filePath, 'utf-8') : data;

  // Sanitize Unix-style paths: /Users/username or /home/username
  const unixUsernameRegex = /\/(Users|home)\/([^/\\]+)/g;
  let sanitizedData = logs.replace(unixUsernameRegex, '/$1/*******');

  // Sanitize Windows-style paths (JSON strings)
  const windowsEscapedRegex = /([A-Za-z]:)\\\\Users\\\\([^\\\\]+)/g;
  sanitizedData = sanitizedData.replace(
    windowsEscapedRegex,
    '$1\\\\Users\\\\*******',
  );

  // Windows single backslashes: C:\Users\username
  const windowsBackslashRegex = /([A-Za-z]:)\\Users\\([^\\]+)/g;
  sanitizedData = sanitizedData.replace(
    windowsBackslashRegex,
    '$1\\Users\\*******',
  );
  const sanitizedLogsFilePath = path.join(destPath, name);

  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
  }

  fs.writeFileSync(sanitizedLogsFilePath, sanitizedData);

  return sanitizedLogsFilePath;
}

module.exports = { sanitizeLogs };
