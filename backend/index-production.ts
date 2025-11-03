import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cluster from 'cluster';
import os from 'os';

// Load environment variables first
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Import configurations and services
import { validateEnv } from './config/env.schema';
import { databaseConnection } from './config/database.config';
import { createSecurityMiddleware } from './config/security.config';
import { createLogger, httpLogger } from './services/logger-enhanced.service';
import { setupWebSocket } from './services/websocket-enhanced.service';
import { monitoringService, requestMonitoring } from './services/monitoring.service';
import { errorHandler } from './middleware/errorHandler';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { extractChainInfo, attachChainToResponse } from './middleware/chain.middleware';

// Import routes
import escrowRoutes from './routes/escrow.routes';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import kolRoutes from './routes/kol.routes';
import verifierRoutes from './routes/verifier.routes';
import metadataRoutes from './routes/metadata.routes';
import tokenRoutes from './routes/token.routes';
import uploadRoutes from './routes/upload.routes';
import portfolioRoutes from './routes/portfolio.routes';
import statsRoutes from './routes/stats.routes';
import healthRoutes from './routes/health.routes';

const logger = createLogger('Server');

// Add BigInt serialization support
(BigInt.prototype as any).toJSON = function() {
  return this.toString();
};

// Cluster setup for production
if (cluster.isPrimary && process.env['NODE_ENV'] === 'production') {
  const numCPUs = process.env['WORKER_COUNT'] 
    ? parseInt(process.env['WORKER_COUNT']) 
    : Math.min(os.cpus().length, 4); // Max 4 workers

  logger.info(`Master process ${process.pid} starting ${numCPUs} workers...`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Handle worker deaths
  cluster.on('exit', (worker, code, signal) => {
    logger.error(`Worker ${worker.process.pid} died`, { code, signal });
    
    // Restart worker after a delay
    setTimeout(() => {
      logger.info('Starting new worker...');
      cluster.fork();
    }, 1000);
  });

  // Graceful shutdown for master
  process.on('SIGTERM', () => {
    logger.info('Master received SIGTERM, shutting down workers...');
    for (const id in cluster.workers) {
      cluster.workers[id]?.kill('SIGTERM');
    }
  });

} else {
  // Worker process or non-clustered mode
  startServer();
}

async function startServer() {
  try {
    // Validate environment variables
    validateEnv();
    logger.info('Environment variables validated successfully', {
      environment: process.env['NODE_ENV'],
      worker: cluster.worker?.id || 'single',
    });

    const app = express();
    const server = createServer(app);
    
    // WebSocket only on first worker or single mode
    let wss: WebSocketServer | undefined;
    if (!cluster.worker || cluster.worker.id === 1) {
      wss = new WebSocketServer({ server });
      setupWebSocket(wss);
      logger.info('WebSocket server initialized');
    }

    // Trust proxy settings for production
    app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
    
    // Get security middleware
    const security = await createSecurityMiddleware();
    
    // Apply security middleware
    app.use(security.helmet);
    app.use(security.cors);
    app.use(compression());
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request tracking and logging
    app.use(requestIdMiddleware);
    app.use(httpLogger);
    app.use(requestMonitoring);
    
    // Production logging with Morgan
    if (process.env['NODE_ENV'] === 'production') {
      app.use(morgan('combined', {
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
    app.use(extractChainInfo);
    app.use(attachChainToResponse);
    
    // Health check routes (before auth)
    app.use('/health', healthRoutes);
    
    // Prometheus metrics endpoint
    app.get('/metrics', async (req, res) => {
      try {
        const metrics = await monitoringService.getPrometheusMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metrics);
      } catch (error) {
        logger.error('Failed to generate metrics', error);
        res.status(500).send('Error generating metrics');
      }
    });
    
    // Serve static files for uploads
    app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
      maxAge: '7d',
      setHeaders: (res) => {
        res.set('X-Content-Type-Options', 'nosniff');
      },
    }));
    
    // API Routes with specific rate limiters
    app.use('/api/auth', security.rateLimiters.auth, authRoutes);
    app.use('/api/escrows', security.rateLimiters.write, escrowRoutes);
    app.use('/api/admin', security.rateLimiters.write, adminRoutes);
    app.use('/api/kol', security.rateLimiters.read, kolRoutes);
    app.use('/api/verifier', security.rateLimiters.write, verifierRoutes);
    app.use('/api/metadata', security.rateLimiters.read, metadataRoutes);
    app.use('/api/tokens', security.rateLimiters.read, tokenRoutes);
    app.use('/api/upload', security.rateLimiters.upload, uploadRoutes);
    app.use('/api/portfolio', security.rateLimiters.read, portfolioRoutes);
    app.use('/api/stats', security.rateLimiters.read, statsRoutes);
    
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
    app.use(errorHandler);
    
    // Connect to database
    await databaseConnection.connect();
    
    // Start server
    const PORT = process.env['PORT'] || 4000;
    
    server.listen(PORT, () => {
      logger.info('🚀 Server started successfully', {
        port: PORT,
        environment: process.env['NODE_ENV'],
        worker: cluster.worker?.id || 'single',
        pid: process.pid,
      });
      
      // Send ready signal for PM2
      if (process.send) {
        process.send('ready');
      }
    });
    
    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received: starting graceful shutdown`, {
        worker: cluster.worker?.id || 'single',
      });
      
      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Close database connections
          await databaseConnection.disconnect();
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
        } catch (error) {
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
    
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

export default {};