const winston = require('winston');
const { format } = require('logform');
const { paths } = require('./constants');

const { combine, timestamp, printf } = format;

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    next: 3,
    cli: 4,
    electron: 5,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'blue',
    cli: 'green bold underline',
    electron: 'magenta bold underline',
    next: 'cyan bold underline',
  },
};

// Custom filter for specific levels, otherwise higher levels will include lower levels
const levelFilter = (level) =>
  format((info) => (info.level === level ? info : false))();

winston.addColors(customLevels.colors);

const TEN_MEGABYTES = 10 * 1024 * 1024;

const istTimestamp = winston.format.timestamp({
  format: () =>
    new Date()
      .toLocaleString('en-GB', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      .replace(',', ''),
});

const logger = winston.createLogger({
  levels: customLevels.levels,
  transports: [
    new winston.transports.Console({
      level: 'electron',
      format: combine(winston.format.colorize(), istTimestamp, logFormat),
    }),
    new winston.transports.File({
      filename: 'cli.log',
      dirname: paths.dotOperateDirectory,
      level: 'cli',
      format: combine(levelFilter('cli'), istTimestamp, logFormat),
      maxsize: TEN_MEGABYTES,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'electron.log',
      dirname: paths.dotOperateDirectory,
      level: 'electron',
      format: combine(levelFilter('electron'), istTimestamp, logFormat),
      maxFiles: 1,
      maxsize: TEN_MEGABYTES,
    }),
    new winston.transports.File({
      filename: 'next.log',
      dirname: paths.dotOperateDirectory,
      level: 'next',
      format: combine(levelFilter('next'), istTimestamp, logFormat),
      maxFiles: 1,
      maxsize: TEN_MEGABYTES,
    }),
  ],
  format: combine(istTimestamp, logFormat),
});

module.exports = { logger };
