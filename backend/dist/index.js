"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load environment variables FIRST
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const http_1 = require("http");
const ws_1 = require("ws");
const errorHandler_1 = require("./middleware/errorHandler");
const requestId_middleware_1 = require("./middleware/requestId.middleware");
const security_middleware_1 = require("./middleware/security.middleware");
const chain_middleware_1 = require("./middleware/chain.middleware");
const escrow_routes_1 = __importDefault(require("./routes/escrow.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const kol_routes_1 = __importDefault(require("./routes/kol.routes"));
// import notificationRoutes from './routes/notification.routes';
const verifier_routes_1 = __importDefault(require("./routes/verifier.routes"));
const metadata_routes_1 = __importDefault(require("./routes/metadata.routes"));
const token_routes_1 = __importDefault(require("./routes/token.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const portfolio_routes_1 = __importDefault(require("./routes/portfolio.routes"));
const stats_routes_1 = __importDefault(require("./routes/stats.routes"));
const health_routes_1 = __importDefault(require("./routes/health.routes"));
const websocket_service_1 = require("./services/websocket.service");
const env_schema_1 = require("./config/env.schema");
const database_service_1 = require("./services/database.service");
const token_sync_service_1 = require("./services/token-sync.service");
const event_listener_service_1 = require("./services/event-listener.service");
// Add BigInt serialization support
BigInt.prototype.toJSON = function () {
    return this.toString();
};
// Validate environment variables on startup
try {
    (0, env_schema_1.validateEnv)();
    console.log('✅ Environment variables validated successfully');
    if (process.env['NODE_ENV'] !== 'production') {
        console.log('Configuration:', (0, env_schema_1.getSanitizedConfig)());
    }
}
catch (error) {
    console.error('❌ Environment validation failed:', error);
    process.exit(1);
}
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const wss = new ws_1.WebSocketServer({ server });
// Trust proxy for accurate IP detection when behind reverse proxy (nginx, cloudflare, etc)
// Using specific trust proxy settings to avoid rate limiter bypass
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
// Security middleware
app.use(security_middleware_1.helmetConfig);
app.use((0, cors_1.default)({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Chain', 'X-Chain-Type', 'X-Request-Id'],
}));
// Request processing middleware
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Request tracking and logging
app.use(requestId_middleware_1.requestIdMiddleware);
app.use((0, morgan_1.default)('combined', {
    skip: (req) => req.path === '/health' || req.path === '/health/live',
}));
// Security middleware
app.use(security_middleware_1.xssProtection);
app.use(security_middleware_1.sqlInjectionProtection);
app.use(security_middleware_1.apiRateLimiter);
// Chain middleware - extract chain info from requests
app.use(chain_middleware_1.extractChainInfo);
app.use(chain_middleware_1.attachChainToResponse);
// Health check routes (before other routes for priority)
app.use('/health', health_routes_1.default);
// Serve static files for uploads with proper CORS headers
app.use('/uploads', (req, res, next) => {
    // Set CORS headers for static files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express_1.default.static(path_1.default.join(process.cwd(), 'uploads'), {
    setHeaders: (res, path) => {
        // Additional headers for images
        if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.gif') || path.endsWith('.webp')) {
            res.setHeader('Content-Type', 'image/' + path.split('.').pop());
            res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
    }
}));
// Basic CORS preflight handler
app.options('*', (0, cors_1.default)());
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/escrows', escrow_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/kol', kol_routes_1.default);
// app.use('/api/notifications', notificationRoutes);
app.use('/api/verifier', verifier_routes_1.default);
app.use('/api/metadata', metadata_routes_1.default);
app.use('/api/tokens', token_routes_1.default);
app.use('/api/upload', upload_routes_1.default);
app.use('/api/portfolio', portfolio_routes_1.default);
app.use('/api/stats', stats_routes_1.default);
// WebSocket setup
(0, websocket_service_1.setupWebSocket)(wss);
// Error handling
app.use(errorHandler_1.errorHandler);
// Server
// Default to 5001 to match frontend API_BASE_URL expectation
const PORT = process.env['PORT'] || 5001;
// Start server with database connection and graceful error handling
async function startServer() {
    try {
        // Connect to database with retry logic
        await database_service_1.db.connect();
        server.listen(PORT, () => {
            console.log('\n🚀 Server started successfully');
            console.log(`🌐 API: http://localhost:${PORT}`);
            console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
            console.log(`🎯 Environment: ${process.env['NODE_ENV'] || 'development'}`);
            console.log(`📅 Started at: ${new Date().toISOString()}\n`);
            // Start token sync service
            token_sync_service_1.tokenSyncService.start();
            // Start event listener service for real-time token creation events
            event_listener_service_1.eventListenerService.start();
            // Start metrics update job
            Promise.resolve().then(() => __importStar(require('./jobs/update-metrics.job'))).then(({ startMetricsUpdateJob }) => {
                startMetricsUpdateJob();
            });
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 ${signal} received: starting graceful shutdown`);
    // Stop accepting new connections
    server.close(async () => {
        console.log('✅ HTTP server closed');
        try {
            // Stop token sync service
            token_sync_service_1.tokenSyncService.stop();
            console.log('✅ Token sync service stopped');
            // Stop event listener service
            event_listener_service_1.eventListenerService.stop();
            console.log('✅ Event listener service stopped');
            // Close database connections
            await database_service_1.db.disconnect();
            console.log('✅ Database connections closed');
            // Close WebSocket connections
            wss.clients.forEach(client => client.close());
            console.log('✅ WebSocket connections closed');
            console.log('👋 Graceful shutdown completed');
            process.exit(0);
        }
        catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
        }
    });
    // Force shutdown after 30 seconds
    setTimeout(() => {
        console.error('⚠️ Forcing shutdown after timeout');
        process.exit(1);
    }, 30000);
};
// Handle different termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});
exports.default = app;
//# sourceMappingURL=index.js.map