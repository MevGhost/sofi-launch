import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../services/logger-enhanced.service';

const logger = createLogger('Security');

// Security configuration based on environment
interface SecurityConfig {
  cors: {
    origins: string[];
    credentials: boolean;
    maxAge: number;
  };
  rateLimit: {
    windowMs: number;
    max: number;
    standardHeaders: boolean;
    legacyHeaders: boolean;
  };
  helmet: {
    contentSecurityPolicy: boolean | any;
    hsts: {
      maxAge: number;
      includeSubDomains: boolean;
      preload: boolean;
    };
  };
}

const getSecurityConfig = (): SecurityConfig => {
  const env = process.env['NODE_ENV'] || 'development';
  
  switch (env) {
    case 'production':
      return {
        cors: {
          origins: (process.env['ALLOWED_ORIGINS'] || '').split(',').filter(Boolean),
          credentials: true,
          maxAge: 86400, // 24 hours
        },
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 100,
          standardHeaders: true,
          legacyHeaders: false,
        },
        helmet: {
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'none'"],
              upgradeInsecureRequests: [],
            },
          },
          hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          },
        },
      };
    
    case 'test':
      return {
        cors: {
          origins: ['http://localhost:3000', 'http://localhost:3001'],
          credentials: true,
          maxAge: 3600,
        },
        rateLimit: {
          windowMs: 1 * 60 * 1000,
          max: 1000,
          standardHeaders: false,
          legacyHeaders: false,
        },
        helmet: {
          contentSecurityPolicy: false,
          hsts: {
            maxAge: 0,
            includeSubDomains: false,
            preload: false,
          },
        },
      };
    
    default: // development
      return {
        cors: {
          origins: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
          credentials: true,
          maxAge: 3600,
        },
        rateLimit: {
          windowMs: 1 * 60 * 1000,
          max: 1000,
          standardHeaders: false,
          legacyHeaders: false,
        },
        helmet: {
          contentSecurityPolicy: false,
          hsts: {
            maxAge: 0,
            includeSubDomains: false,
            preload: false,
          },
        },
      };
  }
};

// Create Redis client for rate limiting (if available)
const createRedisClient = async () => {
  if (process.env['REDIS_URL'] && process.env['NODE_ENV'] === 'production') {
    try {
      const client = createClient({
        url: process.env['REDIS_URL'],
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis connection failed after 10 retries');
              return new Error('Redis connection failed');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });
      
      client.on('error', (err) => {
        logger.error('Redis client error', err);
      });
      
      client.on('connect', () => {
        logger.info('Redis connected for rate limiting');
      });
      
      await client.connect();
      return client;
    } catch (error) {
      logger.warn('Failed to connect to Redis, using memory store for rate limiting', error);
      return null;
    }
  }
  return null;
};

// CORS configuration
export const createCorsMiddleware = () => {
  const config = getSecurityConfig();
  
  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin && process.env['NODE_ENV'] === 'development') {
        return callback(null, true);
      }
      
      // Check if origin is allowed
      if (!origin || config.cors.origins.length === 0 || config.cors.origins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS blocked request', { origin, allowedOrigins: config.cors.origins });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: config.cors.credentials,
    maxAge: config.cors.maxAge,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Chain',
      'X-Chain-Type',
      'X-Request-Id',
      'X-API-Key',
    ],
    exposedHeaders: [
      'X-Request-Id',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
  });
};

// Helmet security headers
export const createHelmetMiddleware = () => {
  const config = getSecurityConfig();
  
  return helmet({
    contentSecurityPolicy: config.helmet.contentSecurityPolicy,
    hsts: config.helmet.hsts,
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'deny' },
    permittedCrossDomainPolicies: false,
    hidePoweredBy: true,
    dnsPrefetchControl: { allow: false },
    ieNoOpen: true,
    originAgentCluster: true,
    crossOriginEmbedderPolicy: process.env['NODE_ENV'] === 'production',
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  });
};

// Rate limiting configurations
export const createRateLimiters = async () => {
  const config = getSecurityConfig();
  const redisClient = await createRedisClient();
  
  // Create store (Redis or Memory)
  const createStore = () => {
    if (redisClient) {
      return new RedisStore({
        sendCommand: (...args: string[]) => (redisClient as any).sendCommand(args),
        prefix: 'rl:',
      });
    }
    return undefined; // Use default memory store
  };

  // General API rate limiter
  const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: config.rateLimit.standardHeaders,
    legacyHeaders: config.rateLimit.legacyHeaders,
    store: createStore(),
    message: 'Too many requests, please try again later.',
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests, please try again later.',
        },
      });
    },
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path.startsWith('/health/');
    },
  });

  // Strict rate limiter for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore(),
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true, // Don't count successful requests
  });

  // Moderate rate limiter for write operations
  const writeLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 write operations per minute
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore(),
    message: 'Too many write operations, please slow down.',
  });

  // Lenient rate limiter for read operations
  const readLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200, // 200 read operations per minute
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore(),
    message: 'Too many read operations, please slow down.',
  });

  // File upload rate limiter
  const uploadLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 uploads per 5 minutes
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore(),
    message: 'Too many file uploads, please try again later.',
  });

  return {
    api: apiLimiter,
    auth: authLimiter,
    write: writeLimiter,
    read: readLimiter,
    upload: uploadLimiter,
  };
};

// XSS Protection middleware
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  // Set additional XSS protection headers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Sanitize common injection points
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove script tags and event handlers
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
        .replace(/on\w+\s*=\s*'[^']*'/gi, '')
        .replace(/javascript:/gi, '');
    }
    return value;
  };
  
  // Sanitize query parameters
  for (const key in req.query) {
    req.query[key] = sanitizeValue(req.query[key]);
  }
  
  // Sanitize body (for non-file uploads)
  if (req.body && !req.is('multipart/form-data')) {
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          if (typeof obj[key] === 'string') {
            obj[key] = sanitizeValue(obj[key]);
          } else if (typeof obj[key] === 'object') {
            obj[key] = sanitizeObject(obj[key]);
          }
        }
      }
      return obj;
    };
    
    req.body = sanitizeObject(req.body);
  }
  
  next();
};

// SQL Injection Protection middleware
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(--|\||\/\*|\*\/|xp_|sp_|0x)/gi,
  ];
  
  const checkForSQLInjection = (value: any): boolean => {
    if (typeof value === 'string') {
      for (const pattern of sqlPatterns) {
        if (pattern.test(value)) {
          return true;
        }
      }
    }
    return false;
  };
  
  // Check all input sources
  const checkObject = (obj: any, source: string): boolean => {
    for (const key in obj) {
      const value = obj[key];
      if (checkForSQLInjection(value)) {
        logger.warn('Potential SQL injection attempt', {
          source,
          key,
          ip: req.ip,
          path: req.path,
          method: req.method,
        });
        return true;
      }
      if (typeof value === 'object' && value !== null) {
        if (checkObject(value, `${source}.${key}`)) {
          return true;
        }
      }
    }
    return false;
  };
  
  // Check query, params, and body
  if (
    checkObject(req.query, 'query') ||
    checkObject(req.params, 'params') ||
    (req.body && checkObject(req.body, 'body'))
  ) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Invalid characters detected in request',
      },
    });
    return;
  }
  
  next();
};

// IP-based blocking middleware
const blockedIPs = new Set<string>();
const ipAttempts = new Map<string, number>();

export const ipBlocking = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  
  // Check if IP is blocked
  if (blockedIPs.has(ip)) {
    logger.warn('Blocked IP attempted access', { ip, path: req.path });
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied',
      },
    });
    return;
  }
  
  // Track failed attempts (this should be called from auth failures)
  const attempts = ipAttempts.get(ip) || 0;
  if (attempts > 10) {
    blockedIPs.add(ip);
    logger.warn('IP blocked due to excessive failures', { ip });
    
    // Auto-unblock after 1 hour
    setTimeout(() => {
      blockedIPs.delete(ip);
      ipAttempts.delete(ip);
      logger.info('IP unblocked', { ip });
    }, 3600000);
    
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Too many failed attempts. Access blocked.',
      },
    });
    return;
  }
  
  next();
};

export const trackFailedAttempt = (ip: string) => {
  const attempts = ipAttempts.get(ip) || 0;
  ipAttempts.set(ip, attempts + 1);
  
  // Clear attempts after 15 minutes
  setTimeout(() => {
    const currentAttempts = ipAttempts.get(ip) || 0;
    if (currentAttempts > 0) {
      ipAttempts.set(ip, currentAttempts - 1);
    }
  }, 900000);
};

// Security headers for API responses
export const apiSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent caching of sensitive data
  if (req.path.includes('/api/auth') || req.path.includes('/api/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  
  // Add security headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

// Combined security middleware
export const createSecurityMiddleware = async () => {
  const rateLimiters = await createRateLimiters();
  
  return {
    cors: createCorsMiddleware(),
    helmet: createHelmetMiddleware(),
    rateLimiters,
    xssProtection,
    sqlInjectionProtection,
    ipBlocking,
    apiSecurityHeaders,
  };
};

export default createSecurityMiddleware;