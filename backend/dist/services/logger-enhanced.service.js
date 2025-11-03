"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = exports.sanitizeLogData = exports.winstonLogger = exports.Logger = exports.createLogger = exports.performanceMonitor = exports.defaultLogger = exports.httpLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
// Log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
// Log colors
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};
winston_1.default.addColors(colors);
// Get log level from environment
const getLogLevel = () => {
    const env = process.env['NODE_ENV'] || 'development';
    const level = process.env['LOG_LEVEL'];
    if (level)
        return level;
    switch (env) {
        case 'production':
            return 'info';
        case 'test':
            return 'error';
        default:
            return 'debug';
    }
};
// Custom format for production
const productionFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    const log = {
        timestamp,
        level,
        message,
    };
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
        // Sanitize sensitive data
        const sanitized = sanitizeLogData(meta);
        Object.assign(log, sanitized);
    }
    return JSON.stringify(log);
}));
// Custom format for development
const developmentFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
        const sanitized = sanitizeLogData(meta);
        log += '\n' + JSON.stringify(sanitized, null, 2);
    }
    return log;
}));
// Sanitize sensitive data from logs
const sanitizeLogData = (data) => {
    const sensitive = [
        'password',
        'token',
        'secret',
        'authorization',
        'cookie',
        'jwt',
        'privateKey',
        'apiKey',
        'accessToken',
        'refreshToken',
    ];
    const sanitize = (obj) => {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase();
            // Check if key contains sensitive data
            if (sensitive.some(s => lowerKey.includes(s.toLowerCase()))) {
                sanitized[key] = '[REDACTED]';
            }
            else if (typeof value === 'object') {
                sanitized[key] = sanitize(value);
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    };
    return sanitize(data);
};
exports.sanitizeLogData = sanitizeLogData;
// Create transports
const createTransports = () => {
    const transports = [];
    const env = process.env['NODE_ENV'] || 'development';
    // Console transport
    transports.push(new winston_1.default.transports.Console({
        format: env === 'production' ? productionFormat : developmentFormat,
        level: getLogLevel(),
    }));
    // File transports for production
    if (env === 'production') {
        const logDir = process.env['LOG_DIR'] || path_1.default.join(process.cwd(), 'logs');
        // Error log file
        transports.push(new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(logDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            format: productionFormat,
            maxSize: '20m',
            maxFiles: '30d',
            zippedArchive: true,
        }));
        // Combined log file
        transports.push(new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(logDir, 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            format: productionFormat,
            maxSize: '20m',
            maxFiles: '14d',
            zippedArchive: true,
        }));
        // HTTP request log file
        transports.push(new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(logDir, 'http-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'http',
            format: productionFormat,
            maxSize: '20m',
            maxFiles: '7d',
            zippedArchive: true,
        }));
    }
    return transports;
};
// Create logger instance
const logger = winston_1.default.createLogger({
    levels,
    level: getLogLevel(),
    transports: createTransports(),
    exitOnError: false,
    // Handle uncaught exceptions and rejections
    exceptionHandlers: process.env['NODE_ENV'] === 'production' ? [
        new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(process.env['LOG_DIR'] || './logs', 'exceptions-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '30d',
            zippedArchive: true,
        }),
    ] : [],
    rejectionHandlers: process.env['NODE_ENV'] === 'production' ? [
        new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(process.env['LOG_DIR'] || './logs', 'rejections-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '30d',
            zippedArchive: true,
        }),
    ] : [],
});
exports.winstonLogger = logger;
// Logger methods with context
class Logger {
    context;
    constructor(context) {
        this.context = context;
    }
    log(level, message, meta) {
        const logData = {};
        if (this.context) {
            logData.context = this.context;
        }
        if (meta) {
            Object.assign(logData, meta);
        }
        logger.log(level, message, logData);
    }
    error(message, error, meta) {
        const errorData = { ...meta };
        if (error) {
            errorData.error = {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name,
            };
        }
        this.log('error', message, errorData);
    }
    warn(message, meta) {
        this.log('warn', message, meta);
    }
    info(message, meta) {
        this.log('info', message, meta);
    }
    http(message, meta) {
        this.log('http', message, meta);
    }
    debug(message, meta) {
        this.log('debug', message, meta);
    }
    // Log HTTP requests
    logRequest(req, res, responseTime) {
        const meta = {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.requestId,
            userId: req.user?.userId,
        };
        // Choose log level based on status code
        if (res.statusCode >= 500) {
            this.error(`HTTP ${req.method} ${req.originalUrl}`, undefined, meta);
        }
        else if (res.statusCode >= 400) {
            this.warn(`HTTP ${req.method} ${req.originalUrl}`, meta);
        }
        else {
            this.http(`HTTP ${req.method} ${req.originalUrl}`, meta);
        }
    }
    // Log database queries
    logQuery(operation, model, duration, params) {
        const meta = {
            operation,
            model,
            duration: `${duration}ms`,
            slow: duration > 1000,
        };
        if (params && process.env['NODE_ENV'] === 'development') {
            meta['params'] = sanitizeLogData(params);
        }
        if (duration > 1000) {
            this.warn(`Slow database query: ${operation} on ${model}`, meta);
        }
        else {
            this.debug(`Database query: ${operation} on ${model}`, meta);
        }
    }
    // Log WebSocket events
    logWebSocket(event, data) {
        this.debug(`WebSocket event: ${event}`, {
            event,
            data: data ? sanitizeLogData(data) : undefined,
        });
    }
    // Log external API calls
    logAPICall(service, endpoint, method, statusCode, duration) {
        const meta = {
            service,
            endpoint,
            method,
            statusCode,
            duration: `${duration}ms`,
        };
        if (statusCode >= 400) {
            this.error(`External API error: ${service}`, undefined, meta);
        }
        else if (duration > 3000) {
            this.warn(`Slow external API call: ${service}`, meta);
        }
        else {
            this.info(`External API call: ${service}`, meta);
        }
    }
    // Create child logger with additional context
    child(context) {
        const childContext = this.context ? `${this.context}:${context}` : context;
        return new Logger(childContext);
    }
}
exports.Logger = Logger;
// Express middleware for HTTP request logging
const httpLogger = (req, res, next) => {
    const startTime = Date.now();
    // Log request
    logger.debug(`Incoming ${req.method} ${req.originalUrl}`, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.requestId,
    });
    // Capture response
    const originalSend = res.send;
    res.send = function (data) {
        const responseTime = Date.now() - startTime;
        // Log response
        const loggerInstance = new Logger('HTTP');
        loggerInstance.logRequest(req, res, responseTime);
        // Call original send
        return originalSend.call(this, data);
    };
    next();
};
exports.httpLogger = httpLogger;
// Performance monitoring
class PerformanceMonitor {
    metrics = new Map();
    logger;
    constructor() {
        this.logger = new Logger('Performance');
        // Periodic metrics reporting
        if (process.env['NODE_ENV'] === 'production') {
            setInterval(() => this.reportMetrics(), 60000); // Every minute
        }
    }
    track(operation, duration) {
        if (!this.metrics.has(operation)) {
            this.metrics.set(operation, []);
        }
        const values = this.metrics.get(operation);
        values.push(duration);
        // Keep only last 1000 values
        if (values.length > 1000) {
            values.shift();
        }
    }
    reportMetrics() {
        const report = {};
        this.metrics.forEach((values, operation) => {
            if (values.length === 0)
                return;
            const sorted = [...values].sort((a, b) => a - b);
            report[operation] = {
                count: values.length,
                avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
                min: sorted[0],
                max: sorted[sorted.length - 1],
                p50: sorted[Math.floor(sorted.length * 0.5)],
                p95: sorted[Math.floor(sorted.length * 0.95)],
                p99: sorted[Math.floor(sorted.length * 0.99)],
            };
        });
        this.logger.info('Performance metrics', report);
        // Clear old metrics
        this.metrics.clear();
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
// Create singleton instances
exports.defaultLogger = new Logger();
exports.performanceMonitor = new PerformanceMonitor();
// Utility function to create logger with context
const createLogger = (context) => {
    return new Logger(context);
};
exports.createLogger = createLogger;
exports.default = exports.defaultLogger;
//# sourceMappingURL=logger-enhanced.service.js.map