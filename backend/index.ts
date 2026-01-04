// Load environment variables FIRST
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { errorHandler } from './middleware/errorHandler';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { 
  helmetConfig, 
  apiRateLimiter, 
  xssProtection,
  sqlInjectionProtection 
} from './middleware/security.middleware';
import { extractChainInfo, attachChainToResponse } from './middleware/chain.middleware';
import escrowRoutes from './routes/escrow.routes';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import kolRoutes from './routes/kol.routes';
// import notificationRoutes from './routes/notification.routes';
import verifierRoutes from './routes/verifier.routes';
import metadataRoutes from './routes/metadata.routes';
import tokenRoutes from './routes/token.routes';
import uploadRoutes from './routes/upload.routes';
import portfolioRoutes from './routes/portfolio.routes';
import statsRoutes from './routes/stats.routes';
import healthRoutes from './routes/health.routes';
import { setupWebSocket } from './services/websocket.service';
import { validateEnv, getSanitizedConfig } from './config/env.schema';
import { db } from './services/database.service';
import { tokenSyncService } from './services/token-sync.service';
import { eventListenerService } from './services/event-listener.service';

// Add BigInt serialization support
(BigInt.prototype as any).toJSON = function() {
  return this.toString();
};

// Validate environment variables on startup
try {
  validateEnv();
  console.log('✅ Environment variables validated successfully');
  if (process.env['NODE_ENV'] !== 'production') {
    console.log('Configuration:', getSanitizedConfig());
  }
} catch (error) {
  console.error('❌ Environment validation failed:', error);
  process.exit(1);
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Trust proxy for accurate IP detection when behind reverse proxy (nginx, cloudflare, etc)
// Using specific trust proxy settings to avoid rate limiter bypass
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

// Security middleware
app.use(helmetConfig);
app.use(cors({
  origin: process.env['ALLOWED_ORIGINS']?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Chain', 'X-Chain-Type', 'X-Request-Id'],
}));

// Request processing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request tracking and logging
app.use(requestIdMiddleware);
app.use(morgan('combined', {
  skip: (req) => req.path === '/health' || req.path === '/health/live',
}));

// Security middleware
app.use(xssProtection);
app.use(sqlInjectionProtection);
app.use(apiRateLimiter);

// Chain middleware - extract chain info from requests
app.use(extractChainInfo);
app.use(attachChainToResponse);

// Health check routes (before other routes for priority)
app.use('/health', healthRoutes);

// Serve static files for uploads with proper CORS headers
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for static files
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res, path) => {
    // Additional headers for images
    if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.gif') || path.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/' + path.split('.').pop());
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

// Basic CORS preflight handler
app.options('*', cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/escrows', escrowRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/kol', kolRoutes);
// app.use('/api/notifications', notificationRoutes);
app.use('/api/verifier', verifierRoutes);
app.use('/api/metadata', metadataRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/stats', statsRoutes);

// WebSocket setup
setupWebSocket(wss);

// Error handling
app.use(errorHandler);

// Server
// Default to 5001 to match frontend API_BASE_URL expectation
const PORT = process.env['PORT'] || 5001;

// Start server with database connection and graceful error handling
async function startServer() {
  try {
    // Connect to database with retry logic
    await db.connect();
    
    server.listen(PORT, () => {
      console.log('\n🚀 Server started successfully');
      console.log(`🌐 API: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
      console.log(`🎯 Environment: ${process.env['NODE_ENV'] || 'development'}`);
      console.log(`📅 Started at: ${new Date().toISOString()}\n`);
      
      // Start token sync service
      tokenSyncService.start();
      
      // Start event listener service for real-time token creation events
      eventListenerService.start();
      
      // Start metrics update job
      import('./jobs/update-metrics.job').then(({ startMetricsUpdateJob }) => {
        startMetricsUpdateJob();
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 ${signal} received: starting graceful shutdown`);
  
  // Stop accepting new connections
  server.close(async () => {
    console.log('✅ HTTP server closed');
    
    try {
      // Stop token sync service
      tokenSyncService.stop();
      console.log('✅ Token sync service stopped');
      
      // Stop event listener service
      eventListenerService.stop();
      console.log('✅ Event listener service stopped');
      
      // Close database connections
      await db.disconnect();
      console.log('✅ Database connections closed');
      
      // Close WebSocket connections
      wss.clients.forEach(client => client.close());
      console.log('✅ WebSocket connections closed');
      
      console.log('👋 Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
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

export default app;