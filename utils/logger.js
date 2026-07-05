const winston = require('winston');

const logger = winston.createLogger({
    levels: winston.config.npm.levels,
    level: process.env.NODE_ENV === 'production' ? 'info' : 'http',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            handleExceptions: true,  // Catches synchronous crashes
            handleRejections: true   // Catches unhandled promise drops
        }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        ),
        handleExceptions: true,
        handleRejections: true
    }));
}

module.exports = logger;