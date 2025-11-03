declare class PriceService {
    private readonly CACHE_KEY;
    private readonly CACHE_TTL;
    private readonly FALLBACK_PRICE;
    /**
     * Get ETH price in USD from CoinGecko API (free tier)
     */
    getETHPriceUSD(): Promise<number>;
    /**
     * Convert ETH amount to USD
     */
    convertETHToUSD(ethAmount: number | string): Promise<number>;
    /**
     * Convert USD amount to ETH
     */
    convertUSDToETH(usdAmount: number | string): Promise<number>;
}
export declare const priceService: PriceService;
export {};
//# sourceMappingURL=price.service.d.ts.map