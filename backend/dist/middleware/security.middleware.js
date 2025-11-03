"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyValidation = exports.sqlInjectionProtection = exports.xssProtection = exports.uploadRateLimiter = exports.authRateLimiter = exports.apiRateLimiter = exports.createRateLimiter = exports.helmetConfig = void 0;
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const redis_1 = require("redis");
// Lazy load config to avoid initialization issues
const getSecurityConfig = () => {
    try {
        const { getConfig } = require('../config/env.schema');
        return getConfig();
    }
    catch {
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
exports.helmetConfig = (0, helmet_1.default)({
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
let redisClient = null;
if (getSecurityConfig().redis?.url) {
    redisClient = (0, redis_1.createClient)({
        url: getSecurityConfig().redis.url,
    });
    redisClient.on('error', (err) => {
        console.error('Redis client error:', err);
    });
    redisClient.connect().catch((err) => {
        console.error('Failed to connect to Redis:', err);
        redisClient = null;
    });
}
// Rate limiter configuration
const createRateLimiter = (options) => {
    const config = getSecurityConfig();
    const baseOptions = {
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
        skip: (req) => {
            // Skip rate limiting for health checks
            return req.path === '/health';
        },
        keyGenerator: (req) => {
            // Use IP address as key, considering proxies
            return req.ip || req.socket.remoteAddress || 'unknown';
        },
    };
    // Use Redis store in production if available
    // Note: RedisStore implementation would require rate-limit-redis package
    // For now, using memory store even in production
    // TODO: Implement Redis store when rate-limit-redis is properly configured
    // Fallback to memory store
    return (0, express_rate_limit_1.default)({
        ...baseOptions,
        ...options,
    });
};
exports.createRateLimiter = createRateLimiter;
// Specific rate limiters for different endpoints
exports.apiRateLimiter = (0, exports.createRateLimiter)();
exports.authRateLimiter = (0, exports.createRateLimiter)({
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
exports.uploadRateLimiter = (0, exports.createRateLimiter)({
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
const xssProtection = (req, res, next) => {
    // Sanitize query parameters
    for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
            req.query[key] = req.query[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        }
    }
    // Sanitize body if it's JSON
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    next();
};
exports.xssProtection = xssProtection;
function sanitizeObject(obj) {
    if (typeof obj === 'string') {
        return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
            sanitized[key] = sanitizeObject(obj[key]);
        }
        return sanitized;
    }
    return obj;
}
// SQL Injection Protection (additional layer beyond Prisma)
const sqlInjectionProtection = (req, res, next) => {
    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/gi,
        /(--\s)|(\/\*.*\*\/)/g, // More specific SQL comment patterns
        /(\bOR\b\s*\d+\s*=\s*\d+)/gi,
        /(\bAND\b\s*\d+\s*=\s*\d+)/gi,
    ];
    const checkValue = (value) => {
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
    const checkBody = (obj) => {
        if (checkValue(obj))
            return true;
        if (obj && typeof obj === 'object') {
            for (const key in obj) {
                if (checkBody(obj[key]))
                    return true;
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
exports.sqlInjectionProtection = sqlInjectionProtection;
// API Key validation for production
const apiKeyValidation = (req, res, next) => {
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
exports.apiKeyValidation = apiKeyValidation;
//# sourceMappingURL=security.middleware.js.map