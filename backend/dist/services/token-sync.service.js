"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenSyncService = exports.TokenSyncService = void 0;
const database_service_1 = require("./database.service");
const contract_service_1 = require("./contract.service");
const logger_service_1 = __importDefault(require("./logger.service"));
class TokenSyncService {
    syncInterval = null;
    /**
     * Start the token sync service
     */
    start() {
        // Sync tokens every 5 minutes
        this.syncInterval = setInterval(() => {
            this.syncActiveTokens();
        }, 5 * 60 * 1000);
        // Initial sync
        this.syncActiveTokens();
        logger_service_1.default.info('Token sync service started');
    }
    /**
     * Stop the token sync service
     */
    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        logger_service_1.default.info('Token sync service stopped');
    }
    /**
     * Sync all active tokens with blockchain data
     */
    async syncActiveTokens() {
        try {
            const activeTokens = await database_service_1.db.token.findMany({
                where: {
                    status: 'ACTIVE',
                    bondingCurveAddress: { not: '' }
                },
                select: {
                    id: true,
                    address: true,
                    bondingCurveAddress: true,
                }
            });
            logger_service_1.default.info(`Syncing ${activeTokens.length} active tokens`);
            for (const token of activeTokens) {
                try {
                    await this.syncToken(token.id, token.address);
                }
                catch (error) {
                    logger_service_1.default.error(`Failed to sync token ${token.address}:`, error);
                }
            }
            logger_service_1.default.info('Token sync completed');
        }
        catch (error) {
            logger_service_1.default.error('Token sync failed:', error);
        }
    }
    /**
     * Sync a single token with blockchain data
     */
    async syncToken(tokenId, tokenAddress) {
        try {
            // Get current token info from blockchain
            const tokenInfo = await contract_service_1.contractService.getTokenData(tokenAddress);
            if (!tokenInfo) {
                logger_service_1.default.warn(`Could not fetch info for token ${tokenAddress}`);
                return;
            }
            // Market cap is already in USD as a string from the contract service
            const marketCapInUsd = tokenInfo.marketCap ?
                tokenInfo.marketCap.toString() :
                '1000';
            // Update token in database with latest metrics
            await database_service_1.db.token.update({
                where: { id: tokenId },
                data: {
                    marketCap: marketCapInUsd,
                    bondingProgress: tokenInfo.bondingProgress || 0,
                    status: tokenInfo.graduated ? 'GRADUATED' : 'ACTIVE',
                }
            });
            logger_service_1.default.debug(`Synced token ${tokenAddress}`);
        }
        catch (error) {
            logger_service_1.default.error(`Error syncing token ${tokenAddress}:`, error);
        }
    }
    /**
     * Force sync a specific token
     */
    async forceSyncToken(tokenAddress) {
        const token = await database_service_1.db.token.findUnique({
            where: { address: tokenAddress }
        });
        if (token) {
            await this.syncToken(token.id, token.address);
        }
    }
}
exports.TokenSyncService = TokenSyncService;
// Export singleton instance
exports.tokenSyncService = new TokenSyncService();
//# sourceMappingURL=token-sync.service.js.map