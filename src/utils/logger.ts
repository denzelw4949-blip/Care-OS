// src/utils/logger.ts
import winston from 'winston';

const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

const devFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${service || 'app'}] ${level}: ${message} ${metaStr}`;
    })
);

export const createLogger = (service: string) => {
    return winston.createLogger({
        level: logLevel,
        format: process.env.NODE_ENV === 'production' ? format : devFormat,
        defaultMeta: { service },
        transports: [
            new winston.transports.Console(),
            ...(process.env.NODE_ENV === 'production'
                ? [
                    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
                    new winston.transports.File({ filename: 'logs/combined.log' }),
                ]
                : []),
        ],
    });
};
