"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConnection = exports.DatabaseConnection = void 0;
const prisma_1 = require("../generated/prisma");
const logger_enhanced_service_1 = require("../services/logger-enhanced.service");
const logger = (0, logger_enhanced_service_1.createLogger)('Database');
const getDatabaseConfig = () => {
    const env = process.env['NODE_ENV'] || 'development';
    switch (env) {
        case 'production':
            return {
                connectionLimit: parseInt(process.env['DB_POOL_SIZE'] || '20'),
                connectionTimeoutMillis: 5000,
                idleTimeoutMillis: 10000,
                maxRetries: 5,
                retryDelay: 1000,
                slowQueryThreshold: 1000,
                enableQueryLogging: false,
                enableSlowQueryWarning: true,
            };
        case 'test':
            return {
                connectionLimit: 5,
                connectionTimeoutMillis: 3000,
                idleTimeoutMillis: 5000,
                maxRetries: 2,
                retryDelay: 500,
                slowQueryThreshold: 500,
                enableQueryLogging: false,
                enableSlowQueryWarning: false,
            };
        default: // development
            return {
                connectionLimit: 10,
                connectionTimeoutMillis: 3000,
                idleTimeoutMillis: 10000,
                maxRetries: 3,
                retryDelay: 1000,
                slowQueryThreshold: 500,
                enableQueryLogging: true,
                enableSlowQueryWarning: true,
            };
    }
};
// Enhanced Prisma client with connection pooling and monitoring
class DatabaseConnection {
    prisma;
    config;
    isConnected = false;
    connectionRetries = 0;
    queryMetrics = new Map();
    healthCheckInterval;
    constructor() {
        this.config = getDatabaseConfig();
        // Configure Prisma with connection pool settings
        this.prisma = new prisma_1.PrismaClient({
            log: this.config.enableQueryLogging
                ? [
                    { level: 'query', emit: 'event' },
                    { level: 'info', emit: 'event' },
                    { level: 'warn', emit: 'event' },
                    { level: 'error', emit: 'event' },
                ]
                : [
                    { level: 'warn', emit: 'event' },
                    { level: 'error', emit: 'event' },
                ],
            errorFormat: process.env['NODE_ENV'] === 'production' ? 'minimal' : 'pretty',
            datasources: {
                db: {
                    url: this.getConnectionUrl(),
                },
            },
        });
        this.setupEventListeners();
        this.setupQueryMonitoring();
    }
    getConnectionUrl() {
        const baseUrl = process.env['DATABASE_URL'];
        if (!baseUrl) {
            throw new Error('DATABASE_URL environment variable is not set');
        }
        // Add connection pool parameters to the URL
        const url = new URL(baseUrl);
        url.searchParams.set('connection_limit', this.config.connectionLimit.toString());
        url.searchParams.set('connect_timeout', (this.config.connectionTimeoutMillis / 1000).toString());
        url.searchParams.set('pool_timeout', (this.config.idleTimeoutMillis / 1000).toString());
        // PostgreSQL specific optimizations
        url.searchParams.set('statement_cache_size', '100');
        url.searchParams.set('pgbouncer', 'true');
        return url.toString();
    }
    setupEventListeners() {
        // Query event logging
        if (this.config.enableQueryLogging) {
            this.prisma.$on('query', (e) => {
                const duration = e.duration;
                // Track query metrics
                this.trackQueryMetric(e.query, duration);
                // Log slow queries
                if (this.config.enableSlowQueryWarning && duration > this.config.slowQueryThreshold) {
                    logger.warn('Slow query detected', {
                        query: e.query,
                        duration: `${duration}ms`,
                        params: e.params,
                        target: e.target,
                    });
                }
                else {
                    logger.debug('Database query', {
                        query: e.query.substring(0, 100),
                        duration: `${duration}ms`,
                    });
                }
            });
        }
        // Error logging
        this.prisma.$on('error', (e) => {
            logger.error('Database error', e);
        });
        // Warning logging
        this.prisma.$on('warn', (e) => {
            logger.warn('Database warning', { message: e.message });
        });
        // Info logging
        this.prisma.$on('info', (e) => {
            logger.info('Database info', { message: e.message });
        });
    }
    setupQueryMonitoring() {
        // Note: $use middleware was deprecated in Prisma 5+
        // For production, consider using Prisma Accelerate or custom logging
        // This is a placeholder for monitoring setup
        logger.info('Query monitoring initialized');
    }
    trackQueryMetric(query, duration) {
        // Extract operation type from query
        const operation = query.split(' ')[0].toUpperCase();
        if (!this.queryMetrics.has(operation)) {
            this.queryMetrics.set(operation, []);
        }
        const metrics = this.queryMetrics.get(operation);
        metrics.push(duration);
        // Keep only last 100 metrics per operation
        if (metrics.length > 100) {
            metrics.shift();
        }
    }
    async connect() {
        try {
            logger.info('Connecting to database...');
            await this.prisma.$connect();
            // Test the connection
            await this.prisma.$queryRaw `SELECT 1`;
            this.isConnected = true;
            this.connectionRetries = 0;
            logger.info('Database connected successfully', {
                connectionLimit: this.config.connectionLimit,
                environment: process.env['NODE_ENV'],
            });
            // Start health check monitoring
            this.startHealthCheck();
        }
        catch (error) {
            logger.error('Database connection failed', error);
            // Retry connection with exponential backoff
            if (this.connectionRetries < this.config.maxRetries) {
                this.connectionRetries++;
                const delay = Math.min(this.config.retryDelay * Math.pow(2, this.connectionRetries - 1), 30000);
                logger.info(`Retrying database connection in ${delay}ms`, {
                    attempt: this.connectionRetries,
                    maxRetries: this.config.maxRetries,
                });
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.connect();
            }
            throw new Error(`Failed to connect to database after ${this.config.maxRetries} attempts`);
        }
    }
    async disconnect() {
        try {
            // Stop health check
            if (this.healthCheckInterval) {
                clearInterval(this.healthCheckInterval);
            }
            await this.prisma.$disconnect();
            this.isConnected = false;
            logger.info('Database disconnected successfully');
        }
        catch (error) {
            logger.error('Error disconnecting from database', error);
            // Force disconnect
            await this.prisma.$disconnect();
        }
    }
    startHealthCheck() {
        // Periodic health check in production
        if (process.env['NODE_ENV'] === 'production') {
            this.healthCheckInterval = setInterval(async () => {
                try {
                    const start = Date.now();
                    await this.prisma.$queryRaw `SELECT 1`;
                    const duration = Date.now() - start;
                    if (duration > 1000) {
                        logger.warn('Database health check slow', { duration: `${duration}ms` });
                    }
                }
                catch (error) {
                    logger.error('Database health check failed', error);
                    // Attempt to reconnect
                    try {
                        await this.connect();
                    }
                    catch (reconnectError) {
                        logger.error('Failed to reconnect to database', reconnectError);
                    }
                }
            }, 30000); // Every 30 seconds
        }
    }
    async healthCheck() {
        try {
            const start = Date.now();
            await this.prisma.$queryRaw `SELECT 1`;
            const latency = Date.now() - start;
            // Get query metrics
            const metrics = {};
            this.queryMetrics.forEach((values, operation) => {
                if (values.length > 0) {
                    const sorted = [...values].sort((a, b) => a - b);
                    metrics[operation] = {
                        count: values.length,
                        avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
                        p95: sorted[Math.floor(sorted.length * 0.95)],
                    };
                }
            });
            return {
                status: 'healthy',
                latency,
                metrics,
            };
        }
        catch (error) {
            logger.error('Health check failed', error);
            return {
                status: 'unhealthy',
                latency: -1,
            };
        }
    }
    async executeTransaction(fn, options) {
        const maxRetries = options?.maxRetries || 3;
        const timeout = options?.timeout || 30000;
        const isolationLevel = options?.isolationLevel;
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const start = Date.now();
                const result = await this.prisma.$transaction(fn, {
                    maxWait: 5000,
                    timeout,
                    isolationLevel,
                });
                const duration = Date.now() - start;
                if (duration > 1000) {
                    logger.warn('Slow transaction', {
                        duration: `${duration}ms`,
                        attempt,
                    });
                }
                return result;
            }
            catch (error) {
                lastError = error;
                logger.warn('Transaction failed', {
                    attempt,
                    maxRetries,
                    errorCode: error.code,
                    errorMessage: error.message,
                });
                // Don't retry on certain errors
                if (error.code === 'P2002' || // Unique constraint
                    error.code === 'P2003' || // Foreign key constraint
                    error.code === 'P2025' // Record not found
                ) {
                    throw error;
                }
                // Retry with exponential backoff
                if (attempt < maxRetries) {
                    const delay = Math.min(100 * Math.pow(2, attempt - 1), 2000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        logger.error('Transaction failed after all retries', lastError);
        throw lastError;
    }
    getQueryMetrics() {
        const metrics = {};
        this.queryMetrics.forEach((values, operation) => {
            if (values.length > 0) {
                const sorted = [...values].sort((a, b) => a - b);
                metrics[operation] = {
                    count: values.length,
                    avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
                    min: sorted[0],
                    max: sorted[sorted.length - 1],
                    p50: sorted[Math.floor(sorted.length * 0.5)],
                    p95: sorted[Math.floor(sorted.length * 0.95)],
                    p99: sorted[Math.floor(sorted.length * 0.99)],
                };
            }
        });
        return metrics;
    }
    clearMetrics() {
        this.queryMetrics.clear();
    }
    get client() {
        return this.prisma;
    }
    get connected() {
        return this.isConnected;
    }
}
exports.DatabaseConnection = DatabaseConnection;
// Create singleton instance
exports.databaseConnection = new DatabaseConnection();
// Export for backward compatibility
exports.default = exports.databaseConnection;
//# sourceMappingURL=database.config.js.map