import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { Request } from 'express';

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

winston.addColors(colors);

// Get log level from environment
const getLogLevel = (): string => {
  const env = process.env['NODE_ENV'] || 'development';
  const level = process.env['LOG_LEVEL'];
  
  if (level) return level;
  
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
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const log: any = {
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
  })
);

// Custom format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      const sanitized = sanitizeLogData(meta);
      log += '\n' + JSON.stringify(sanitized, null, 2);
    }
    
    return log;
  })
);

// Sanitize sensitive data from logs
const sanitizeLogData = (data: any): any => {
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

  const sanitize = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Check if key contains sensitive data
      if (sensitive.some(s => lowerKey.includes(s.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  };

  return sanitize(data);
};

// Create transports
const createTransports = (): winston.transport[] => {
  const transports: winston.transport[] = [];
  const env = process.env['NODE_ENV'] || 'development';

  // Console transport
  transports.push(
    new winston.transports.Console({
      format: env === 'production' ? productionFormat : developmentFormat,
      level: getLogLevel(),
    })
  );

  // File transports for production
  if (env === 'production') {
    const logDir = process.env['LOG_DIR'] || path.join(process.cwd(), 'logs');

    // Error log file
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format: productionFormat,
        maxSize: '20m',
        maxFiles: '30d',
        zippedArchive: true,
      })
    );

    // Combined log file
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        format: productionFormat,
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true,
      })
    );

    // HTTP request log file
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'http-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'http',
        format: productionFormat,
        maxSize: '20m',
        maxFiles: '7d',
        zippedArchive: true,
      })
    );
  }

  return transports;
};

// Create logger instance
const logger = winston.createLogger({
  levels,
  level: getLogLevel(),
  transports: createTransports(),
  exitOnError: false,
  
  // Handle uncaught exceptions and rejections
  exceptionHandlers: process.env['NODE_ENV'] === 'production' ? [
    new DailyRotateFile({
      filename: path.join(process.env['LOG_DIR'] || './logs', 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true,
    }),
  ] : [],
  
  rejectionHandlers: process.env['NODE_ENV'] === 'production' ? [
    new DailyRotateFile({
      filename: path.join(process.env['LOG_DIR'] || './logs', 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true,
    }),
  ] : [],
});

// Logger methods with context
class Logger {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  private log(level: string, message: string, meta?: any) {
    const logData: any = {};
    
    if (this.context) {
      logData.context = this.context;
    }
    
    if (meta) {
      Object.assign(logData, meta);
    }

    logger.log(level, message, logData);
  }

  error(message: string, error?: Error | any, meta?: any) {
    const errorData: any = { ...meta };
    
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

  warn(message: string, meta?: any) {
    this.log('warn', message, meta);
  }

  info(message: string, meta?: any) {
    this.log('info', message, meta);
  }

  http(message: string, meta?: any) {
    this.log('http', message, meta);
  }

  debug(message: string, meta?: any) {
    this.log('debug', message, meta);
  }

  // Log HTTP requests
  logRequest(req: Request, res: any, responseTime: number) {
    const meta = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: (req as any).requestId,
      userId: (req as any).user?.userId,
    };

    // Choose log level based on status code
    if (res.statusCode >= 500) {
      this.error(`HTTP ${req.method} ${req.originalUrl}`, undefined, meta);
    } else if (res.statusCode >= 400) {
      this.warn(`HTTP ${req.method} ${req.originalUrl}`, meta);
    } else {
      this.http(`HTTP ${req.method} ${req.originalUrl}`, meta);
    }
  }

  // Log database queries
  logQuery(operation: string, model: string, duration: number, params?: any) {
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
    } else {
      this.debug(`Database query: ${operation} on ${model}`, meta);
    }
  }

  // Log WebSocket events
  logWebSocket(event: string, data?: any) {
    this.debug(`WebSocket event: ${event}`, {
      event,
      data: data ? sanitizeLogData(data) : undefined,
    });
  }

  // Log external API calls
  logAPICall(service: string, endpoint: string, method: string, statusCode: number, duration: number) {
    const meta = {
      service,
      endpoint,
      method,
      statusCode,
      duration: `${duration}ms`,
    };

    if (statusCode >= 400) {
      this.error(`External API error: ${service}`, undefined, meta);
    } else if (duration > 3000) {
      this.warn(`Slow external API call: ${service}`, meta);
    } else {
      this.info(`External API call: ${service}`, meta);
    }
  }

  // Create child logger with additional context
  child(context: string): Logger {
    const childContext = this.context ? `${this.context}:${context}` : context;
    return new Logger(childContext);
  }
}

// Express middleware for HTTP request logging
export const httpLogger = (req: Request, res: any, next: any) => {
  const startTime = Date.now();
  
  // Log request
  logger.debug(`Incoming ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: (req as any).requestId,
  });

  // Capture response
  const originalSend = res.send;
  res.send = function(data: any) {
    const responseTime = Date.now() - startTime;
    
    // Log response
    const loggerInstance = new Logger('HTTP');
    loggerInstance.logRequest(req, res, responseTime);
    
    // Call original send
    return originalSend.call(this, data);
  };

  next();
};

// Performance monitoring
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger('Performance');
    
    // Periodic metrics reporting
    if (process.env['NODE_ENV'] === 'production') {
      setInterval(() => this.reportMetrics(), 60000); // Every minute
    }
  }

  track(operation: string, duration: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const values = this.metrics.get(operation)!;
    values.push(duration);
    
    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift();
    }
  }

  reportMetrics() {
    const report: any = {};
    
    this.metrics.forEach((values, operation) => {
      if (values.length === 0) return;
      
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

// Create singleton instances
export const defaultLogger = new Logger();
export const performanceMonitor = new PerformanceMonitor();

// Utility function to create logger with context
export const createLogger = (context: string): Logger => {
  return new Logger(context);
};

// Export everything
export {
  Logger,
  logger as winstonLogger,
  sanitizeLogData,
  PerformanceMonitor,
};

export default defaultLogger;