"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.morganStream = exports.apiLogger = exports.contractLogger = exports.authLogger = exports.wsLogger = exports.dbLogger = void 0;
exports.createRequestLogger = createRequestLogger;
exports.logError = logError;
exports.logPerformance = logPerformance;
exports.logSecurityEvent = logSecurityEvent;
exports.logAudit = logAudit;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const env_schema_1 = require("../config/env.schema");
/**
 * Production-ready logging service
 * Implements structured logging with different transports based on environment
 */
const config = (0, env_schema_1.getConfig)();
// Custom format for better readability
const customFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json());
// Console format for development
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'HH:mm:ss' }), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta)}`;
    }
    return log;
}));
// Create transports based on environment
const transports = [];
// Console transport (always enabled)
if (!(0, env_schema_1.isProduction)()) {
    transports.push(new winston_1.default.transports.Console({
        format: consoleFormat,
        level: config.LOG_LEVEL,
    }));
}
else {
    // Production uses JSON format for better parsing
    transports.push(new winston_1.default.transports.Console({
        format: customFormat,
        level: config.LOG_LEVEL,
    }));
}
// File transports for production
if ((0, env_schema_1.isProduction)()) {
    // Error log file
    transports.push(new winston_1.default.transports.File({
        filename: path_1.default.join(process.cwd(), 'logs', 'error.log'),
        level: 'error',
        format: customFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }));
    // Combined log file
    transports.push(new winston_1.default.transports.File({
        filename: path_1.default.join(process.cwd(), 'logs', 'combined.log'),
        format: customFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }));
}
// Create the logger instance
const logger = winston_1.default.createLogger({
    level: config.LOG_LEVEL,
    format: customFormat,
    transports,
    exitOnError: false,
});
// Add request ID tracking for better debugging
function createRequestLogger(requestId) {
    return logger.child({ requestId });
}
// Specialized loggers for different services
exports.dbLogger = logger.child({ service: 'database' });
exports.wsLogger = logger.child({ service: 'websocket' });
exports.authLogger = logger.child({ service: 'auth' });
exports.contractLogger = logger.child({ service: 'contract' });
exports.apiLogger = logger.child({ service: 'api' });
// Error logging with context
function logError(error, context) {
    logger.error({
        message: error.message,
        stack: error.stack,
        ...context,
    });
}
// Performance logging
function logPerformance(operation, duration, metadata) {
    logger.info({
        message: `Performance: ${operation}`,
        duration,
        ...metadata,
    });
}
// Security event logging
function logSecurityEvent(event, details) {
    logger.warn({
        message: `Security Event: ${event}`,
        type: 'security',
        ...details,
    });
}
// Audit logging for sensitive operations
function logAudit(action, userId, details) {
    logger.info({
        message: `Audit: ${action}`,
        type: 'audit',
        userId,
        timestamp: new Date().toISOString(),
        ...details,
    });
}
// Stream for Morgan HTTP logging
exports.morganStream = {
    write: (message) => {
        logger.info(message.trim());
    },
};
exports.default = logger;
//# sourceMappingURL=logger.service.js.map