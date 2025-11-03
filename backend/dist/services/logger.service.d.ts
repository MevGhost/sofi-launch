import winston from 'winston';
declare const logger: winston.Logger;
export declare function createRequestLogger(requestId: string): winston.Logger;
export declare const dbLogger: winston.Logger;
export declare const wsLogger: winston.Logger;
export declare const authLogger: winston.Logger;
export declare const contractLogger: winston.Logger;
export declare const apiLogger: winston.Logger;
export declare function logError(error: Error, context?: Record<string, any>): void;
export declare function logPerformance(operation: string, duration: number, metadata?: Record<string, any>): void;
export declare function logSecurityEvent(event: string, details: Record<string, any>): void;
export declare function logAudit(action: string, userId: string, details: Record<string, any>): void;
export declare const morganStream: {
    write: (message: string) => void;
};
export default logger;
//# sourceMappingURL=logger.service.d.ts.map