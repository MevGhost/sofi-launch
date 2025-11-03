export declare class TokenImportService {
    private provider;
    private contract;
    constructor();
    /**
     * Import a token from the blockchain into the database
     */
    importToken(tokenAddress: string, deploymentTxHash?: string): Promise<any>;
    /**
     * Update existing token data from blockchain
     */
    updateTokenData(tokenAddress: string): Promise<any>;
    /**
     * Update token cache entries
     */
    private updateTokenCache;
    /**
     * Import all tokens from the factory
     */
    importAllTokens(): Promise<number>;
}
export declare const tokenImportService: TokenImportService;
//# sourceMappingURL=token-import.service.d.ts.map