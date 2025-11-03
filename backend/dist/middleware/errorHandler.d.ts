import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
export interface ApiError extends Error {
    statusCode?: number;
    code?: string;
    details?: any;
}
export declare class ValidationError extends Error implements ApiError {
    details?: any;
    statusCode: number;
    code: string;
    constructor(message: string, details?: any);
}
export declare class UnauthorizedError extends Error implements ApiError {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare class ForbiddenError extends Error implements ApiError {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare class NotFoundError extends Error implements ApiError {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare class ConflictError extends Error implements ApiError {
    statusCode: number;
    code: string;
    constructor(message: string);
}
export declare class InternalServerError extends Error implements ApiError {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare const errorHandler: (err: ApiError | ZodError | any, req: Request, res: Response, _next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map