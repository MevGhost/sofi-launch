import NodeCache from 'node-cache';
import { createClient } from 'redis';

interface CacheService {
  get(key: string): any;
  set(key: string, value: any, ttl?: number): void;
  delete(key: string): void;
  del?(key: string): void; // Alias for delete
  flush(): void;
  clearPattern?(pattern: string): void;
}

class MemoryCacheService implements CacheService {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: 600, // Default 10 minutes
      checkperiod: 120, // Check for expired keys every 2 minutes
    });
  }

  get(key: string): any {
    return this.cache.get(key);
  }

  set(key: string, value: any, ttl?: number): void {
    if (ttl) {
      this.cache.set(key, value, ttl);
    } else {
      this.cache.set(key, value);
    }
  }

  delete(key: string): void {
    this.cache.del(key);
  }

  del(key: string): void {
    this.delete(key);
  }

  flush(): void {
    this.cache.flushAll();
  }

  clearPattern(pattern: string): void {
    const keys = this.cache.keys();
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    keys.forEach(key => {
      if (regex.test(key)) {
        this.cache.del(key);
      }
    });
  }
}

class RedisCacheService implements CacheService {
  private client: ReturnType<typeof createClient>;
  private connected: boolean = false;

  constructor(redisUrl: string) {
    this.client = createClient({ url: redisUrl });
    
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

  async get(key: string): Promise<any> {
    if (!this.connected) return null;
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 600): Promise<void> {
    if (!this.connected) return;
    
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.connected) return;
    
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }

  async del(key: string): Promise<void> {
    return this.delete(key);
  }

  async flush(): Promise<void> {
    if (!this.connected) return;
    
    try {
      await this.client.flushAll();
    } catch (error) {
      console.error('Redis flush error:', error);
    }
  }

  async clearPattern(pattern: string): Promise<void> {
    if (!this.connected) return;
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('Redis clearPattern error:', error);
    }
  }
}

// Export cache instance
export const escrowCache: CacheService = process.env['REDIS_URL']
  ? new RedisCacheService(process.env['REDIS_URL'])
  : new MemoryCacheService();

// Cache key patterns
export const cacheKeys = {
  escrowList: (filters: any) => `escrows:list:${JSON.stringify(filters)}`,
  escrowDetail: (id: string) => `escrow:${id}`,
  userEscrows: (address: string) => `user:${address}:escrows`,
  kolPayouts: (address: string) => `kol:${address}:payouts`,
  verifierTasks: (address: string) => `verifier:${address}:tasks`,
};