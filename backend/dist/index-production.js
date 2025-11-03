"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const ws_1 = require("ws");
const cluster_1 = __importDefault(require("cluster"));
const os_1 = __importDefault(require("os"));
// Load environment variables first
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
// Import configurations and services
const env_schema_1 = require("./config/env.schema");
const database_config_1 = require("./config/database.config");
const security_config_1 = require("./config/security.config");
const logger_enhanced_service_1 = require("./services/logger-enhanced.service");
const websocket_enhanced_service_1 = require("./services/websocket-enhanced.service");
const monitoring_service_1 = require("./services/monitoring.service");
const errorHandler_1 = require("./middleware/errorHandler");
const requestId_middleware_1 = require("./middleware/requestId.middleware");
const chain_middleware_1 = require("./middleware/chain.middleware");
// Import routes
const escrow_routes_1 = __importDefault(require("./routes/escrow.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const kol_routes_1 = __importDefault(require("./routes/kol.routes"));
const verifier_routes_1 = __importDefault(require("./routes/verifier.routes"));
const metadata_routes_1 = __importDefault(require("./routes/metadata.routes"));
const token_routes_1 = __importDefault(require("./routes/token.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const portfolio_routes_1 = __importDefault(require("./routes/portfolio.routes"));
const stats_routes_1 = __importDefault(require("./routes/stats.routes"));
const health_routes_1 = __importDefault(require("./routes/health.routes"));
const logger = (0, logger_enhanced_service_1.createLogger)('Server');
// Add BigInt serialization support
BigInt.prototype.toJSON = function () {
    return this.toString();
};
// Cluster setup for production
if (cluster_1.default.isPrimary && process.env['NODE_ENV'] === 'production') {
    const numCPUs = process.env['WORKER_COUNT']
        ? parseInt(process.env['WORKER_COUNT'])
        : Math.min(os_1.default.cpus().length, 4); // Max 4 workers
    logger.info(`Master process ${process.pid} starting ${numCPUs} workers...`);
    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        cluster_1.default.fork();
    }
    // Handle worker deaths
    cluster_1.default.on('exit', (worker, code, signal) => {
        logger.error(`Worker ${worker.process.pid} died`, { code, signal });
        // Restart worker after a delay
        setTimeout(() => {
            logger.info('Starting new worker...');
            cluster_1.default.fork();
        }, 1000);
    });
    // Graceful shutdown for master
    process.on('SIGTERM', () => {
        logger.info('Master received SIGTERM, shutting down workers...');
        for (const id in cluster_1.default.workers) {
            cluster_1.default.workers[id]?.kill('SIGTERM');
        }
    });
}
else {
    // Worker process or non-clustered mode
    startServer();
}
async function startServer() {
    try {
        // Validate environment variables
        (0, env_schema_1.validateEnv)();
        logger.info('Environment variables validated successfully', {
            environment: process.env['NODE_ENV'],
            worker: cluster_1.default.worker?.id || 'single',
        });
        const app = (0, express_1.default)();
        const server = (0, http_1.createServer)(app);
        // WebSocket only on first worker or single mode
        let wss;
        if (!cluster_1.default.worker || cluster_1.default.worker.id === 1) {
            wss = new ws_1.WebSocketServer({ server });
            (0, websocket_enhanced_service_1.setupWebSocket)(wss);
            logger.info('WebSocket server initialized');
        }
        // Trust proxy settings for production
        app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
        // Get security middleware
        const security = await (0, security_config_1.createSecurityMiddleware)();
        // Apply security middleware
        app.use(security.helmet);
        app.use(security.cors);
        app.use((0, compression_1.default)());
        app.use(express_1.default.json({ limit: '10mb' }));
        app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        // Request tracking and logging
        app.use(requestId_middleware_1.requestIdMiddleware);
        app.use(logger_enhanced_service_1.httpLogger);
        app.use(monitoring_service_1.requestMonitoring);
        // Production logging with Morgan
        if (process.env['NODE_ENV'] === 'production') {
            app.use((0, morgan_1.default)('combined', {
                skip: (req) => req.path === '/health' || req.path === '/health/live',
                stream: {
                    write: (message) => logger.info(message.trim()),
                },
            }));
        }
        // Security middleware
        app.use(security.xssProtection);
        app.use(security.sqlInjectionProtection);
        app.use(security.ipBlocking);
        app.use(security.apiSecurityHeaders);
        // Global rate limiting
        app.use('/api/', security.rateLimiters.api);
        // Chain middleware
        app.use(chain_middleware_1.extractChainInfo);
        app.use(chain_middleware_1.attachChainToResponse);
        // Health check routes (before auth)
        app.use('/health', health_routes_1.default);
        // Prometheus metrics endpoint
        app.get('/metrics', async (req, res) => {
            try {
                const metrics = await monitoring_service_1.monitoringService.getPrometheusMetrics();
                res.set('Content-Type', 'text/plain');
                res.send(metrics);
            }
            catch (error) {
                logger.error('Failed to generate metrics', error);
                res.status(500).send('Error generating metrics');
            }
        });
        // Serve static files for uploads
        app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads'), {
            maxAge: '7d',
            setHeaders: (res) => {
                res.set('X-Content-Type-Options', 'nosniff');
            },
        }));
        // API Routes with specific rate limiters
        app.use('/api/auth', security.rateLimiters.auth, auth_routes_1.default);
        app.use('/api/escrows', security.rateLimiters.write, escrow_routes_1.default);
        app.use('/api/admin', security.rateLimiters.write, admin_routes_1.default);
        app.use('/api/kol', security.rateLimiters.read, kol_routes_1.default);
        app.use('/api/verifier', security.rateLimiters.write, verifier_routes_1.default);
        app.use('/api/metadata', security.rateLimiters.read, metadata_routes_1.default);
        app.use('/api/tokens', security.rateLimiters.read, token_routes_1.default);
        app.use('/api/upload', security.rateLimiters.upload, upload_routes_1.default);
        app.use('/api/portfolio', security.rateLimiters.read, portfolio_routes_1.default);
        app.use('/api/stats', security.rateLimiters.read, stats_routes_1.default);
        // 404 handler
        app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'The requested resource was not found',
                },
            });
        });
        // Error handling
        app.use(errorHandler_1.errorHandler);
        // Connect to database
        await database_config_1.databaseConnection.connect();
        // Start server
        const PORT = process.env['PORT'] || 4000;
        server.listen(PORT, () => {
            logger.info('🚀 Server started successfully', {
                port: PORT,
                environment: process.env['NODE_ENV'],
                worker: cluster_1.default.worker?.id || 'single',
                pid: process.pid,
            });
            // Send ready signal for PM2
            if (process.send) {
                process.send('ready');
            }
        });
        // Graceful shutdown handling
        const gracefulShutdown = async (signal) => {
            logger.info(`${signal} received: starting graceful shutdown`, {
                worker: cluster_1.default.worker?.id || 'single',
            });
            // Stop accepting new connections
            server.close(async () => {
                logger.info('HTTP server closed');
                try {
                    // Close database connections
                    await database_config_1.databaseConnection.disconnect();
                    logger.info('Database connections closed');
                    // Close WebSocket connections
                    if (wss) {
                        wss.clients.forEach(client => client.close());
                        wss.close(() => {
                            logger.info('WebSocket server closed');
                        });
                    }
                    logger.info('Graceful shutdown completed');
                    process.exit(0);
                }
                catch (error) {
                    logger.error('Error during shutdown', error);
                    process.exit(1);
                }
            });
            // Force shutdown after 30 seconds
            setTimeout(() => {
                logger.error('Forcing shutdown after timeout');
                process.exit(1);
            }, 30000);
        };
        // Handle termination signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        // Handle uncaught errors
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception', error);
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection', { reason, promise });
            gracefulShutdown('UNHANDLED_REJECTION');
        });
    }
    catch (error) {
        logger.error('Failed to start server', error);
        process.exit(1);
    }
}
exports.default = {};
//# sourceMappingURL=index-production.js.map