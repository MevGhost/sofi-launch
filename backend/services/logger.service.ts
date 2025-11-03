import winston from 'winston';
import path from 'path';
import { getConfig, isProduction } from '../config/env.schema';

/**
 * Production-ready logging service
 * Implements structured logging with different transports based on environment
 */

const config = getConfig();

// Custom format for better readability
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Create transports based on environment
const transports: winston.transport[] = [];

// Console transport (always enabled)
if (!isProduction()) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: config.LOG_LEVEL,
    })
  );
} else {
  // Production uses JSON format for better parsing
  transports.push(
    new winston.transports.Console({
      format: customFormat,
      level: config.LOG_LEVEL,
    })
  );
}

// File transports for production
if (isProduction()) {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      format: customFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  
  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      format: customFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: customFormat,
  transports,
  exitOnError: false,
});

// Add request ID tracking for better debugging
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}

// Specialized loggers for different services
export const dbLogger = logger.child({ service: 'database' });
export const wsLogger = logger.child({ service: 'websocket' });
export const authLogger = logger.child({ service: 'auth' });
export const contractLogger = logger.child({ service: 'contract' });
export const apiLogger = logger.child({ service: 'api' });

// Error logging with context
export function logError(error: Error, context?: Record<string, any>) {
  logger.error({
    message: error.message,
    stack: error.stack,
    ...context,
  });
}

// Performance logging
export function logPerformance(operation: string, duration: number, metadata?: Record<string, any>) {
  logger.info({
    message: `Performance: ${operation}`,
    duration,
    ...metadata,
  });
}

// Security event logging
export function logSecurityEvent(event: string, details: Record<string, any>) {
  logger.warn({
    message: `Security Event: ${event}`,
    type: 'security',
    ...details,
  });
}

// Audit logging for sensitive operations
export function logAudit(action: string, userId: string, details: Record<string, any>) {
  logger.info({
    message: `Audit: ${action}`,
    type: 'audit',
    userId,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

// Stream for Morgan HTTP logging
export const morganStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;