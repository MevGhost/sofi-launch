import { db } from './database.service';
import { contractService } from './contract.service';
import logger from './logger.service';
import { formatEther } from 'viem';

export class TokenSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  
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
    
    logger.info('Token sync service started');
  }
  
  /**
   * Stop the token sync service
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    logger.info('Token sync service stopped');
  }
  
  /**
   * Sync all active tokens with blockchain data
   */
  private async syncActiveTokens() {
    try {
      const activeTokens = await db.token.findMany({
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
      
      logger.info(`Syncing ${activeTokens.length} active tokens`);
      
      for (const token of activeTokens) {
        try {
          await this.syncToken(token.id, token.address);
        } catch (error) {
          logger.error(`Failed to sync token ${token.address}:`, error);
        }
      }
      
      logger.info('Token sync completed');
    } catch (error) {
      logger.error('Token sync failed:', error);
    }
  }
  
  /**
   * Sync a single token with blockchain data
   */
  async syncToken(tokenId: string, tokenAddress: string) {
    try {
      // Get current token info from blockchain
      const tokenInfo = await contractService.getTokenData(tokenAddress);
      
      if (!tokenInfo) {
        logger.warn(`Could not fetch info for token ${tokenAddress}`);
        return;
      }
      
      // Market cap is already in USD as a string from the contract service
      const marketCapInUsd = tokenInfo.marketCap ? 
        tokenInfo.marketCap.toString() : 
        '1000';
      
      // Update token in database with latest metrics
      await db.token.update({
        where: { id: tokenId },
        data: {
          marketCap: marketCapInUsd,
          bondingProgress: tokenInfo.bondingProgress || 0,
          status: tokenInfo.graduated ? 'GRADUATED' : 'ACTIVE',
        }
      });
      
      logger.debug(`Synced token ${tokenAddress}`);
    } catch (error) {
      logger.error(`Error syncing token ${tokenAddress}:`, error);
    }
  }
  
  /**
   * Force sync a specific token
   */
  async forceSyncToken(tokenAddress: string) {
    const token = await db.token.findUnique({
      where: { address: tokenAddress }
    });
    
    if (token) {
      await this.syncToken(token.id, token.address);
    }
  }
}

// Export singleton instance
export const tokenSyncService = new TokenSyncService();