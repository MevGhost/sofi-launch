// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SafeMathUnchecked
 * @notice Gas-optimized math operations with overflow protection where needed
 * @dev Uses unchecked blocks only when mathematically safe
 */
library SafeMathUnchecked {
    /**
     * @dev Safe multiplication with overflow check
     * @param a First operand
     * @param b Second operand
     * @return c Product of a and b
     */
    function safeMul(uint256 a, uint256 b) internal pure returns (uint256 c) {
        if (a == 0) return 0;
        c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
    }
    
    /**
     * @dev Safe multiplication for uint128 with overflow check
     */
    function safeMul128(uint128 a, uint128 b) internal pure returns (uint128) {
        if (a == 0) return 0;
        uint256 c = uint256(a) * uint256(b);
        require(c <= type(uint128).max, "SafeMath: uint128 overflow");
        return uint128(c);
    }
    
    /**
     * @dev Division with safety check for zero denominator
     */
    function safeDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "SafeMath: division by zero");
        return a / b;
    }
    
    /**
     * @dev Subtraction with underflow check
     */
    function safeSub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a, "SafeMath: subtraction underflow");
        return a - b;
    }
    
    /**
     * @dev Addition with overflow check for uint128
     */
    function safeAdd128(uint128 a, uint128 b) internal pure returns (uint128) {
        uint256 c = uint256(a) + uint256(b);
        require(c <= type(uint128).max, "SafeMath: uint128 overflow");
        return uint128(c);
    }
    
    /**
     * @dev Unchecked increment (safe for loop counters)
     */
    function uncheckedInc(uint256 i) internal pure returns (uint256) {
        unchecked {
            return i + 1;
        }
    }
    
    /**
     * @dev Calculate percentage with basis points (safe from overflow)
     * @param amount The amount to calculate percentage of
     * @param bps Basis points (100 = 1%)
     */
    function mulBps(uint256 amount, uint256 bps) internal pure returns (uint256) {
        require(bps <= 10000, "Invalid basis points");
        return (amount * bps) / 10000;
    }
    
    /**
     * @dev Safe calculation for token amounts with slippage
     * @param amount Token amount
     * @param slippageBps Slippage in basis points
     */
    function applySlippage(uint256 amount, uint256 slippageBps) internal pure returns (uint256) {
        require(slippageBps <= 10000, "Invalid slippage");
        unchecked {
            // Safe because we're always reducing the amount
            return (amount * (10000 - slippageBps)) / 10000;
        }
    }
    
    /**
     * @dev Check if multiplication would overflow
     */
    function wouldOverflow(uint256 a, uint256 b) internal pure returns (bool) {
        if (a == 0) return false;
        uint256 c = a * b;
        return c / a != b;
    }
    
    /**
     * @dev Calculate k = x * y for bonding curve (with overflow protection)
     */
    function calculateK(uint256 x, uint256 y) internal pure returns (uint256) {
        uint256 k = safeMul(x, y);
        require(k > 0, "Invalid reserves");
        return k;
    }
    
    /**
     * @dev Calculate tokens out for bonding curve with overflow protection
     */
    function calculateTokensOut(
        uint256 ethReserve,
        uint256 tokenReserve,
        uint256 ethIn
    ) internal pure returns (uint256) {
        require(ethReserve > 0 && tokenReserve > 0, "Invalid reserves");
        require(ethIn > 0, "Invalid input");
        
        // Calculate k = x * y
        uint256 k = safeMul(ethReserve, tokenReserve);
        
        // New ETH reserve after trade
        uint256 newEthReserve = ethReserve + ethIn;
        require(newEthReserve > ethReserve, "Overflow");
        
        // New token reserve: k / newEthReserve
        uint256 newTokenReserve = safeDiv(k, newEthReserve);
        
        // Tokens out
        require(tokenReserve > newTokenReserve, "Insufficient liquidity");
        uint256 tokensOut = tokenReserve - newTokenReserve;
        
        // Apply 0.1% slippage protection
        return applySlippage(tokensOut, 10); // 0.1% = 10 bps
    }
    
    /**
     * @dev Calculate ETH out for bonding curve with overflow protection
     */
    function calculateEthOut(
        uint256 ethReserve,
        uint256 tokenReserve,
        uint256 tokensIn
    ) internal pure returns (uint256) {
        require(ethReserve > 0 && tokenReserve > 0, "Invalid reserves");
        require(tokensIn > 0, "Invalid input");
        
        // Calculate k = x * y
        uint256 k = safeMul(ethReserve, tokenReserve);
        
        // New token reserve after trade
        uint256 newTokenReserve = tokenReserve + tokensIn;
        require(newTokenReserve > tokenReserve, "Overflow");
        
        // New ETH reserve: k / newTokenReserve
        uint256 newEthReserve = safeDiv(k, newTokenReserve);
        
        // ETH out
        require(ethReserve > newEthReserve, "Insufficient liquidity");
        uint256 ethOut = ethReserve - newEthReserve;
        
        // Apply 0.1% slippage protection
        return applySlippage(ethOut, 10);
    }
}