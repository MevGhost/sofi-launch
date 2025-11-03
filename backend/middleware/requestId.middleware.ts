import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Middleware to add unique request ID for tracking
 * Helps with debugging and log correlation
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // Generate or extract request ID
  const requestId = req.headers['x-request-id'] as string || randomUUID();
  
  // Attach to request object
  (req as any).requestId = requestId;
  
  // Add to response headers
  res.setHeader('X-Request-Id', requestId);
  
  next();
}