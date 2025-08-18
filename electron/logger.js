const winston = require('winston');
const { format } = require('logform');
const { paths } = require('./constants');

const { combine, timestamp, printf } = format;

const DEFAULT_SENSITIVE_KEYS = [
  'password',
  'apiKey',
  'token',
  'secret',
  'authorization',
];

/**
 * Recursively sanitize objects/arrays by masking sensitive keys.
 */
function sanitizeObject(x, sensitiveKeys = DEFAULT_SENSITIVE_KEYS) {
  if (Array.isArray(x)) {
    return x.map((v) => sanitizeObject(v, sensitiveKeys));
  } else if (x && typeof x === 'object') {
    return Object.fromEntries(
      Object.entries(x).map(([k, v]) => {
        if (sensitiveKeys.some((sk) => sk.toLowerCase() === k.toLowerCase())) {
          return [k, '***'];
        }
        return [k, sanitizeObject(v, sensitiveKeys)];
      }),
    );
  }
  return x;
}

/**
 * Try to sanitize a string: if it's JSON, parse + sanitize + re-stringify.
 * Otherwise, redact using regex.
 */
function sanitizeString(str, sensitiveKeys = DEFAULT_SENSITIVE_KEYS) {
  let sanitized = str;

  // Try JSON parse
  try {
    const parsed = JSON.parse(str);
    return JSON.stringify(sanitizeObject(parsed, sensitiveKeys));
  } catch {
    // Regex-based replacement for "key=value" or "key: value"
    const pattern = new RegExp(
      `(${sensitiveKeys.join('|')})\\s*[:=]\\s*["']?([A-Za-z0-9._-]+)["']?`,
      'gi',
    );
    return sanitized.replace(pattern, (_, key) => `${key}: ***`);
  }
}

/**
 * Winston format that sanitizes log messages.
 */
const sanitizeFormat = (sensitiveKeys = DEFAULT_SENSITIVE_KEYS) =>
  format((info) => {
    if (typeof info.message === 'object') {
      info.message = sanitizeObject(info.message, sensitiveKeys);
    } else if (typeof info.message === 'string') {
      info.message = sanitizeString(info.message, sensitiveKeys);
    }
    return info;
  })();

module.exports = {
  sanitizeObject,
  sanitizeString,
  sanitizeFormat,
  DEFAULT_SENSITIVE_KEYS,
};

const logFormat = printf(({ level, message, timestamp }) => {
  const msg =
    typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
  return `${timestamp} ${level}: ${msg}`;
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

const logger = winston.createLogger({
  levels: customLevels.levels,

  transports: [
    new winston.transports.Console({
      level: 'electron',
      format: combine(
        winston.format.colorize(),
        sanitizeFormat(),
        timestamp(),
        logFormat,
      ),
    }),
    new winston.transports.File({
      filename: 'cli.log',
      dirname: paths.dotOperateDirectory,
      level: 'cli',
      format: combine(
        levelFilter('cli'),
        sanitizeFormat(),
        timestamp(),
        logFormat,
      ),
      maxsize: TEN_MEGABYTES,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'electron.log',
      dirname: paths.dotOperateDirectory,
      level: 'electron',
      format: combine(
        levelFilter('electron'),
        sanitizeFormat(),
        timestamp(),
        logFormat,
      ),
      maxFiles: 1,
      maxsize: TEN_MEGABYTES,
    }),
    new winston.transports.File({
      filename: 'next.log',
      dirname: paths.dotOperateDirectory,
      level: 'next',
      format: combine(
        levelFilter('next'),
        sanitizeFormat(),
        timestamp(),
        logFormat,
      ),
      maxFiles: 1,
      maxsize: TEN_MEGABYTES,
    }),
  ],
  format: combine(timestamp(), logFormat),
});

module.exports = { logger };
