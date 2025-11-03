"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.priceService = void 0;
const axios_1 = __importDefault(require("axios"));
const cache_service_1 = require("./cache.service");
const logger_service_1 = __importDefault(require("./logger.service"));
class PriceService {
    CACHE_KEY = 'eth:price:usd';
    CACHE_TTL = 60; // Cache for 1 minute
    FALLBACK_PRICE = 3000; // Fallback price if API fails
    /**
     * Get ETH price in USD from CoinGecko API (free tier)
     */
    async getETHPriceUSD() {
        try {
            // Check cache first
            const cached = await cache_service_1.escrowCache.get(this.CACHE_KEY);
            if (cached) {
                return Number(cached);
            }
            // Fetch from CoinGecko API (no API key required for basic usage)
            const response = await axios_1.default.get('https://api.coingecko.com/api/v3/simple/price', {
                params: {
                    ids: 'ethereum',
                    vs_currencies: 'usd'
                },
                timeout: 5000 // 5 second timeout
            });
            const price = response.data?.ethereum?.usd;
            if (!price || typeof price !== 'number') {
                throw new Error('Invalid price response from CoinGecko');
            }
            // Cache the price
            await cache_service_1.escrowCache.set(this.CACHE_KEY, price, this.CACHE_TTL);
            logger_service_1.default.debug(`ETH price fetched: $${price}`);
            return price;
        }
        catch (error) {
            logger_service_1.default.warn('Failed to fetch ETH price from CoinGecko, trying alternative...', error);
            // Try alternative API (Binance public API)
            try {
                const response = await axios_1.default.get('https://api.binance.com/api/v3/ticker/price', {
                    params: {
                        symbol: 'ETHUSDT'
                    },
                    timeout: 5000
                });
                const price = parseFloat(response.data?.price);
                if (!price || isNaN(price)) {
                    throw new Error('Invalid price response from Binance');
                }
                // Cache the price
                await cache_service_1.escrowCache.set(this.CACHE_KEY, price, this.CACHE_TTL);
                logger_service_1.default.debug(`ETH price fetched from Binance: $${price}`);
                return price;
            }
            catch (binanceError) {
                logger_service_1.default.error('Failed to fetch ETH price from all sources, using fallback', binanceError);
                // Return fallback price
                return this.FALLBACK_PRICE;
            }
        }
    }
    /**
     * Convert ETH amount to USD
     */
    async convertETHToUSD(ethAmount) {
        const eth = typeof ethAmount === 'string' ? parseFloat(ethAmount) : ethAmount;
        const price = await this.getETHPriceUSD();
        return eth * price;
    }
    /**
     * Convert USD amount to ETH
     */
    async convertUSDToETH(usdAmount) {
        const usd = typeof usdAmount === 'string' ? parseFloat(usdAmount) : usdAmount;
        const price = await this.getETHPriceUSD();
        return usd / price;
    }
}
// Export singleton instance
exports.priceService = new PriceService();
//# sourceMappingURL=price.service.js.map