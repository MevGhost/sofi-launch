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
declare class MonitoringService {
    private requestMetrics;
    private errorMetrics;
    private requestCount;
    private successCount;
    private failedCount;
    private startTime;
    private lastMetricsReport;
    private cpuUsageHistory;
    private memoryUsageHistory;
    constructor();
    private startMetricsCollection;
    private collectSystemMetrics;
    private getCPUUsage;
    trackRequest(path: string, method: string, statusCode: number, responseTime: number): void;
    trackError(type: string, details?: string): void;
    private getSystemMetrics;
    private getApplicationMetrics;
    getHealthStatus(): Promise<HealthStatus>;
    private reportMetrics;
    private cleanupMetrics;
    getPrometheusMetrics(): Promise<string>;
}
export declare const monitoringService: MonitoringService;
export declare const requestMonitoring: (req: any, res: any, next: any) => void;
export default monitoringService;
//# sourceMappingURL=monitoring.service.d.ts.map