import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class ValidationError extends Error implements ApiError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error implements ApiError {
  statusCode = 401;
  code = 'UNAUTHORIZED';
  
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error implements ApiError {
  statusCode = 403;
  code = 'FORBIDDEN';
  
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error implements ApiError {
  statusCode = 404;
  code = 'NOT_FOUND';
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements ApiError {
  statusCode = 409;
  code = 'CONFLICT';
  
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class InternalServerError extends Error implements ApiError {
  statusCode = 500;
  code = 'INTERNAL_SERVER_ERROR';
  
  constructor(message: string = 'Internal server error') {
    super(message);
    this.name = 'InternalServerError';
  }
}

export const errorHandler = (
  err: ApiError | ZodError | any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Enhanced error logging for production
  const errorLog = {
    name: err.name,
    message: err.message,
    stack: process.env['NODE_ENV'] === 'production' ? undefined : err.stack,
    code: err.code,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString(),
  };

  // Use proper logging in production
  if (process.env['NODE_ENV'] === 'production') {
    // In production, log to file/service
    console.error(JSON.stringify(errorLog));
  } else {
    // In development, use readable format
    console.error('Error:', errorLog);
  }

  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_ERROR';

  // Handle specific error types
  if (err instanceof ZodError) {
    // Zod validation errors
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    (err as any).details = err.errors.map((e: any) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  } else if (err.code && err.clientVersion && typeof err.code === 'string' && err.code.startsWith('P')) {
    // Prisma database errors
    if (err.code === 'P2002') {
      statusCode = 409;
      message = 'Duplicate entry';
      code = 'DUPLICATE_ENTRY';
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found';
      code = 'NOT_FOUND';
    } else if (err.code === 'P2003') {
      statusCode = 400;
      message = 'Foreign key constraint failed';
      code = 'FK_CONSTRAINT';
    } else {
      statusCode = 500;
      message = 'Database error';
      code = 'DATABASE_ERROR';
    }
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
  } else if (err.statusCode === 429) {
    // Rate limiting
    message = 'Too many requests. Please try again later.';
    code = 'RATE_LIMITED';
  }

  // Prepare error response
  const errorResponse: any = {
    success: false,
    error: {
      code,
      message,
    },
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // Add request ID if available
  const requestId = (req as any).requestId;
  if (requestId) {
    errorResponse.requestId = requestId;
  }

  // Add details in development or for validation errors
  if (process.env['NODE_ENV'] === 'development') {
    errorResponse.error.details = (err as any).details;
    errorResponse.error.stack = err.stack;
  } else if ((err as any).details && code === 'VALIDATION_ERROR') {
    // Include validation details even in production
    errorResponse.error.details = (err as any).details;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};