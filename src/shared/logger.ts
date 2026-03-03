
import winston from 'winston';

const { combine, timestamp, errors, splat, printf, colorize } = winston.format;
const logger = winston.createLogger({
    level: 'info',
    format: combine(errors({ stack: true }), timestamp(), colorize(), splat(),
        printf((info) => {
            if (typeof info.message === 'object') info.message = JSON.stringify(info.message, null, 3)
            return `[${info.level}]${info.timestamp}: ${info.message}`
        })
    ),
    transports: [new winston.transports.Console()],
});


export default class Logger {
    static info(message: string, details?: any): void { logger.info(`${message}${details ? ' %o' : ''}`, details) }

    static error(error: Error): void { logger.error(error) }

    static warn(message: string): void { logger.warn(message)  }

    static debug(message: string, details?: any): void {logger.debug(`${message}${details ? ' %o' : ''}`, details)}
}