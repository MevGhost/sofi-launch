// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/ITokenFactoryV2.sol";
import "../interfaces/IBondingCurveV2.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @title TokenRegistry
 * @notice Helper contract for efficient batch queries of token data
 * @dev Reduces RPC calls for frontend integration
 */
contract TokenRegistry {
    
    struct TokenInfo {
        address tokenAddress;
        string name;
        string symbol;
        uint256 totalSupply;
        address creator;
        uint256 createdAt;
        ITokenFactoryV2.TokenCategory category;
    }
    
    struct TokenMetrics {
        uint256 currentPrice;
        uint256 marketCap;
        uint256 tradeCount;
        uint256 totalVolume;
        uint256 holders; // Approximate from bonding curve
        bool graduated;
    }
    
    struct DetailedTokenInfo {
        TokenInfo info;
        TokenMetrics metrics;
        uint256 userBalance;
        uint256 ethReserve;
        uint256 tokenReserve;
    }
    
    ITokenFactoryV2 public immutable factory;
    IBondingCurveV2 public immutable bondingCurve;
    
    constructor(address _factory, address _bondingCurve) {
        require(_factory != address(0), "Invalid factory");
        require(_bondingCurve != address(0), "Invalid bonding curve");
        factory = ITokenFactoryV2(_factory);
        bondingCurve = IBondingCurveV2(_bondingCurve);
    }
    
    /**
     * @notice Get detailed info for multiple tokens
     * @param tokens Array of token addresses
     * @param user User address for balance queries
     * @return infos Array of detailed token information
     */
    function getTokensInfo(
        address[] calldata tokens,
        address user
    ) external view returns (DetailedTokenInfo[] memory infos) {
        infos = new DetailedTokenInfo[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            infos[i] = getTokenInfo(tokens[i], user);
        }
        
        return infos;
    }
    
    /**
     * @notice Get detailed info for a single token
     * @param token Token address
     * @param user User address for balance queries
     * @return info Detailed token information
     */
    function getTokenInfo(
        address token,
        address user
    ) public view returns (DetailedTokenInfo memory info) {
        require(factory.isValidToken(token), "Invalid token");
        
        // Get basic info
        IERC20Metadata tokenContract = IERC20Metadata(token);
        info.info.tokenAddress = token;
        info.info.name = tokenContract.name();
        info.info.symbol = tokenContract.symbol();
        info.info.totalSupply = tokenContract.totalSupply();
        info.info.category = factory.tokenCategory(token);
        
        // Get bonding curve info
        IBondingCurveV2.TokenInfo memory curveInfo = bondingCurve.tokenInfo(token);
        info.info.creator = curveInfo.creator;
        info.info.createdAt = curveInfo.createdAt;
        
        // Get metrics
        (
            uint256 tradeCount,
            uint256 totalVolume,
            uint256 currentPrice,
            uint256 marketCap,
            uint256 realEthReserve,
            uint256 realTokenReserve
        ) = bondingCurve.getTradingMetrics(token);
        
        info.metrics.currentPrice = currentPrice;
        info.metrics.marketCap = marketCap;
        info.metrics.tradeCount = tradeCount;
        info.metrics.totalVolume = totalVolume;
        info.metrics.holders = tradeCount / 2; // Rough estimate
        info.metrics.graduated = curveInfo.graduated;
        
        // Get reserves
        info.ethReserve = realEthReserve;
        info.tokenReserve = realTokenReserve;
        
        // Get user balance if provided
        if (user != address(0)) {
            info.userBalance = tokenContract.balanceOf(user);
        }
        
        return info;
    }
    
    /**
     * @notice Get tokens by category with full info
     * @param category Token category
     * @param offset Starting index
     * @param limit Number of tokens
     * @param user User address for balance queries
     * @return infos Array of detailed token information
     */
    function getTokensByCategory(
        ITokenFactoryV2.TokenCategory category,
        uint256 offset,
        uint256 limit,
        address user
    ) external view returns (DetailedTokenInfo[] memory infos) {
        address[] memory tokens = factory.getTokensByCategory(category, offset, limit);
        infos = new DetailedTokenInfo[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            infos[i] = getTokenInfo(tokens[i], user);
        }
        
        return infos;
    }
    
    /**
     * @notice Get trending tokens (highest volume in last 100 blocks)
     * @param limit Number of tokens to return
     * @return tokens Array of trending token addresses
     */
    function getTrendingTokens(uint256 limit) external view returns (address[] memory tokens) {
        uint256 totalTokens = factory.totalTokensCreated();
        if (totalTokens == 0) return new address[](0);
        
        // Create array to store tokens and their volumes
        address[] memory allTokens = new address[](totalTokens);
        uint256[] memory volumes = new uint256[](totalTokens);
        
        // Get all tokens and their volumes
        for (uint256 i = 0; i < totalTokens; i++) {
            address token = factory.tokenByIndex(i);
            allTokens[i] = token;
            (, volumes[i], , , , ) = bondingCurve.getTradingMetrics(token);
        }
        
        // Simple bubble sort for top N (efficient for small limits)
        for (uint256 i = 0; i < limit && i < totalTokens; i++) {
            for (uint256 j = i + 1; j < totalTokens; j++) {
                if (volumes[j] > volumes[i]) {
                    // Swap
                    uint256 tempVolume = volumes[i];
                    volumes[i] = volumes[j];
                    volumes[j] = tempVolume;
                    
                    address tempToken = allTokens[i];
                    allTokens[i] = allTokens[j];
                    allTokens[j] = tempToken;
                }
            }
        }
        
        // Return top tokens
        uint256 resultSize = limit < totalTokens ? limit : totalTokens;
        tokens = new address[](resultSize);
        for (uint256 i = 0; i < resultSize; i++) {
            tokens[i] = allTokens[i];
        }
        
        return tokens;
    }
    
    /**
     * @notice Search tokens by creator with pagination
     * @param creator Creator address
     * @param offset Starting index
     * @param limit Number of tokens
     * @param user User address for balance queries
     * @return infos Array of detailed token information
     */
    function getTokensByCreator(
        address creator,
        uint256 offset,
        uint256 limit,
        address user
    ) external view returns (DetailedTokenInfo[] memory infos) {
        address[] memory creatorTokens = factory.getTokensByCreator(creator);
        
        uint256 end = offset + limit;
        if (end > creatorTokens.length) {
            end = creatorTokens.length;
        }
        
        require(offset < creatorTokens.length, "Offset out of bounds");
        
        infos = new DetailedTokenInfo[](end - offset);
        for (uint256 i = 0; i < infos.length; i++) {
            infos[i] = getTokenInfo(creatorTokens[offset + i], user);
        }
        
        return infos;
    }
    
    /**
     * @notice Get recently created tokens
     * @param limit Number of tokens to return
     * @return tokens Array of recently created token addresses
     */
    function getRecentTokens(uint256 limit) external view returns (address[] memory tokens) {
        uint256 totalTokens = factory.totalTokensCreated();
        if (totalTokens == 0) return new address[](0);
        
        uint256 resultSize = limit < totalTokens ? limit : totalTokens;
        tokens = new address[](resultSize);
        
        // Get most recent tokens (highest indices)
        for (uint256 i = 0; i < resultSize; i++) {
            tokens[i] = factory.tokenByIndex(totalTokens - 1 - i);
        }
        
        return tokens;
    }
}