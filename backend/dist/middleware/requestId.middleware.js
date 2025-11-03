"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = requestIdMiddleware;
const crypto_1 = require("crypto");
/**
 * Middleware to add unique request ID for tracking
 * Helps with debugging and log correlation
 */
function requestIdMiddleware(req, res, next) {
    // Generate or extract request ID
    const requestId = req.headers['x-request-id'] || (0, crypto_1.randomUUID)();
    // Attach to request object
    req.requestId = requestId;
    // Add to response headers
    res.setHeader('X-Request-Id', requestId);
    next();
}
//# sourceMappingURL=requestId.middleware.js.map