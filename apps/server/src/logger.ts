import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';
import fs from 'fs';
import path from 'path';

const pretty = format.printf(info => {
  const { timestamp, level, message, ...rest } = info;
  const meta = Object.keys(rest).length ? JSON.stringify(rest) : '';
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${meta}`;
});
// Detect if running in a test environment
const isTest =
  process.env.NODE_ENV === 'test' ||
  !!process.env.VITEST ||
  process.env.JEST_WORKER_ID !== undefined;

// Define log directories
const logDir = isTest ? path.resolve('logs/test') : path.resolve('logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  pretty
);

const mainLogFile = isTest ? 'test-app-%DATE%.log' : 'app-%DATE%.log';
const errorLogFile = isTest ? 'test-error-%DATE%.log' : 'error-%DATE%.log';

// Rotating file transports
const dailyRotateTransport = new transports.DailyRotateFile({
  dirname: logDir,
  filename: mainLogFile,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: false,
  maxSize: '10m',
  maxFiles: '14d',
});

const errorRotateTransport = new transports.DailyRotateFile({
  dirname: logDir,
  filename: errorLogFile,
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '10m',
  maxFiles: '14d',
});

const logger = createLogger({
  level:
    process.env.LOG_LEVEL ||
    (isTest ? 'debug' : process.env.NODE_ENV === 'production' ? 'warn' : 'debug'),
  format: logFormat,
  transports: [dailyRotateTransport, errorRotateTransport],
});

// Add console output in development or test (for instant feedback)
if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production' || isTest) {
  logger.add(new transports.Console({ format: format.combine(format.colorize(), logFormat) }));
}

export default logger;
