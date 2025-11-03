export declare class TradeSyncService {
    private provider;
    private contract;
    constructor();
    /**
     * Sync historical trades for a token from blockchain events
     */
    syncTokenTrades(tokenAddress: string, fromBlock?: number): Promise<number>;
    /**
     * Sync trades for all tokens
     */
    syncAllTokenTrades(): Promise<number>;
}
export declare const tradeSyncService: TradeSyncService;
//# sourceMappingURL=trade-sync.service.d.ts.map