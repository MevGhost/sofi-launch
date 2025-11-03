import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to add unique request ID for tracking
 * Helps with debugging and log correlation
 */
export declare function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=requestId.middleware.d.ts.map