import { ethers } from 'ethers';
import { db } from './database.service';

const FACTORY_ADDRESS = '0x46eCf02772C4Bc9a5cd440FB93022d6e268355c8';
const ETH_PRICE_USD = 3000; // Could fetch from API

const FACTORY_ABI = [
  'function getTokenPrice(address _token) view returns (uint256)',
  'function calculateMarketCap(address _token) view returns (uint256)',
  'function bondingProgress(address _token) view returns (uint256)',
  'function tokenInfo(address _token) view returns (tuple(address tokenAddress, address creator, uint256 realEthReserve, uint256 realTokenReserve, uint256 k, uint256 dexReserve, uint256 creatorFees, uint256 platformFees, bool graduated, uint256 createdAt, uint256 totalVolume, uint256 tradeCount))',
];

class TokenMetricsService {
  private provider: ethers.JsonRpcProvider;
  private factory: ethers.Contract;

  constructor() {
    const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://base-sepolia.drpc.org';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, this.provider);
  }

  /**
   * Update metrics for a single token
   */
  async updateTokenMetrics(tokenAddress: string) {
    try {
      // Get on-chain data
      const [price, marketCap, progress, tokenInfo] = await Promise.all([
        this.factory.getTokenPrice(tokenAddress).catch(() => BigInt(0)),
        this.factory.calculateMarketCap(tokenAddress).catch(() => BigInt(0)),
        this.factory.bondingProgress(tokenAddress).catch(() => BigInt(0)),
        this.factory.tokenInfo(tokenAddress).catch(() => null),
      ]);

      // Price is in wei per token, market cap is in wei
      // Convert price: price is ETH amount for 1 token (in wei)
      const priceInETH = parseFloat(ethers.formatEther(price));
      const priceInUSD = priceInETH * ETH_PRICE_USD;
      
      // Market cap is total value in wei
      const marketCapInETH = parseFloat(ethers.formatEther(marketCap));
      const marketCapInUSD = marketCapInETH * ETH_PRICE_USD;
      
      // Calculate bonding progress based on market cap vs $69k graduation threshold
      const graduationThreshold = 69000;
      const progressPercentage = marketCapInUSD > 0 
        ? Math.min((marketCapInUSD / graduationThreshold) * 100, 100)
        : 0;

      // Get 24h change from trades
      const change24h = await this.calculate24hChange(tokenAddress);
      const volume24h = await this.calculate24hVolume(tokenAddress);

      // Update database
      const token = await db.token.findUnique({
        where: { address: tokenAddress }
      });

      if (token) {
        await db.token.update({
          where: { address: tokenAddress },
          data: {
            currentPrice: priceInUSD.toString(),
            marketCap: marketCapInUSD.toString(),
            liquidity: tokenInfo ? ethers.formatEther(tokenInfo.realEthReserve) : '0',
            bondingProgress: progressPercentage,
            volume24h: volume24h.toString(),
            change24h: change24h,
            updatedAt: new Date(),
          }
        });
      }

      return {
        price: priceInUSD,
        marketCap: marketCapInUSD,
        bondingProgress: progressPercentage,
        volume24h,
        change24h,
      };
    } catch (error) {
      console.error(`Error updating metrics for ${tokenAddress}:`, error);
      throw error;
    }
  }

  /**
   * Calculate 24h price change
   */
  async calculate24hChange(tokenAddress: string): Promise<number> {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get trades from last 24h
      const trades = await db.trade.findMany({
        where: {
          token: { address: tokenAddress },
          timestamp: { gte: yesterday }
        },
        orderBy: { timestamp: 'asc' }
      });

      if (trades.length < 2) return 0;

      // Get first and last price
      const firstPrice = parseFloat(trades[0].price);
      const lastPrice = parseFloat(trades[trades.length - 1].price);

      if (firstPrice === 0) return 0;

      // Calculate percentage change
      const change = ((lastPrice - firstPrice) / firstPrice) * 100;
      return change;
    } catch (error) {
      console.error(`Error calculating 24h change for ${tokenAddress}:`, error);
      return 0;
    }
  }

  /**
   * Calculate 24h volume
   */
  async calculate24hVolume(tokenAddress: string): Promise<number> {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Sum volume from last 24h
      const trades = await db.trade.findMany({
        where: {
          token: { address: tokenAddress },
          timestamp: { gte: yesterday }
        }
      });

      let totalVolume = 0;
      for (const trade of trades) {
        if (trade.type === 'BUY') {
          totalVolume += parseFloat(trade.totalCost || '0');
        } else {
          totalVolume += parseFloat(trade.totalReceived || '0');
        }
      }

      // Convert to USD
      return totalVolume * ETH_PRICE_USD;
    } catch (error) {
      console.error(`Error calculating 24h volume for ${tokenAddress}:`, error);
      return 0;
    }
  }

  /**
   * Update all active tokens
   */
  async updateAllTokens() {
    try {
      console.log('Starting token metrics update...');
      
      const tokens = await db.token.findMany({
        where: { status: 'ACTIVE' },
        select: { address: true }
      });

      console.log(`Updating metrics for ${tokens.length} tokens...`);

      // Update in batches to avoid overloading
      const batchSize = 5;
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        await Promise.all(
          batch.map(token => this.updateTokenMetrics(token.address))
        );
        
        // Small delay between batches
        if (i + batchSize < tokens.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('Token metrics update completed');
    } catch (error) {
      console.error('Error updating all tokens:', error);
    }
  }
}

export const tokenMetricsService = new TokenMetricsService();