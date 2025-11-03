interface CacheService {
    get(key: string): any;
    set(key: string, value: any, ttl?: number): void;
    delete(key: string): void;
    del?(key: string): void;
    flush(): void;
    clearPattern?(pattern: string): void;
}
export declare const escrowCache: CacheService;
export declare const cacheKeys: {
    escrowList: (filters: any) => string;
    escrowDetail: (id: string) => string;
    userEscrows: (address: string) => string;
    kolPayouts: (address: string) => string;
    verifierTasks: (address: string) => string;
};
export {};
//# sourceMappingURL=cache.service.d.ts.map