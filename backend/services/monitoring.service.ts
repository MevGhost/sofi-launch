import os from 'os';
import { performance } from 'perf_hooks';
import { createLogger } from './logger-enhanced.service';
import { databaseConnection } from '../config/database.config';
import { getWebSocketStats } from './websocket-enhanced.service';

const logger = createLogger('Monitoring');

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  uptime: {
    system: number;
    process: number;
  };
  network?: {
    connections: number;
    bandwidthIn?: number;
    bandwidthOut?: number;
  };
}

interface ApplicationMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    requestsPerSecond: number;
  };
  database: {
    status: string;
    latency: number;
    queryMetrics: any;
    connectionPool?: {
      active: number;
      idle: number;
      waiting: number;
    };
  };
  websocket: {
    connections: number;
    connectionsByAddress: Record<string, number>;
    connectionsByRole: Record<string, number>;
  };
  cache?: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
    rate: number;
  };
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: boolean;
    memory: boolean;
    disk: boolean;
    cpu: boolean;
    websocket: boolean;
  };
  metrics?: {
    system: SystemMetrics;
    application: ApplicationMetrics;
  };
}

class MonitoringService {
  private requestMetrics: Map<string, number[]> = new Map();
  private errorMetrics: Map<string, number> = new Map();
  private requestCount = 0;
  private successCount = 0;
  private failedCount = 0;
  private startTime = Date.now();
  private lastMetricsReport = Date.now();
  private cpuUsageHistory: number[] = [];
  private memoryUsageHistory: number[] = [];

  constructor() {
    // Start periodic metrics collection
    if (process.env['NODE_ENV'] === 'production') {
      this.startMetricsCollection();
    }
  }

  private startMetricsCollection() {
    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Report metrics every 5 minutes
    setInterval(() => {
      this.reportMetrics();
    }, 300000);

    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupMetrics();
    }, 3600000);
  }

  private collectSystemMetrics() {
    const cpuUsage = this.getCPUUsage();
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const usedMem = totalMem - os.freemem();
    
    this.cpuUsageHistory.push(cpuUsage);
    this.memoryUsageHistory.push((usedMem / totalMem) * 100);
    
    // Keep only last 120 samples (1 hour at 30s intervals)
    if (this.cpuUsageHistory.length > 120) {
      this.cpuUsageHistory.shift();
    }
    if (this.memoryUsageHistory.length > 120) {
      this.memoryUsageHistory.shift();
    }

    // Check for high resource usage
    if (cpuUsage > 80) {
      logger.warn('High CPU usage detected', { cpuUsage: `${cpuUsage}%` });
    }
    
    if ((usedMem / totalMem) * 100 > 90) {
      logger.warn('High memory usage detected', {
        used: `${Math.round(usedMem / 1024 / 1024)}MB`,
        total: `${Math.round(totalMem / 1024 / 1024)}MB`,
        percentage: `${Math.round((usedMem / totalMem) * 100)}%`,
      });
    }
  }

  private getCPUUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);
    
    return usage;
  }

  trackRequest(path: string, method: string, statusCode: number, responseTime: number) {
    this.requestCount++;
    
    if (statusCode < 400) {
      this.successCount++;
    } else {
      this.failedCount++;
      this.trackError(`HTTP_${statusCode}`, path);
    }

    const key = `${method}_${path}`;
    if (!this.requestMetrics.has(key)) {
      this.requestMetrics.set(key, []);
    }
    
    const metrics = this.requestMetrics.get(key)!;
    metrics.push(responseTime);
    
    // Keep only last 1000 values
    if (metrics.length > 1000) {
      metrics.shift();
    }
  }

  trackError(type: string, details?: string) {
    const key = details ? `${type}:${details}` : type;
    this.errorMetrics.set(key, (this.errorMetrics.get(key) || 0) + 1);
  }

  private async getSystemMetrics(): Promise<SystemMetrics> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = process.memoryUsage();

    return {
      cpu: {
        usage: this.getCPUUsage(),
        cores: os.cpus().length,
        loadAverage: os.loadavg(),
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        percentage: (usedMem / totalMem) * 100,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
      },
      uptime: {
        system: os.uptime(),
        process: process.uptime(),
      },
    };
  }

  private async getApplicationMetrics(): Promise<ApplicationMetrics> {
    // Calculate request metrics
    const allResponseTimes: number[] = [];
    this.requestMetrics.forEach(times => {
      allResponseTimes.push(...times);
    });
    
    const sortedTimes = allResponseTimes.sort((a, b) => a - b);
    const avgResponseTime = sortedTimes.length > 0
      ? sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length
      : 0;
    
    const p95ResponseTime = sortedTimes.length > 0
      ? sortedTimes[Math.floor(sortedTimes.length * 0.95)]
      : 0;
    
    const p99ResponseTime = sortedTimes.length > 0
      ? sortedTimes[Math.floor(sortedTimes.length * 0.99)]
      : 0;
    
    const uptime = (Date.now() - this.startTime) / 1000;
    const requestsPerSecond = this.requestCount / uptime;

    // Get database metrics
    const dbHealth = await databaseConnection.healthCheck();
    const dbMetrics = databaseConnection.getQueryMetrics();

    // Get WebSocket metrics
    const wsStats = getWebSocketStats();

    // Calculate error rate
    const errorTotal = Array.from(this.errorMetrics.values()).reduce((a, b) => a + b, 0);
    const errorRate = errorTotal / Math.max(this.requestCount, 1);

    // Convert error metrics to object
    const errorsByType: Record<string, number> = {};
    this.errorMetrics.forEach((count, type) => {
      errorsByType[type] = count;
    });

    return {
      requests: {
        total: this.requestCount,
        successful: this.successCount,
        failed: this.failedCount,
        avgResponseTime: Math.round(avgResponseTime),
        p95ResponseTime: Math.round(p95ResponseTime),
        p99ResponseTime: Math.round(p99ResponseTime),
        requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      },
      database: {
        status: dbHealth.status,
        latency: dbHealth.latency,
        queryMetrics: dbMetrics,
      },
      websocket: wsStats,
      errors: {
        total: errorTotal,
        byType: errorsByType,
        rate: Math.round(errorRate * 10000) / 100, // Percentage
      },
    };
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const systemMetrics = await this.getSystemMetrics();
    const applicationMetrics = await this.getApplicationMetrics();
    
    // Determine health status
    const checks = {
      database: applicationMetrics.database.status === 'healthy',
      memory: systemMetrics.memory.percentage < 90,
      disk: true, // TODO: Implement disk space check
      cpu: systemMetrics.cpu.usage < 90,
      websocket: applicationMetrics.websocket.connections < 1000,
    };
    
    const failedChecks = Object.values(checks).filter(check => !check).length;
    let status: 'healthy' | 'degraded' | 'unhealthy';
    
    if (failedChecks === 0) {
      status = 'healthy';
    } else if (failedChecks <= 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
    
    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env['npm_package_version'] || '1.0.0',
      environment: process.env['NODE_ENV'] || 'development',
      checks,
      metrics: {
        system: systemMetrics,
        application: applicationMetrics,
      },
    };
  }

  private reportMetrics() {
    const timeSinceLastReport = Date.now() - this.lastMetricsReport;
    
    this.getHealthStatus().then(health => {
      logger.info('Metrics Report', {
        status: health.status,
        uptime: `${Math.round(health.uptime / 60)}m`,
        requests: health.metrics?.application.requests,
        errors: health.metrics?.application.errors,
        cpu: {
          current: `${health.metrics?.system.cpu.usage}%`,
          avg: this.cpuUsageHistory.length > 0
            ? `${Math.round(this.cpuUsageHistory.reduce((a, b) => a + b, 0) / this.cpuUsageHistory.length)}%`
            : 'N/A',
        },
        memory: {
          current: `${Math.round(health.metrics?.system.memory.percentage || 0)}%`,
          heap: `${Math.round((health.metrics?.system.memory.heapUsed || 0) / 1024 / 1024)}MB`,
        },
        database: {
          status: health.metrics?.application.database.status,
          latency: `${health.metrics?.application.database.latency}ms`,
        },
        websocket: {
          connections: health.metrics?.application.websocket.connections,
        },
      });
      
      // Alert on critical issues
      if (health.status === 'unhealthy') {
        logger.error('System health is UNHEALTHY', {
          failedChecks: Object.entries(health.checks)
            .filter(([_, passed]) => !passed)
            .map(([check]) => check),
        });
      } else if (health.status === 'degraded') {
        logger.warn('System health is DEGRADED', {
          failedChecks: Object.entries(health.checks)
            .filter(([_, passed]) => !passed)
            .map(([check]) => check),
        });
      }
    }).catch(error => {
      logger.error('Failed to generate metrics report', error);
    });
    
    this.lastMetricsReport = Date.now();
  }

  private cleanupMetrics() {
    // Clear old request metrics
    this.requestMetrics.forEach((values, key) => {
      if (values.length === 0) {
        this.requestMetrics.delete(key);
      }
    });
    
    // Reset counters
    this.requestCount = 0;
    this.successCount = 0;
    this.failedCount = 0;
    this.errorMetrics.clear();
    
    logger.debug('Metrics cleanup completed');
  }

  // Prometheus-compatible metrics export
  async getPrometheusMetrics(): Promise<string> {
    const health = await this.getHealthStatus();
    const metrics: string[] = [];
    
    // System metrics
    metrics.push(`# HELP cpu_usage_percent Current CPU usage percentage`);
    metrics.push(`# TYPE cpu_usage_percent gauge`);
    metrics.push(`cpu_usage_percent ${health.metrics?.system.cpu.usage || 0}`);
    
    metrics.push(`# HELP memory_usage_bytes Current memory usage in bytes`);
    metrics.push(`# TYPE memory_usage_bytes gauge`);
    metrics.push(`memory_usage_bytes ${health.metrics?.system.memory.used || 0}`);
    
    metrics.push(`# HELP memory_usage_percent Current memory usage percentage`);
    metrics.push(`# TYPE memory_usage_percent gauge`);
    metrics.push(`memory_usage_percent ${health.metrics?.system.memory.percentage || 0}`);
    
    // Application metrics
    metrics.push(`# HELP http_requests_total Total number of HTTP requests`);
    metrics.push(`# TYPE http_requests_total counter`);
    metrics.push(`http_requests_total ${health.metrics?.application.requests.total || 0}`);
    
    metrics.push(`# HELP http_request_duration_ms HTTP request duration in milliseconds`);
    metrics.push(`# TYPE http_request_duration_ms histogram`);
    metrics.push(`http_request_duration_ms_avg ${health.metrics?.application.requests.avgResponseTime || 0}`);
    metrics.push(`http_request_duration_ms_p95 ${health.metrics?.application.requests.p95ResponseTime || 0}`);
    metrics.push(`http_request_duration_ms_p99 ${health.metrics?.application.requests.p99ResponseTime || 0}`);
    
    metrics.push(`# HELP websocket_connections_active Active WebSocket connections`);
    metrics.push(`# TYPE websocket_connections_active gauge`);
    metrics.push(`websocket_connections_active ${health.metrics?.application.websocket.connections || 0}`);
    
    metrics.push(`# HELP database_latency_ms Database query latency in milliseconds`);
    metrics.push(`# TYPE database_latency_ms gauge`);
    metrics.push(`database_latency_ms ${health.metrics?.application.database.latency || 0}`);
    
    metrics.push(`# HELP errors_total Total number of errors`);
    metrics.push(`# TYPE errors_total counter`);
    metrics.push(`errors_total ${health.metrics?.application.errors.total || 0}`);
    
    metrics.push(`# HELP process_uptime_seconds Process uptime in seconds`);
    metrics.push(`# TYPE process_uptime_seconds counter`);
    metrics.push(`process_uptime_seconds ${Math.round(health.uptime)}`);
    
    return metrics.join('\n');
  }
}

// Create singleton instance
export const monitoringService = new MonitoringService();

// Express middleware for request tracking
export const requestMonitoring = (req: any, res: any, next: any) => {
  const startTime = performance.now();
  
  // Override res.end to capture response
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    const responseTime = performance.now() - startTime;
    
    // Track metrics
    monitoringService.trackRequest(
      req.path,
      req.method,
      res.statusCode,
      responseTime
    );
    
    // Call original end
    return originalEnd.apply(this, args);
  };
  
  next();
};

export default monitoringService;