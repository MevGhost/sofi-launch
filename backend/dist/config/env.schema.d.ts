import { z } from 'zod';
/**
 * Environment variable schema for validation
 * Ensures all required environment variables are present and valid
 */
export declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    PORT: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    BASE_URL: z.ZodDefault<z.ZodString>;
    DATABASE_URL: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    JWT_SECRET: z.ZodDefault<z.ZodString>;
    JWT_EXPIRES_IN: z.ZodDefault<z.ZodString>;
    ALLOWED_ORIGINS: z.ZodDefault<z.ZodString>;
    BASE_RPC_URL: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    BASE_SEPOLIA_RPC_URL: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    PRIVATE_KEY: z.ZodOptional<z.ZodString>;
    TOKEN_FACTORY_ADDRESS: z.ZodOptional<z.ZodString>;
    BONDING_CURVE_ADDRESS: z.ZodOptional<z.ZodString>;
    GRADUATION_MANAGER_ADDRESS: z.ZodOptional<z.ZodString>;
    ESCROW_FACTORY_ADDRESS: z.ZodOptional<z.ZodString>;
    TREASURY_ADDRESS: z.ZodOptional<z.ZodString>;
    RATE_LIMIT_WINDOW_MS: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    RATE_LIMIT_MAX_REQUESTS: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    MAX_FILE_SIZE: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    UPLOAD_PATH: z.ZodDefault<z.ZodString>;
    SENTRY_DSN: z.ZodOptional<z.ZodString>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug"]>>;
    ENCRYPTION_KEY: z.ZodOptional<z.ZodString>;
    ADMIN_ADDRESSES: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    BASE_SEPOLIA_RPC_URL?: string;
    PRIVATE_KEY?: string;
    BASE_RPC_URL?: string;
    NODE_ENV?: "development" | "production" | "test";
    PORT?: number;
    BASE_URL?: string;
    DATABASE_URL?: string;
    REDIS_URL?: string;
    JWT_SECRET?: string;
    JWT_EXPIRES_IN?: string;
    ALLOWED_ORIGINS?: string;
    TOKEN_FACTORY_ADDRESS?: string;
    BONDING_CURVE_ADDRESS?: string;
    GRADUATION_MANAGER_ADDRESS?: string;
    ESCROW_FACTORY_ADDRESS?: string;
    TREASURY_ADDRESS?: string;
    RATE_LIMIT_WINDOW_MS?: number;
    RATE_LIMIT_MAX_REQUESTS?: number;
    MAX_FILE_SIZE?: number;
    UPLOAD_PATH?: string;
    SENTRY_DSN?: string;
    LOG_LEVEL?: "error" | "warn" | "info" | "debug";
    ENCRYPTION_KEY?: string;
    ADMIN_ADDRESSES?: string;
}, {
    BASE_SEPOLIA_RPC_URL?: string;
    PRIVATE_KEY?: string;
    BASE_RPC_URL?: string;
    NODE_ENV?: "development" | "production" | "test";
    PORT?: string;
    BASE_URL?: string;
    DATABASE_URL?: string;
    REDIS_URL?: string;
    JWT_SECRET?: string;
    JWT_EXPIRES_IN?: string;
    ALLOWED_ORIGINS?: string;
    TOKEN_FACTORY_ADDRESS?: string;
    BONDING_CURVE_ADDRESS?: string;
    GRADUATION_MANAGER_ADDRESS?: string;
    ESCROW_FACTORY_ADDRESS?: string;
    TREASURY_ADDRESS?: string;
    RATE_LIMIT_WINDOW_MS?: string;
    RATE_LIMIT_MAX_REQUESTS?: string;
    MAX_FILE_SIZE?: string;
    UPLOAD_PATH?: string;
    SENTRY_DSN?: string;
    LOG_LEVEL?: "error" | "warn" | "info" | "debug";
    ENCRYPTION_KEY?: string;
    ADMIN_ADDRESSES?: string;
}>;
export type EnvConfig = z.infer<typeof envSchema>;
/**
 * Validates and parses environment variables
 * Throws an error if validation fails
 */
export declare function validateEnv(): EnvConfig;
export declare function getConfig(): EnvConfig;
/**
 * Check if running in production
 */
export declare function isProduction(): boolean;
/**
 * Check if running in development
 */
export declare function isDevelopment(): boolean;
/**
 * Get sanitized config for logging (removes sensitive data)
 */
export declare function getSanitizedConfig(): Partial<EnvConfig>;
//# sourceMappingURL=env.schema.d.ts.map