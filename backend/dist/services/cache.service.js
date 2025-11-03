"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheKeys = exports.escrowCache = void 0;
const node_cache_1 = __importDefault(require("node-cache"));
const redis_1 = require("redis");
class MemoryCacheService {
    cache;
    constructor() {
        this.cache = new node_cache_1.default({
            stdTTL: 600, // Default 10 minutes
            checkperiod: 120, // Check for expired keys every 2 minutes
        });
    }
    get(key) {
        return this.cache.get(key);
    }
    set(key, value, ttl) {
        if (ttl) {
            this.cache.set(key, value, ttl);
        }
        else {
            this.cache.set(key, value);
        }
    }
    delete(key) {
        this.cache.del(key);
    }
    del(key) {
        this.delete(key);
    }
    flush() {
        this.cache.flushAll();
    }
    clearPattern(pattern) {
        const keys = this.cache.keys();
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        keys.forEach(key => {
            if (regex.test(key)) {
                this.cache.del(key);
            }
        });
    }
}
class RedisCacheService {
    client;
    connected = false;
    constructor(redisUrl) {
        this.client = (0, redis_1.createClient)({ url: redisUrl });
        this.client.on('error', (err) => {
            // Silently handle Redis connection errors - just use memory cache as fallback
            this.connected = false;
        });
        this.client.on('connect', () => {
            console.log('Redis Client Connected');
            this.connected = true;
        });
        this.client.connect().catch(console.error);
    }
    async get(key) {
        if (!this.connected)
            return null;
        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            console.error('Redis get error:', error);
            return null;
        }
    }
    async set(key, value, ttl = 600) {
        if (!this.connected)
            return;
        try {
            await this.client.setEx(key, ttl, JSON.stringify(value));
        }
        catch (error) {
            console.error('Redis set error:', error);
        }
    }
    async delete(key) {
        if (!this.connected)
            return;
        try {
            await this.client.del(key);
        }
        catch (error) {
            console.error('Redis delete error:', error);
        }
    }
    async del(key) {
        return this.delete(key);
    }
    async flush() {
        if (!this.connected)
            return;
        try {
            await this.client.flushAll();
        }
        catch (error) {
            console.error('Redis flush error:', error);
        }
    }
    async clearPattern(pattern) {
        if (!this.connected)
            return;
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
            }
        }
        catch (error) {
            console.error('Redis clearPattern error:', error);
        }
    }
}
// Export cache instance
exports.escrowCache = process.env['REDIS_URL']
    ? new RedisCacheService(process.env['REDIS_URL'])
    : new MemoryCacheService();
// Cache key patterns
exports.cacheKeys = {
    escrowList: (filters) => `escrows:list:${JSON.stringify(filters)}`,
    escrowDetail: (id) => `escrow:${id}`,
    userEscrows: (address) => `user:${address}:escrows`,
    kolPayouts: (address) => `kol:${address}:payouts`,
    verifierTasks: (address) => `verifier:${address}:tasks`,
};
//# sourceMappingURL=cache.service.js.map