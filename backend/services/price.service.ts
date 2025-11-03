import axios from 'axios';
import { escrowCache } from './cache.service';
import logger from './logger.service';

class PriceService {
  private readonly CACHE_KEY = 'eth:price:usd';
  private readonly CACHE_TTL = 60; // Cache for 1 minute
  private readonly FALLBACK_PRICE = 3000; // Fallback price if API fails

  /**
   * Get ETH price in USD from CoinGecko API (free tier)
   */
  async getETHPriceUSD(): Promise<number> {
    try {
      // Check cache first
      const cached = await escrowCache.get(this.CACHE_KEY);
      if (cached) {
        return Number(cached);
      }

      // Fetch from CoinGecko API (no API key required for basic usage)
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: {
            ids: 'ethereum',
            vs_currencies: 'usd'
          },
          timeout: 5000 // 5 second timeout
        }
      );

      const price = response.data?.ethereum?.usd;
      
      if (!price || typeof price !== 'number') {
        throw new Error('Invalid price response from CoinGecko');
      }

      // Cache the price
      await escrowCache.set(this.CACHE_KEY, price, this.CACHE_TTL);
      
      logger.debug(`ETH price fetched: $${price}`);
      return price;
      
    } catch (error) {
      logger.warn('Failed to fetch ETH price from CoinGecko, trying alternative...', error);
      
      // Try alternative API (Binance public API)
      try {
        const response = await axios.get(
          'https://api.binance.com/api/v3/ticker/price',
          {
            params: {
              symbol: 'ETHUSDT'
            },
            timeout: 5000
          }
        );
        
        const price = parseFloat(response.data?.price);
        
        if (!price || isNaN(price)) {
          throw new Error('Invalid price response from Binance');
        }
        
        // Cache the price
        await escrowCache.set(this.CACHE_KEY, price, this.CACHE_TTL);
        
        logger.debug(`ETH price fetched from Binance: $${price}`);
        return price;
        
      } catch (binanceError) {
        logger.error('Failed to fetch ETH price from all sources, using fallback', binanceError);
        
        // Return fallback price
        return this.FALLBACK_PRICE;
      }
    }
  }

  /**
   * Convert ETH amount to USD
   */
  async convertETHToUSD(ethAmount: number | string): Promise<number> {
    const eth = typeof ethAmount === 'string' ? parseFloat(ethAmount) : ethAmount;
    const price = await this.getETHPriceUSD();
    return eth * price;
  }

  /**
   * Convert USD amount to ETH
   */
  async convertUSDToETH(usdAmount: number | string): Promise<number> {
    const usd = typeof usdAmount === 'string' ? parseFloat(usdAmount) : usdAmount;
    const price = await this.getETHPriceUSD();
    return usd / price;
  }
}

// Export singleton instance
export const priceService = new PriceService();