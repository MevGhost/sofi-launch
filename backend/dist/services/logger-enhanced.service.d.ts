import winston from 'winston';
import { Request } from 'express';
declare const sanitizeLogData: (data: any) => any;
declare const logger: winston.Logger;
declare class Logger {
    private context?;
    constructor(context?: string);
    private log;
    error(message: string, error?: Error | any, meta?: any): void;
    warn(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    http(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
    logRequest(req: Request, res: any, responseTime: number): void;
    logQuery(operation: string, model: string, duration: number, params?: any): void;
    logWebSocket(event: string, data?: any): void;
    logAPICall(service: string, endpoint: string, method: string, statusCode: number, duration: number): void;
    child(context: string): Logger;
}
export declare const httpLogger: (req: Request, res: any, next: any) => void;
declare class PerformanceMonitor {
    private metrics;
    private logger;
    constructor();
    track(operation: string, duration: number): void;
    reportMetrics(): void;
}
export declare const defaultLogger: Logger;
export declare const performanceMonitor: PerformanceMonitor;
export declare const createLogger: (context: string) => Logger;
export { Logger, logger as winstonLogger, sanitizeLogData, PerformanceMonitor, };
export default defaultLogger;
//# sourceMappingURL=logger-enhanced.service.d.ts.map