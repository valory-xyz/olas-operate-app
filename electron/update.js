const { MacUpdater } = require('electron-updater');
const electronLogger = require('electron-log');
const { githubOptions } = require('./constants/config');

const macUpdater = new MacUpdater(githubOptions);

electronLogger.transports.file.level = 'info';
macUpdater.logger = electronLogger;

module.exports = { macUpdater };
