"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envSchema = void 0;
exports.validateEnv = validateEnv;
exports.getConfig = getConfig;
exports.isProduction = isProduction;
exports.isDevelopment = isDevelopment;
exports.getSanitizedConfig = getSanitizedConfig;
const zod_1 = require("zod");
/**
 * Environment variable schema for validation
 * Ensures all required environment variables are present and valid
 */
// Define the environment schema
exports.envSchema = zod_1.z.object({
    // Server Configuration
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().transform(Number).default('4000'),
    BASE_URL: zod_1.z.string().url().default('http://localhost:4000'),
    // Database
    // Default to local Postgres from docker-compose in development
    DATABASE_URL: zod_1.z
        .string()
        .min(1, 'DATABASE_URL is required')
        .optional()
        .default('postgresql://s4labs:dev_password_change_in_prod@localhost:5432/s4labs_dev?schema=public'),
    // Redis (optional in development)
    REDIS_URL: zod_1.z.string().optional(),
    // Authentication
    JWT_SECRET: zod_1.z
        .string()
        .min(32, 'JWT_SECRET must be at least 32 characters')
        .default('dev_jwt_secret_please_change_locally_32_chars_min________'),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    // CORS
    ALLOWED_ORIGINS: zod_1.z.string().default('http://localhost:3000,http://localhost:3001'),
    // Blockchain
    BASE_RPC_URL: zod_1.z.string().url().optional().default('https://mainnet.base.org'),
    BASE_SEPOLIA_RPC_URL: zod_1.z.string().url().optional().default('https://base-sepolia.drpc.org'),
    PRIVATE_KEY: zod_1.z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid private key format').optional(),
    // Smart Contracts
    TOKEN_FACTORY_ADDRESS: zod_1.z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
    BONDING_CURVE_ADDRESS: zod_1.z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
    GRADUATION_MANAGER_ADDRESS: zod_1.z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
    ESCROW_FACTORY_ADDRESS: zod_1.z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
    TREASURY_ADDRESS: zod_1.z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().transform(Number).default('900000'),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().transform(Number).default('100'),
    // File Upload
    MAX_FILE_SIZE: zod_1.z.string().transform(Number).default('5242880'),
    UPLOAD_PATH: zod_1.z.string().default('./uploads'),
    // Monitoring (optional)
    SENTRY_DSN: zod_1.z.string().url().optional(),
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    // Security
    ENCRYPTION_KEY: zod_1.z.string().min(32).optional(),
    ADMIN_ADDRESSES: zod_1.z.string().optional(), // Comma-separated list
});
/**
 * Validates and parses environment variables
 * Throws an error if validation fails
 */
function validateEnv() {
    try {
        const config = exports.envSchema.parse(process.env);
        // Additional production checks
        if (config.NODE_ENV === 'production') {
            // Ensure critical production variables are set
            if (!config.REDIS_URL) {
                throw new Error('REDIS_URL is required in production');
            }
            if (!config.PRIVATE_KEY) {
                throw new Error('PRIVATE_KEY is required in production');
            }
            if (!config.TOKEN_FACTORY_ADDRESS || !config.BONDING_CURVE_ADDRESS) {
                throw new Error('Smart contract addresses are required in production');
            }
            if (!config.SENTRY_DSN) {
                console.warn('⚠️ SENTRY_DSN is not set - error tracking disabled');
            }
            if (config.JWT_SECRET === 'your-super-secret-jwt-key-change-this') {
                throw new Error('Default JWT_SECRET detected in production - please change it');
            }
        }
        return config;
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const errorMessage = error.errors
                .map(e => `${e.path.join('.')}: ${e.message}`)
                .join('\n');
            throw new Error(`Environment validation failed:\n${errorMessage}`);
        }
        throw error;
    }
}
/**
 * Get a typed config object
 * Cached after first call
 */
let cachedConfig = null;
function getConfig() {
    if (!cachedConfig) {
        cachedConfig = validateEnv();
    }
    return cachedConfig;
}
/**
 * Check if running in production
 */
function isProduction() {
    return getConfig().NODE_ENV === 'production';
}
/**
 * Check if running in development
 */
function isDevelopment() {
    return getConfig().NODE_ENV === 'development';
}
/**
 * Get sanitized config for logging (removes sensitive data)
 */
function getSanitizedConfig() {
    const config = getConfig();
    const { JWT_SECRET, PRIVATE_KEY, DATABASE_URL, REDIS_URL, SENTRY_DSN, ENCRYPTION_KEY, ...sanitized } = config;
    return {
        ...sanitized,
        DATABASE_URL: DATABASE_URL ? '***' : undefined,
        REDIS_URL: REDIS_URL ? '***' : undefined,
        JWT_SECRET: '***',
        PRIVATE_KEY: PRIVATE_KEY ? '***' : undefined,
        SENTRY_DSN: SENTRY_DSN ? '***' : undefined,
        ENCRYPTION_KEY: ENCRYPTION_KEY ? '***' : undefined,
    };
}
//# sourceMappingURL=env.schema.js.map