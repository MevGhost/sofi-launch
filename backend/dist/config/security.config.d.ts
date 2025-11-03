import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
export declare const createCorsMiddleware: () => (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;
export declare const createHelmetMiddleware: () => (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
export declare const createRateLimiters: () => Promise<{
    api: import("express-rate-limit").RateLimitRequestHandler;
    auth: import("express-rate-limit").RateLimitRequestHandler;
    write: import("express-rate-limit").RateLimitRequestHandler;
    read: import("express-rate-limit").RateLimitRequestHandler;
    upload: import("express-rate-limit").RateLimitRequestHandler;
}>;
export declare const xssProtection: (req: Request, res: Response, next: NextFunction) => void;
export declare const sqlInjectionProtection: (req: Request, res: Response, next: NextFunction) => void;
export declare const ipBlocking: (req: Request, res: Response, next: NextFunction) => void;
export declare const trackFailedAttempt: (ip: string) => void;
export declare const apiSecurityHeaders: (req: Request, res: Response, next: NextFunction) => void;
export declare const createSecurityMiddleware: () => Promise<{
    cors: (req: cors.CorsRequest, res: {
        statusCode?: number | undefined;
        setHeader(key: string, value: string): any;
        end(): any;
    }, next: (err?: any) => any) => void;
    helmet: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
    rateLimiters: {
        api: import("express-rate-limit").RateLimitRequestHandler;
        auth: import("express-rate-limit").RateLimitRequestHandler;
        write: import("express-rate-limit").RateLimitRequestHandler;
        read: import("express-rate-limit").RateLimitRequestHandler;
        upload: import("express-rate-limit").RateLimitRequestHandler;
    };
    xssProtection: (req: Request, res: Response, next: NextFunction) => void;
    sqlInjectionProtection: (req: Request, res: Response, next: NextFunction) => void;
    ipBlocking: (req: Request, res: Response, next: NextFunction) => void;
    apiSecurityHeaders: (req: Request, res: Response, next: NextFunction) => void;
}>;
export default createSecurityMiddleware;
//# sourceMappingURL=security.config.d.ts.map