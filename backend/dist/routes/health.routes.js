"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_service_1 = require("../services/database.service");
const os_1 = __importDefault(require("os"));
const env_schema_1 = require("../config/env.schema");
const router = (0, express_1.Router)();
const startTime = Date.now();
/**
 * Basic health check endpoint
 * Used by load balancers and monitoring tools
 */
router.get('/', async (_req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
    });
});
/**
 * Detailed health check with component status
 * Protected endpoint for internal monitoring
 */
router.get('/detailed', async (req, res) => {
    // Simple auth check for production
    const authKey = req.headers['x-health-key'];
    if (process.env['NODE_ENV'] === 'production' && authKey !== process.env['HEALTH_CHECK_KEY']) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
        environment: process.env['NODE_ENV'],
        version: process.env['npm_package_version'] || '1.0.0',
        components: {},
        system: {},
    };
    // Check database connection
    try {
        const dbHealthy = await database_service_1.db.healthCheck();
        health.components.database = {
            status: dbHealthy ? 'healthy' : 'unhealthy',
        };
    }
    catch (error) {
        health.components.database = {
            status: 'unhealthy',
            error: error.message,
        };
        health.status = 'degraded';
    }
    // Check Redis connection if configured
    const config = (0, env_schema_1.getConfig)();
    if (config.REDIS_URL) {
        try {
            // Redis health check would go here
            health.components.redis = {
                status: 'healthy',
            };
        }
        catch (error) {
            health.components.redis = {
                status: 'unhealthy',
                error: error.message,
            };
            health.status = 'degraded';
        }
    }
    // System metrics
    health.system = {
        memory: {
            total: Math.round(os_1.default.totalmem() / 1024 / 1024),
            free: Math.round(os_1.default.freemem() / 1024 / 1024),
            used: Math.round((os_1.default.totalmem() - os_1.default.freemem()) / 1024 / 1024),
            percentage: Math.round(((os_1.default.totalmem() - os_1.default.freemem()) / os_1.default.totalmem()) * 100),
        },
        cpu: {
            cores: os_1.default.cpus().length,
            loadAverage: os_1.default.loadavg(),
        },
        process: {
            pid: process.pid,
            memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            uptime: process.uptime(),
        },
    };
    // Set appropriate status code
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
});
/**
 * Readiness check for Kubernetes/container orchestration
 * Indicates if the service is ready to accept traffic
 */
router.get('/ready', async (_req, res) => {
    try {
        // Check if database is connected
        const dbHealthy = await database_service_1.db.healthCheck();
        if (!dbHealthy) {
            return res.status(503).json({
                ready: false,
                reason: 'Database not connected',
            });
        }
        // All checks passed
        res.status(200).json({
            ready: true,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(503).json({
            ready: false,
            reason: error.message,
        });
    }
});
/**
 * Liveness check for Kubernetes/container orchestration
 * Indicates if the service should be restarted
 */
router.get('/live', (_req, res) => {
    // Simple check - if the server can respond, it's alive
    res.status(200).json({
        alive: true,
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
//# sourceMappingURL=health.routes.js.map