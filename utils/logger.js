const winston = require('winston');

// Register npm level colors (error, warn, info, http, verbose, debug, silly)
winston.addColors(winston.config.npm.colors);

const { combine, timestamp, errors, json, printf } = winston.format;

// ANSI color codes — avoids colorize() which silently drops output in non-TTY pipes (e.g. nodemon)
const COLORS = {
    error: '\x1b[31m',  // red
    warn:  '\x1b[33m',  // yellow
    info:  '\x1b[32m',  // green
    http:  '\x1b[36m',  // cyan
    reset: '\x1b[0m'
};

const fileFormat = () => combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
);

const consoleFormat = () => combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ level, message, timestamp }) => {
        const color = COLORS[level] || '';
        return `${color}${timestamp} ${level}: ${message}${COLORS.reset}`;
    })
);

const logger = winston.createLogger({
    levels: winston.config.npm.levels,
    level: process.env.NODE_ENV === 'production' ? 'info' : 'http',
    transports: [
        new winston.transports.Console({
            format: process.env.NODE_ENV === 'production' ? fileFormat() : consoleFormat(),
            stderrLevels: ['error'],     // Route error logs to stderr
            handleExceptions: true,
            handleRejections: true
        }),
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: fileFormat(),
            handleExceptions: true,
            handleRejections: true
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            format: fileFormat()
        }),
    ],
});

module.exports = logger;