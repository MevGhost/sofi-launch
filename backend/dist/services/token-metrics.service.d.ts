declare class TokenMetricsService {
    private provider;
    private factory;
    constructor();
    /**
     * Update metrics for a single token
     */
    updateTokenMetrics(tokenAddress: string): Promise<{
        price: number;
        marketCap: number;
        bondingProgress: number;
        volume24h: number;
        change24h: number;
    }>;
    /**
     * Calculate 24h price change
     */
    calculate24hChange(tokenAddress: string): Promise<number>;
    /**
     * Calculate 24h volume
     */
    calculate24hVolume(tokenAddress: string): Promise<number>;
    /**
     * Update all active tokens
     */
    updateAllTokens(): Promise<void>;
}
export declare const tokenMetricsService: TokenMetricsService;
export {};
//# sourceMappingURL=token-metrics.service.d.ts.map