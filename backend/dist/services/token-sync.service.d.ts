export declare class TokenSyncService {
    private syncInterval;
    /**
     * Start the token sync service
     */
    start(): void;
    /**
     * Stop the token sync service
     */
    stop(): void;
    /**
     * Sync all active tokens with blockchain data
     */
    private syncActiveTokens;
    /**
     * Sync a single token with blockchain data
     */
    syncToken(tokenId: string, tokenAddress: string): Promise<void>;
    /**
     * Force sync a specific token
     */
    forceSyncToken(tokenAddress: string): Promise<void>;
}
export declare const tokenSyncService: TokenSyncService;
//# sourceMappingURL=token-sync.service.d.ts.map