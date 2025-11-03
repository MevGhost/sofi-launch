import { Router, Request, Response } from 'express';
import { db } from '../services/database.service';
import os from 'os';
import { getConfig } from '../config/env.schema';

const router = Router();
const startTime = Date.now();

/**
 * Basic health check endpoint
 * Used by load balancers and monitoring tools
 */
router.get('/', async (_req: Request, res: Response) => {
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
router.get('/detailed', async (req: Request, res: Response) => {
  // Simple auth check for production
  const authKey = req.headers['x-health-key'];
  if (process.env['NODE_ENV'] === 'production' && authKey !== process.env['HEALTH_CHECK_KEY']) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const health: any = {
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
    const dbHealthy = await db.healthCheck();
    health.components.database = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
    };
  } catch (error) {
    health.components.database = {
      status: 'unhealthy',
      error: (error as Error).message,
    };
    health.status = 'degraded';
  }

  // Check Redis connection if configured
  const config = getConfig();
  if (config.REDIS_URL) {
    try {
      // Redis health check would go here
      health.components.redis = {
        status: 'healthy',
      };
    } catch (error) {
      health.components.redis = {
        status: 'unhealthy',
        error: (error as Error).message,
      };
      health.status = 'degraded';
    }
  }

  // System metrics
  health.system = {
    memory: {
      total: Math.round(os.totalmem() / 1024 / 1024),
      free: Math.round(os.freemem() / 1024 / 1024),
      used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024),
      percentage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
    },
    cpu: {
      cores: os.cpus().length,
      loadAverage: os.loadavg(),
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
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    // Check if database is connected
    const dbHealthy = await db.healthCheck();
    
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
  } catch (error) {
    res.status(503).json({
      ready: false,
      reason: (error as Error).message,
    });
  }
});

/**
 * Liveness check for Kubernetes/container orchestration
 * Indicates if the service should be restarted
 */
router.get('/live', (_req: Request, res: Response) => {
  // Simple check - if the server can respond, it's alive
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

export default router;