import { PrismaClient } from '../generated/prisma';
export declare class DatabaseConnection {
    private prisma;
    private config;
    private isConnected;
    private connectionRetries;
    private queryMetrics;
    private healthCheckInterval?;
    constructor();
    private getConnectionUrl;
    private setupEventListeners;
    private setupQueryMonitoring;
    private trackQueryMetric;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private startHealthCheck;
    healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        latency: number;
        metrics?: any;
    }>;
    executeTransaction<T>(fn: (tx: any) => Promise<T>, options?: {
        maxRetries?: number;
        timeout?: number;
        isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
    }): Promise<T>;
    getQueryMetrics(): any;
    clearMetrics(): void;
    get client(): PrismaClient<import("../generated/prisma").Prisma.PrismaClientOptions, import("../generated/prisma").Prisma.LogLevel, import("../generated/prisma/runtime/library").DefaultArgs>;
    get connected(): boolean;
}
export declare const databaseConnection: DatabaseConnection;
export default databaseConnection;
//# sourceMappingURL=database.config.d.ts.map