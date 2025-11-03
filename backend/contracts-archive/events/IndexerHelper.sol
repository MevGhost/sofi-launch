// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IBondingCurveV2.sol";
import "../interfaces/ITokenFactoryV2.sol";
import "./IEventEmitter.sol";

/**
 * @title IndexerHelper
 * @notice Helper contract for efficient off-chain data indexing
 * @dev Provides batch queries and aggregated data for indexers
 */
contract IndexerHelper {
    struct TokenInfo {
        address token;
        address creator;
        string name;
        string symbol;
        uint256 currentPrice;
        uint256 marketCap;
        uint256 liquidity;
        uint256 volume24h;
        uint256 holders;
        uint256 createdAt;
        bool isGraduated;
        address uniswapPool;
    }
    
    struct TradeInfo {
        address trader;
        bool isBuy;
        uint256 ethAmount;
        uint256 tokenAmount;
        uint256 price;
        uint256 timestamp;
        uint256 blockNumber;
    }
    
    struct TokenMetrics {
        uint256 price;
        uint256 priceChange24h;
        uint256 volume24h;
        uint256 volumeChange24h;
        uint256 liquidity;
        uint256 marketCap;
        uint256 holders;
        uint256 trades24h;
        uint256 buyPressure; // Ratio of buys to sells
    }
    
    struct LeaderboardEntry {
        address token;
        string name;
        string symbol;
        uint256 marketCap;
        uint256 volume24h;
        uint256 priceChange24h;
        uint256 holders;
        uint256 score; // Composite score for ranking
    }
    
    IBondingCurveV2 public immutable bondingCurve;
    ITokenFactoryV2 public immutable tokenFactory;
    IEventEmitter public immutable eventEmitter;
    
    // Cache for efficient queries
    mapping(address => TokenMetrics) private metricsCache;
    mapping(address => uint256) private lastUpdateBlock;
    
    // Historical data storage
    mapping(address => mapping(uint256 => TokenMetrics)) private historicalMetrics; // token => day => metrics
    
    constructor(
        address _bondingCurve,
        address _tokenFactory,
        address _eventEmitter
    ) {
        bondingCurve = IBondingCurveV2(_bondingCurve);
        tokenFactory = ITokenFactoryV2(_tokenFactory);
        eventEmitter = IEventEmitter(_eventEmitter);
    }
    
    // ============ Batch Query Functions ============
    
    /**
     * @notice Get information for multiple tokens in a single call
     * @param tokens Array of token addresses
     * @return Array of TokenInfo structs
     */
    function batchGetTokenInfo(address[] calldata tokens) 
        external 
        view 
        returns (TokenInfo[] memory) 
    {
        TokenInfo[] memory infos = new TokenInfo[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            infos[i] = getTokenInfo(tokens[i]);
        }
        
        return infos;
    }
    
    /**
     * @notice Get detailed information for a single token
     */
    function getTokenInfo(address token) public view returns (TokenInfo memory) {
        IBondingCurveV2.TokenInfo memory curveInfo = bondingCurve.tokenInfo(token);
        
        // Get token metadata from factory events (would need event parsing in practice)
        (string memory name, string memory symbol) = _getTokenMetadata(token);
        
        return TokenInfo({
            token: token,
            creator: curveInfo.creator,
            name: name,
            symbol: symbol,
            currentPrice: bondingCurve.getCurrentPrice(token),
            marketCap: bondingCurve.getMarketCap(token),
            liquidity: curveInfo.realEthReserve,
            volume24h: _getVolume24h(token),
            holders: _getHolderCount(token),
            createdAt: curveInfo.createdAt,
            isGraduated: curveInfo.graduated,
            uniswapPool: curveInfo.uniswapPool
        });
    }
    
    /**
     * @notice Get current metrics for a token
     */
    function getTokenMetrics(address token) external view returns (TokenMetrics memory) {
        if (lastUpdateBlock[token] == block.number) {
            return metricsCache[token];
        }
        
        return _calculateMetrics(token);
    }
    
    /**
     * @notice Get top tokens by various metrics
     * @param metric 0=marketCap, 1=volume, 2=holders, 3=gainers
     * @param limit Number of tokens to return
     */
    function getLeaderboard(uint256 metric, uint256 limit) 
        external 
        view 
        returns (LeaderboardEntry[] memory) 
    {
        // In production, this would query indexed data
        // For now, return placeholder
        LeaderboardEntry[] memory entries = new LeaderboardEntry[](limit);
        return entries;
    }
    
    /**
     * @notice Get tokens created by a specific address
     */
    function getTokensByCreator(address creator) 
        external 
        view 
        returns (address[] memory) 
    {
        uint256 totalTokens = tokenFactory.totalTokensCreated();
        address[] memory creatorTokens = new address[](totalTokens);
        uint256 count = 0;
        
        for (uint256 i = 0; i < totalTokens; i++) {
            address token = tokenFactory.tokens(i);
            if (bondingCurve.tokenInfo(token).creator == creator) {
                creatorTokens[count++] = token;
            }
        }
        
        // Resize array
        assembly {
            mstore(creatorTokens, count)
        }
        
        return creatorTokens;
    }
    
    /**
     * @notice Get recently created tokens
     * @param limit Number of tokens to return
     */
    function getRecentTokens(uint256 limit) 
        external 
        view 
        returns (address[] memory) 
    {
        uint256 totalTokens = tokenFactory.totalTokensCreated();
        uint256 actualLimit = limit > totalTokens ? totalTokens : limit;
        address[] memory recent = new address[](actualLimit);
        
        uint256 startIndex = totalTokens > actualLimit ? totalTokens - actualLimit : 0;
        
        for (uint256 i = 0; i < actualLimit; i++) {
            recent[i] = tokenFactory.tokens(startIndex + i);
        }
        
        return recent;
    }
    
    /**
     * @notice Get tokens close to graduation
     * @param threshold Percentage of graduation target (e.g., 90 for 90%)
     */
    function getTokensNearGraduation(uint256 threshold) 
        external 
        view 
        returns (address[] memory) 
    {
        uint256 totalTokens = tokenFactory.totalTokensCreated();
        address[] memory nearGraduation = new address[](totalTokens);
        uint256 count = 0;
        
        uint256 graduationTarget = 69000 * 10**8; // $69k in 8 decimals
        uint256 thresholdValue = (graduationTarget * threshold) / 100;
        
        for (uint256 i = 0; i < totalTokens; i++) {
            address token = tokenFactory.tokens(i);
            uint256 marketCap = bondingCurve.getMarketCap(token);
            
            if (marketCap >= thresholdValue && !bondingCurve.tokenInfo(token).graduated) {
                nearGraduation[count++] = token;
            }
        }
        
        // Resize array
        assembly {
            mstore(nearGraduation, count)
        }
        
        return nearGraduation;
    }
    
    // ============ Historical Data Functions ============
    
    /**
     * @notice Get historical metrics for a token
     * @param token Token address
     * @param daysBack Number of days of history
     */
    function getHistoricalMetrics(address token, uint256 daysBack) 
        external 
        view 
        returns (TokenMetrics[] memory) 
    {
        TokenMetrics[] memory history = new TokenMetrics[](daysBack);
        uint256 currentDay = block.timestamp / 86400;
        
        for (uint256 i = 0; i < daysBack; i++) {
            uint256 day = currentDay - i;
            history[i] = historicalMetrics[token][day];
        }
        
        return history;
    }
    
    /**
     * @notice Calculate price change over a period
     * @param token Token address
     * @param periodSeconds Time period in seconds
     */
    function getPriceChange(address token, uint256 periodSeconds) 
        external 
        view 
        returns (int256 changePercent) 
    {
        uint256 currentPrice = bondingCurve.getCurrentPrice(token);
        uint256 historicalDay = (block.timestamp - periodSeconds) / 86400;
        uint256 historicalPrice = historicalMetrics[token][historicalDay].price;
        
        if (historicalPrice == 0) return 0;
        
        if (currentPrice >= historicalPrice) {
            changePercent = int256(((currentPrice - historicalPrice) * 10000) / historicalPrice);
        } else {
            changePercent = -int256(((historicalPrice - currentPrice) * 10000) / historicalPrice);
        }
    }
    
    // ============ Aggregation Functions ============
    
    /**
     * @notice Get protocol-wide statistics
     */
    function getProtocolStats() external view returns (
        uint256 totalTokens,
        uint256 totalVolume,
        uint256 totalLiquidity,
        uint256 graduatedTokens,
        uint256 activeTraders
    ) {
        totalTokens = tokenFactory.totalTokensCreated();
        
        for (uint256 i = 0; i < totalTokens; i++) {
            address token = tokenFactory.tokens(i);
            IBondingCurveV2.TokenInfo memory info = bondingCurve.tokenInfo(token);
            
            totalLiquidity += info.realEthReserve;
            if (info.graduated) graduatedTokens++;
            
            // Volume calculation would need event parsing
            totalVolume += _getVolume24h(token);
        }
        
        // Active traders would need event parsing
        activeTraders = 0; // Placeholder
    }
    
    /**
     * @notice Search tokens by name or symbol
     * @param query Search string
     */
    function searchTokens(string calldata query) 
        external 
        view 
        returns (address[] memory) 
    {
        // This would require maintaining a name/symbol index
        // Placeholder implementation
        address[] memory results = new address[](0);
        return results;
    }
    
    // ============ Internal Helper Functions ============
    
    function _calculateMetrics(address token) private view returns (TokenMetrics memory) {
        IBondingCurveV2.TokenInfo memory info = bondingCurve.tokenInfo(token);
        
        return TokenMetrics({
            price: bondingCurve.getCurrentPrice(token),
            priceChange24h: 0, // Would need historical data
            volume24h: _getVolume24h(token),
            volumeChange24h: 0, // Would need historical data
            liquidity: info.realEthReserve,
            marketCap: bondingCurve.getMarketCap(token),
            holders: _getHolderCount(token),
            trades24h: 0, // Would need event counting
            buyPressure: 50 // Default 50% (balanced)
        });
    }
    
    function _getTokenMetadata(address token) private view returns (string memory, string memory) {
        // In practice, this would parse TokenCreated events
        // For now, return placeholders
        return ("Token", "TKN");
    }
    
    function _getVolume24h(address token) private view returns (uint256) {
        // Would calculate from events in last 24h
        return 0;
    }
    
    function _getHolderCount(address token) private view returns (uint256) {
        // Would track unique addresses from Transfer events
        return 0;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update cached metrics for gas optimization
     * @param tokens Array of tokens to update
     */
    function updateMetricsCache(address[] calldata tokens) external {
        for (uint256 i = 0; i < tokens.length; i++) {
            metricsCache[tokens[i]] = _calculateMetrics(tokens[i]);
            lastUpdateBlock[tokens[i]] = block.number;
        }
    }
    
    /**
     * @notice Store historical snapshot (called by indexer)
     */
    function storeHistoricalSnapshot(address token, TokenMetrics calldata metrics) external {
        uint256 day = block.timestamp / 86400;
        historicalMetrics[token][day] = metrics;
    }
}