// @ts-check
import { format } from 'logform';
import winston from 'winston';

import { paths } from '../constants/paths.mjs';

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
  format((info) => {
    return info.level === level ? info : false;
  })();

const logger = winston.createLogger({
  levels: customLevels.levels,
  transports: [
    new winston.transports.Console({
      level: 'electron', // Set to the highest level so it captures everything.
      format: combine(winston.format.colorize(), timestamp(), logFormat),
    }),
    new winston.transports.File({
      filename: 'cli.log',
      dirname: paths.dotOperateDirectory,
      level: 'cli',
      format: combine(levelFilter('cli'), timestamp(), logFormat),
      maxFiles: 1,
      maxsize: 1024 * 1024 * 10,
    }),
    new winston.transports.File({
      filename: 'electron.log',
      dirname: paths.dotOperateDirectory,
      level: 'electron',
      format: combine(levelFilter('electron'), timestamp(), logFormat),
      maxFiles: 1,
      maxsize: 1024 * 1024 * 10,
    }),
    new winston.transports.File({
      filename: 'next.log',
      dirname: paths.dotOperateDirectory,
      level: 'next',
      format: combine(levelFilter('next'), timestamp(), logFormat),
      maxFiles: 1,
      maxsize: 1024 * 1024 * 10,
    }),
  ],
  format: combine(timestamp(), logFormat),
});

winston.addColors(customLevels.colors);

export { logger };
