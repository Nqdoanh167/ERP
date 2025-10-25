import 'winston-daily-rotate-file';
import util from 'util';
import winston from 'winston';

const LOG_LEVEL = {
  INFO: 'info',
  ERROR: 'error',
  WARN: 'warn',
  DEBUG: 'debug',
};
const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
  BETA: 'beta',
};
const env = process.env.NODE_ENV || ENVIRONMENT.DEVELOPMENT;
const isDebugMode = process.env.IS_DEBUG_MODE === 'true';
const isTestEnv = env === ENVIRONMENT.TEST;
const isProductionEnv = env === ENVIRONMENT.PRODUCTION;

function transform(info, _opts) {
  const formatMessage = message => {
    if (typeof message !== 'object') {
      return util.format(message);
    }

    return util.format(
      util.inspect(message, {
        depth: isProductionEnv ? 2 : Infinity,
        colors: true,
      })
    );
  };

  const args = info[Symbol.for('splat')];
  info.message = args
    ? util.format(info.message, ...args.map(formatMessage))
    : formatMessage(info.message);

  return info;
}

function utilFormatter() {
  return { transform };
}

const COLOR = {
  CYAN: '\x1b[36m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  RESET: '\x1b[0m',
  PINK: '\x1b[35m',
};

function colorizeText(text, color) {
  return `${color}${text}${COLOR.RESET}`;
}

const enumerateErrorFormat = winston.format(info => {
  if (info.message instanceof Error) {
    info.message = Object.assign(
      {
        message: info.message.message,
        stack: info.message.stack,
      },
      info.message
    );
  }

  if (info instanceof Error) {
    return Object.assign(
      {
        message: info.message,
        stack: info.stack,
      },
      info
    );
  }

  return info;
});

function getColorByLevel(level) {
  switch (level) {
    case LOG_LEVEL.ERROR:
      return COLOR.RED;

    case LOG_LEVEL.INFO:
      return COLOR.GREEN;

    case LOG_LEVEL.DEBUG:
      return COLOR.CYAN;

    case LOG_LEVEL.WARN:
      return COLOR.YELLOW;

    default:
      return COLOR.RESET;
  }
}

const logger = winston.createLogger({
  level: isTestEnv ? LOG_LEVEL.ERROR : LOG_LEVEL.INFO,
  format: winston.format.combine(
    enumerateErrorFormat(),
    utilFormatter(),
    winston.format.ms(),
    winston.format.align(),
    winston.format.prettyPrint(),
    winston.format.timestamp({ format: 'DD/MM/YYYY HH:mm:ss' }),
    winston.format.printf(msg => {
      const level = colorizeText(
        msg.level.toUpperCase(),
        getColorByLevel(msg.level)
      );
      const timestamp = colorizeText(
        msg.timestamp,
        isDebugMode && msg.level === LOG_LEVEL.DEBUG ? COLOR.CYAN : COLOR.GREEN
      );
      const ms = colorizeText(msg.ms, COLOR.CYAN);
      const stackTrace = msg.stack ? colorizeText(msg.stack, COLOR.RED) : '';

      return `[${timestamp} ${level} ${colorizeText(process.pid, COLOR.PINK)}]: ${msg.message} ${ms}${stackTrace}`;
    })
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      // %DATE will be replaced by the current date
      filename: `%DATE%-error.log`,
      dirname: 'logs',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'DD/MM/YYYY HH:mm:ss',
        }),
        winston.format.json()
      ),
      datePattern: 'DD-MM-YYYY',
      maxFiles: '7d', // will keep log until they are older than 7 days
    }),
    new winston.transports.Console({
      silent: isTestEnv,
      level: isDebugMode ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO,
      stderrLevels: [LOG_LEVEL.ERROR],
    }),
  ],
});

module.exports = logger;
