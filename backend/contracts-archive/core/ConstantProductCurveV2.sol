// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BondingCurveBaseV2.sol";

/**
 * @title ConstantProductCurve
 * @notice Implements the constant product bonding curve formula (x * y = k)
 * @dev This is the same formula used by Uniswap V2 and proven by Toshi
 * 
 * Mathematical Foundation:
 * - The constant product formula ensures that the product of reserves remains constant
 * - When buying: (x + Δx) * (y - Δy) = x * y = k
 * - When selling: (x - Δx) * (y + Δy) = x * y = k
 * - Price at any point: P = x / y (ETH per token)
 * - Price impact increases with trade size, providing natural slippage
 */
contract ConstantProductCurve is BondingCurveBase {
    
    constructor(
        address _feeRecipient,
        address _ethUsdPriceFeed
    ) BondingCurveBase(_feeRecipient, _ethUsdPriceFeed) {}

    /**
     * @notice Calculate tokens received for a given ETH input
     * @dev Formula: Δy = (y * Δx) / (x + Δx)
     * 
     * Mathematical Explanation:
     * Given: k = x * y (constant)
     * After trade: k = (x + Δx) * (y - Δy)
     * Therefore: x * y = (x + Δx) * (y - Δy)
     * Solving for Δy: Δy = y - (x * y) / (x + Δx)
     *                 Δy = y * (1 - x / (x + Δx))
     *                 Δy = y * Δx / (x + Δx)
     * 
     * @param token The token address
     * @param ethIn Amount of ETH to spend (after fees)
     * @return tokensOut Amount of tokens to receive
     */
    function calculateTokensOut(
        address token,
        uint256 ethIn
    ) public view override returns (uint256 tokensOut) {
        TokenInfo memory info = tokenInfo[token];
        require(info.createdAt > 0, "Token does not exist");
        require(ethIn > 0, "Invalid ETH amount");
        
        uint256 ethReserve = info.virtualEthReserve;
        uint256 tokenReserve = info.virtualTokenReserve;
        
        // Prevent division by zero and overflow
        require(ethReserve > 0 && tokenReserve > 0, "Invalid reserves");
        
        // Use unchecked for gas optimization (overflow unlikely with realistic values)
        unchecked {
            // Calculate k (constant product)
            uint256 k = ethReserve * tokenReserve;
            
            // New ETH reserve after adding input
            uint256 newEthReserve = ethReserve + ethIn;
            
            // Calculate new token reserve to maintain k
            uint256 newTokenReserve = k / newEthReserve;
            
            // Tokens to send = current reserve - new reserve
            tokensOut = tokenReserve - newTokenReserve;
            
            // Apply a small rounding protection (0.1%)
            // This prevents rounding errors from draining the pool
            tokensOut = (tokensOut * 999) / 1000;
        }
        
        return tokensOut;
    }

    /**
     * @notice Calculate ETH received for a given token input
     * @dev Formula: Δx = (x * Δy) / (y + Δy)
     * 
     * Mathematical Explanation:
     * Given: k = x * y (constant)
     * After trade: k = (x - Δx) * (y + Δy)
     * Therefore: x * y = (x - Δx) * (y + Δy)
     * Solving for Δx: Δx = x - (x * y) / (y + Δy)
     *                 Δx = x * (1 - y / (y + Δy))
     *                 Δx = x * Δy / (y + Δy)
     * 
     * @param token The token address
     * @param tokensIn Amount of tokens to sell
     * @return ethOut Amount of ETH to receive (before fees)
     */
    function calculateEthOut(
        address token,
        uint256 tokensIn
    ) public view override returns (uint256 ethOut) {
        TokenInfo memory info = tokenInfo[token];
        require(info.createdAt > 0, "Token does not exist");
        require(tokensIn > 0, "Invalid token amount");
        
        uint256 ethReserve = info.virtualEthReserve;
        uint256 tokenReserve = info.virtualTokenReserve;
        
        // Prevent division by zero and overflow
        require(ethReserve > 0 && tokenReserve > 0, "Invalid reserves");
        
        // Use unchecked for gas optimization
        unchecked {
            // Calculate k (constant product)
            uint256 k = ethReserve * tokenReserve;
            
            // New token reserve after adding input
            uint256 newTokenReserve = tokenReserve + tokensIn;
            
            // Calculate new ETH reserve to maintain k
            uint256 newEthReserve = k / newTokenReserve;
            
            // ETH to send = current reserve - new reserve
            ethOut = ethReserve - newEthReserve;
            
            // Apply a small rounding protection (0.1%)
            ethOut = (ethOut * 999) / 1000;
        }
        
        return ethOut;
    }

    /**
     * @notice Get the spot price for buying tokens (ETH required per token)
     * @dev This includes the fee impact on the effective price
     * @param token The token address
     * @param tokenAmount Amount of tokens to buy
     * @return ethRequired Total ETH required including fees
     */
    function getBuyPrice(
        address token,
        uint256 tokenAmount
    ) external view returns (uint256 ethRequired) {
        require(tokenAmount > 0, "Invalid token amount");
        
        TokenInfo memory info = tokenInfo[token];
        require(info.createdAt > 0, "Token does not exist");
        
        // Calculate ETH needed for the token amount
        uint256 ethReserve = info.virtualEthReserve;
        uint256 tokenReserve = info.virtualTokenReserve;
        
        unchecked {
            // To get exactly tokenAmount, we need to solve:
            // tokenAmount = (tokenReserve * ethNeeded) / (ethReserve + ethNeeded)
            // Rearranging: ethNeeded = (tokenAmount * ethReserve) / (tokenReserve - tokenAmount)
            
            require(tokenReserve > tokenAmount, "Insufficient liquidity");
            
            uint256 ethNeeded = (tokenAmount * ethReserve) / (tokenReserve - tokenAmount);
            
            // Add 0.1% buffer for rounding
            ethNeeded = (ethNeeded * 1001) / 1000;
            
            // Add fees
            uint256 totalFees = PLATFORM_FEE_BPS + CREATOR_FEE_BPS;
            ethRequired = (ethNeeded * BPS_DENOMINATOR) / (BPS_DENOMINATOR - totalFees);
        }
        
        return ethRequired;
    }

    /**
     * @notice Get the spot price for selling tokens (ETH received per token)
     * @dev This includes the fee deduction from the output
     * @param token The token address
     * @param tokenAmount Amount of tokens to sell
     * @return ethReceived Net ETH received after fees
     */
    function getSellPrice(
        address token,
        uint256 tokenAmount
    ) external view returns (uint256 ethReceived) {
        uint256 ethOut = calculateEthOut(token, tokenAmount);
        
        unchecked {
            // Deduct fees from output
            uint256 totalFees = PLATFORM_FEE_BPS + CREATOR_FEE_BPS;
            ethReceived = (ethOut * (BPS_DENOMINATOR - totalFees)) / BPS_DENOMINATOR;
        }
        
        return ethReceived;
    }

    /**
     * @notice Calculate the constant product k
     * @param token The token address
     * @return k The constant product value
     */
    function getConstantProduct(address token) external view returns (uint256 k) {
        TokenInfo memory info = tokenInfo[token];
        require(info.createdAt > 0, "Token does not exist");
        
        unchecked {
            k = uint256(info.virtualEthReserve) * uint256(info.virtualTokenReserve);
        }
        
        return k;
    }

    /**
     * @notice Get the current price impact for a trade
     * @dev Price impact = |newPrice - currentPrice| / currentPrice * 100
     * @param token The token address
     * @param ethAmount ETH amount for buy (positive) or sell (negative value indicates sell)
     * @param isBuy True for buy, false for sell
     * @return priceImpactBps Price impact in basis points (100 = 1%)
     */
    function getPriceImpact(
        address token,
        uint256 ethAmount,
        bool isBuy
    ) external view returns (uint256 priceImpactBps) {
        TokenInfo memory info = tokenInfo[token];
        require(info.createdAt > 0, "Token does not exist");
        
        uint256 currentPrice = getCurrentPrice(token);
        uint256 newPrice;
        
        unchecked {
            if (isBuy) {
                // Calculate price after buy
                uint256 tokensOut = calculateTokensOut(token, ethAmount);
                uint256 newEthReserve = info.virtualEthReserve + ethAmount;
                uint256 newTokenReserve = info.virtualTokenReserve - tokensOut;
                newPrice = (newEthReserve * 10**18) / newTokenReserve;
            } else {
                // For sell, ethAmount represents tokens to sell
                uint256 ethOut = calculateEthOut(token, ethAmount);
                uint256 newEthReserve = info.virtualEthReserve - ethOut;
                uint256 newTokenReserve = info.virtualTokenReserve + ethAmount;
                newPrice = (newEthReserve * 10**18) / newTokenReserve;
            }
            
            // Calculate price impact
            uint256 priceDiff = newPrice > currentPrice ? 
                newPrice - currentPrice : currentPrice - newPrice;
            
            priceImpactBps = (priceDiff * 10000) / currentPrice;
        }
        
        return priceImpactBps;
    }

    /**
     * @notice Get all reserves for a token
     * @param token The token address
     */
    function getReserves(address token) external view returns (
        uint256 virtualEthReserve,
        uint256 virtualTokenReserve,
        uint256 realEthReserve,
        uint256 realTokenReserve,
        uint256 k
    ) {
        TokenInfo memory info = tokenInfo[token];
        
        unchecked {
            k = uint256(info.virtualEthReserve) * uint256(info.virtualTokenReserve);
        }
        
        return (
            info.virtualEthReserve,
            info.virtualTokenReserve,
            info.realEthReserve,
            info.realTokenReserve,
            k
        );
    }

    /**
     * @notice Get maximum buy amount to prevent excessive slippage
     * @dev Limits buy to 10% of token reserve to maintain reasonable liquidity
     * @param token The token address
     */
    function getMaxBuyAmount(address token) external view returns (uint256) {
        TokenInfo memory info = tokenInfo[token];
        require(info.createdAt > 0, "Token does not exist");
        
        unchecked {
            return info.realTokenReserve / 10;
        }
    }

    /**
     * @notice Get maximum sell amount to prevent excessive slippage
     * @dev Limits sell to 10% of token reserve
     * @param token The token address
     */
    function getMaxSellAmount(address token) external view returns (uint256) {
        TokenInfo memory info = tokenInfo[token];
        require(info.createdAt > 0, "Token does not exist");
        
        unchecked {
            // Maximum 10% of current token reserve can be sold
            return info.virtualTokenReserve / 10;
        }
    }
}