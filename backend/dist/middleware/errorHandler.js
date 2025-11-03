"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.InternalServerError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.ValidationError = void 0;
const zod_1 = require("zod");
class ValidationError extends Error {
    details;
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class UnauthorizedError extends Error {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    constructor(message = 'Unauthorized') {
        super(message);
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends Error {
    statusCode = 403;
    code = 'FORBIDDEN';
    constructor(message = 'Forbidden') {
        super(message);
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends Error {
    statusCode = 404;
    code = 'NOT_FOUND';
    constructor(message = 'Resource not found') {
        super(message);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends Error {
    statusCode = 409;
    code = 'CONFLICT';
    constructor(message) {
        super(message);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class InternalServerError extends Error {
    statusCode = 500;
    code = 'INTERNAL_SERVER_ERROR';
    constructor(message = 'Internal server error') {
        super(message);
        this.name = 'InternalServerError';
    }
}
exports.InternalServerError = InternalServerError;
const errorHandler = (err, req, res, _next) => {
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
        userId: req.user?.id,
        timestamp: new Date().toISOString(),
    };
    // Use proper logging in production
    if (process.env['NODE_ENV'] === 'production') {
        // In production, log to file/service
        console.error(JSON.stringify(errorLog));
    }
    else {
        // In development, use readable format
        console.error('Error:', errorLog);
    }
    // Default error values
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal server error';
    let code = err.code || 'INTERNAL_ERROR';
    // Handle specific error types
    if (err instanceof zod_1.ZodError) {
        // Zod validation errors
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = 'Validation failed';
        err.details = err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
        }));
    }
    else if (err.code && err.clientVersion && typeof err.code === 'string' && err.code.startsWith('P')) {
        // Prisma database errors
        if (err.code === 'P2002') {
            statusCode = 409;
            message = 'Duplicate entry';
            code = 'DUPLICATE_ENTRY';
        }
        else if (err.code === 'P2025') {
            statusCode = 404;
            message = 'Record not found';
            code = 'NOT_FOUND';
        }
        else if (err.code === 'P2003') {
            statusCode = 400;
            message = 'Foreign key constraint failed';
            code = 'FK_CONSTRAINT';
        }
        else {
            statusCode = 500;
            message = 'Database error';
            code = 'DATABASE_ERROR';
        }
    }
    else if (err.name === 'ValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
    }
    else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        code = 'INVALID_TOKEN';
    }
    else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        code = 'TOKEN_EXPIRED';
    }
    else if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
        code = 'INVALID_ID';
    }
    else if (err.statusCode === 429) {
        // Rate limiting
        message = 'Too many requests. Please try again later.';
        code = 'RATE_LIMITED';
    }
    // Prepare error response
    const errorResponse = {
        success: false,
        error: {
            code,
            message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
    };
    // Add request ID if available
    const requestId = req.requestId;
    if (requestId) {
        errorResponse.requestId = requestId;
    }
    // Add details in development or for validation errors
    if (process.env['NODE_ENV'] === 'development') {
        errorResponse.error.details = err.details;
        errorResponse.error.stack = err.stack;
    }
    else if (err.details && code === 'VALIDATION_ERROR') {
        // Include validation details even in production
        errorResponse.error.details = err.details;
    }
    // Send error response
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map