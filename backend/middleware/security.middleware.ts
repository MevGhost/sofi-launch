import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit, { Options } from 'express-rate-limit';
import { createClient } from 'redis';

// Lazy load config to avoid initialization issues
const getSecurityConfig = () => {
  try {
    const { getConfig } = require('../config/env.schema');
    return getConfig();
  } catch {
    // Return defaults if env not loaded yet
    return {
      rateLimit: {
        windowMs: 60000,
        max: 100,
      },
      redis: {
        url: process.env.REDIS_URL
      }
    };
  }
};

const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * Production-ready security middleware configuration
 */

// Enhanced Helmet configuration for production
export const helmetConfig = helmet({
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
    },
  },
  crossOriginEmbedderPolicy: !isProduction(), // Disable in production if needed
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// Create Redis client for rate limiting if available
let redisClient: any = null;
if (getSecurityConfig().redis?.url) {
  redisClient = createClient({
    url: getSecurityConfig().redis.url,
  });
  
  redisClient.on('error', (err: Error) => {
    console.error('Redis client error:', err);
  });
  
  redisClient.connect().catch((err: Error) => {
    console.error('Failed to connect to Redis:', err);
    redisClient = null;
  });
}

// Rate limiter configuration
export const createRateLimiter = (options?: Partial<Options>) => {
  const config = getSecurityConfig();
  const baseOptions: Partial<Options> = {
    windowMs: config.rateLimit?.windowMs || 60000,
    max: config.rateLimit?.max || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later.',
      },
    },
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    },
    keyGenerator: (req: Request) => {
      // Use IP address as key, considering proxies
      return req.ip || req.socket.remoteAddress || 'unknown';
    },
  };

  // Use Redis store in production if available
  // Note: RedisStore implementation would require rate-limit-redis package
  // For now, using memory store even in production
  // TODO: Implement Redis store when rate-limit-redis is properly configured

  // Fallback to memory store
  return rateLimit({
    ...baseOptions,
    ...options,
  });
};

// Specific rate limiters for different endpoints
export const apiRateLimiter = createRateLimiter();

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMITED',
      message: 'Too many authentication attempts, please try again later.',
    },
  },
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: {
    success: false,
    error: {
      code: 'UPLOAD_RATE_LIMITED',
      message: 'Upload limit exceeded, please try again later.',
    },
  },
});

// XSS Protection
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize query parameters
  for (const key in req.query) {
    if (typeof req.query[key] === 'string') {
      req.query[key] = (req.query[key] as string).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
  }
  
  // Sanitize body if it's JSON
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  next();
};

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  
  return obj;
}

// SQL Injection Protection (additional layer beyond Prisma)
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/gi,
    /(--\s)|(\/\*.*\*\/)/g,  // More specific SQL comment patterns
    /(\bOR\b\s*\d+\s*=\s*\d+)/gi,
    /(\bAND\b\s*\d+\s*=\s*\d+)/gi,
  ];
  
  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      // Skip checks for hex addresses (Ethereum addresses)
      if (/^0x[a-fA-F0-9]{40}$/i.test(value)) {
        return false;
      }
      // Skip checks for Solana addresses (base58)
      if (/^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(value)) {
        return false;
      }
      // Skip checks for transaction hashes
      if (/^0x[a-fA-F0-9]{64}$/i.test(value)) {
        return false;
      }
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };
  
  // Check query parameters
  for (const key in req.query) {
    if (checkValue(req.query[key])) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid characters in request',
        },
      });
    }
  }
  
  // Check body parameters
  const checkBody = (obj: any): boolean => {
    if (checkValue(obj)) return true;
    
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (checkBody(obj[key])) return true;
      }
    }
    
    return false;
  };
  
  if (req.body && checkBody(req.body)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Invalid characters in request',
      },
    });
  }
  
  next();
};

// API Key validation for production
export const apiKeyValidation = (req: Request, res: Response, next: NextFunction) => {
  // Skip in development
  if (!isProduction()) {
    return next();
  }
  
  // Skip for public endpoints
  const publicPaths = ['/health', '/api/auth/nonce', '/api/tokens'];
  if (publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // Check for API key or JWT token
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];
  
  if (!apiKey && !authHeader) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_AUTH',
        message: 'Authentication required',
      },
    });
  }
  
  next();
};