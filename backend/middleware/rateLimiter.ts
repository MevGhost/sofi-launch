import rateLimit from 'express-rate-limit';

// Only use Redis store if REDIS_URL is provided
const createStore = async (prefix: string) => {
  if (process.env['REDIS_URL']) {
    const { RedisStore } = await import('rate-limit-redis');
    const { createClient } = await import('redis');
    const client = createClient({ url: process.env['REDIS_URL'] });
    await client.connect();
    return new RedisStore({
      sendCommand: (...args: string[]) => (client as any).sendCommand(args),
      prefix,
    });
  }
  return undefined;
};

// General rate limiter
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env['NODE_ENV'] === 'development' ? 5000 : 500, // Very high limit for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.'
    });
  }
});

// Strict rate limiter for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env['NODE_ENV'] === 'development' ? 50 : 5, // More lenient in development
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Transaction rate limiter
export const transactionRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 transaction requests per minute
  message: 'Too many transaction requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialize Redis stores if REDIS_URL is provided
if (process.env['REDIS_URL']) {
  createStore('rl:general:').then(store => {
    if (store) (rateLimiter as any).store = store;
  }).catch(console.error);
  
  createStore('rl:auth:').then(store => {
    if (store) (authRateLimiter as any).store = store;
  }).catch(console.error);
  
  createStore('rl:tx:').then(store => {
    if (store) (transactionRateLimiter as any).store = store;
  }).catch(console.error);
}