// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./SecureBondingCurve.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SecureConstantProductCurve
 * @notice Production-ready constant product bonding curve with all security features
 */
contract SecureConstantProductCurve is SecureBondingCurve {
    using SafeERC20 for IERC20;
    
    constructor(
        address _feeRecipient,
        address _ethUsdPriceFeed,
        address _swapRouter,
        address _weth
    ) SecureBondingCurve(_feeRecipient, _ethUsdPriceFeed, _swapRouter, _weth) {}

    /**
     * @notice Calculate tokens received for ETH input
     * @param token The token address
     * @param ethIn Amount of ETH to spend (after fees)
     * @return tokensOut Amount of tokens to receive
     */
    function calculateTokensOut(
        address token,
        uint256 ethIn
    ) public view override returns (uint256 tokensOut) {
        SecureTokenInfo memory info = _tokenInfo[token];
        require(info.createdAt > 0, "Token does not exist");
        require(ethIn > 0, "Invalid ETH amount");
        
        uint256 ethReserve = info.virtualEthReserve;
        uint256 tokenReserve = info.virtualTokenReserve;
        
        require(ethReserve > 0 && tokenReserve > 0, "Invalid reserves");
        
        unchecked {
            // k = x * y
            uint256 k = ethReserve * tokenReserve;
            
            // New ETH reserve after adding input
            uint256 newEthReserve = ethReserve + ethIn;
            
            // New token reserve to maintain k
            uint256 newTokenReserve = k / newEthReserve;
            
            // Tokens out
            tokensOut = tokenReserve - newTokenReserve;
            
            // Apply 0.1% rounding protection
            tokensOut = (tokensOut * 999) / 1000;
        }
        
        // Security check
        require(tokensOut <= info.realTokenReserve, "Insufficient liquidity");
        
        return tokensOut;
    }

    /**
     * @notice Calculate ETH received for token input
     * @param token The token address
     * @param tokensIn Amount of tokens to sell
     * @return ethOut Amount of ETH to receive (before fees)
     */
    function calculateEthOut(
        address token,
        uint256 tokensIn
    ) public view override returns (uint256 ethOut) {
        SecureTokenInfo memory info = _tokenInfo[token];
        require(info.createdAt > 0, "Token does not exist");
        require(tokensIn > 0, "Invalid token amount");
        
        uint256 ethReserve = info.virtualEthReserve;
        uint256 tokenReserve = info.virtualTokenReserve;
        
        require(ethReserve > 0 && tokenReserve > 0, "Invalid reserves");
        
        unchecked {
            // k = x * y
            uint256 k = ethReserve * tokenReserve;
            
            // New token reserve after adding input
            uint256 newTokenReserve = tokenReserve + tokensIn;
            
            // New ETH reserve to maintain k
            uint256 newEthReserve = k / newTokenReserve;
            
            // ETH out
            ethOut = ethReserve - newEthReserve;
            
            // Apply 0.1% rounding protection
            ethOut = (ethOut * 999) / 1000;
        }
        
        // Security check
        require(ethOut <= info.realEthReserve, "Insufficient liquidity");
        
        return ethOut;
    }

    /**
     * @notice Get current price and other metrics
     * @param token The token address
     */
    function getTokenMetrics(address token) external view returns (
        uint256 currentPrice,
        uint256 marketCap,
        uint256 liquidity,
        uint256 volume24h,
        uint256 priceChange24h,
        bool canTrade
    ) {
        SecureTokenInfo memory info = _tokenInfo[token];
        require(info.createdAt > 0, "Token does not exist");
        
        // Current price
        currentPrice = getCurrentPrice(token);
        
        // Market cap
        marketCap = getMarketCap(token);
        
        // Liquidity (ETH value)
        liquidity = info.realEthReserve;
        
        // Volume would be tracked separately
        volume24h = 0; // Placeholder
        priceChange24h = 0; // Placeholder
        
        // Can trade check
        canTrade = !info.graduated && 
                   block.timestamp >= info.tradingEnabledAt &&
                   !paused();
    }

    /**
     * @notice Get security metrics for a token
     * @param token The token address
     */
    function getSecurityMetrics(address token) external view returns (
        uint256 currentFeeBps,
        uint256 transactionLimitBps,
        uint256 transactionLimitEth,
        uint256 timeUntilTrading,
        uint256 blocksSinceCreation
    ) {
        SecureTokenInfo memory info = _tokenInfo[token];
        require(info.createdAt > 0, "Token does not exist");
        
        currentFeeBps = _getCurrentFeeBps(token);
        transactionLimitBps = _getTransactionLimitBps(token);
        transactionLimitEth = _getTransactionLimit(token);
        
        if (block.timestamp < info.tradingEnabledAt) {
            timeUntilTrading = info.tradingEnabledAt - block.timestamp;
        } else {
            timeUntilTrading = 0;
        }
        
        blocksSinceCreation = block.number - info.createdBlock;
    }

    /**
     * @notice Check if a trade would be allowed
     * @param token The token address
     * @param isBuy True for buy, false for sell
     * @param amount Amount in ETH for buy, tokens for sell
     */
    function isTradeAllowed(
        address token,
        bool isBuy,
        uint256 amount
    ) external view returns (bool allowed, string memory reason) {
        SecureTokenInfo memory info = _tokenInfo[token];
        
        if (info.createdAt == 0) {
            return (false, "Token does not exist");
        }
        
        if (info.graduated) {
            return (false, "Token graduated");
        }
        
        if (paused()) {
            return (false, "Contract paused");
        }
        
        if (block.timestamp < info.tradingEnabledAt) {
            return (false, "Trading not yet enabled");
        }
        
        if (block.number <= info.createdBlock) {
            return (false, "No trading in creation block");
        }
        
        // Check transaction limits
        if (isBuy) {
            uint256 limit = _getTransactionLimit(token);
            if (amount > limit) {
                return (false, "Exceeds transaction limit");
            }
        } else {
            uint256 tokenLimit = (_tokenMetrics[token].bondingCurveSupply * 
                _getTransactionLimitBps(token)) / 10000;
            if (amount > tokenLimit) {
                return (false, "Exceeds transaction limit");
            }
        }
        
        // Check if large trade needs commit-reveal
        if (isBuy) {
            uint256 tradeValueUSD = _getTradeValueUSD(amount);
            if (tradeValueUSD >= COMMIT_REVEAL_THRESHOLD) {
                return (false, "Large trades require commit-reveal");
            }
        }
        
        return (true, "");
    }

    /**
     * @notice Emergency function to recover stuck tokens
     * @param token The token to recover
     * @param amount Amount to recover
     */
    function emergencyTokenRecovery(
        address token,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // Can only recover if token is graduated or after 30 days
        SecureTokenInfo memory info = _tokenInfo[token];
        require(
            info.graduated || block.timestamp > info.createdAt + 30 days,
            "Cannot recover active token"
        );
        
        IERC20(token).safeTransfer(msg.sender, amount);
        emit SecurityAlert(token, "EmergencyRecovery", msg.sender, amount);
    }

    /**
     * @notice View function implementations required by interface
     */
    function getCurrentPrice(address token) public view returns (uint256) {
        SecureTokenInfo memory info = _tokenInfo[token];
        if (info.virtualTokenReserve == 0) return 0;
        return (uint256(info.virtualEthReserve) * 10**18) / uint256(info.virtualTokenReserve);
    }

    function getMarketCap(address token) public view returns (uint256) {
        uint256 pricePerToken = getCurrentPrice(token);
        uint256 ethPriceUSD = getEthPriceUSD();
        return (pricePerToken * TOTAL_SUPPLY * ethPriceUSD) / 10**26;
    }

    function getEthPriceUSD() public view override returns (uint256) {
        (, int256 price, , , ) = AggregatorV3Interface(ethUsdPriceFeed).latestRoundData();
        require(price > 0, "Invalid price");
        return uint256(price);
    }

    function _shouldGraduate(address token) internal view override returns (bool) {
        return getMarketCap(token) >= GRADUATION_THRESHOLD && !_tokenInfo[token].graduated;
    }

    function _triggerGraduation(address token) internal override {
        if (graduationManager != address(0)) {
            try IGraduationManager(graduationManager).graduateToken(token) {
                // Success
            } catch {
                emit SecurityAlert(token, "GraduationFailed", address(0), 0);
            }
        }
    }

    // Required interface implementations
    function getTradingMetrics(
        address token
    ) external view returns (
        uint256 tradeCount,
        uint256 totalVolumeETH,
        uint256 currentPrice,
        uint256 marketCap,
        uint256 realEthReserve,
        uint256 realTokenReserve
    ) {
        SecureTokenInfo memory info = _tokenInfo[token];
        return (
            0, // Would track separately
            0, // Would track separately
            getCurrentPrice(token),
            getMarketCap(token),
            info.realEthReserve,
            info.realTokenReserve
        );
    }

    function markAsGraduated(
        address token,
        address lpToken
    ) external override onlyGraduationManager {
        _tokenInfo[token].graduated = true;
        _tokenMetrics[token].lpToken = lpToken;
        emit TokenGraduated(token, lpToken, _tokenInfo[token].realEthReserve, _tokenMetrics[token].dexReserve);
    }

    function withdrawGraduationLiquidity(address token) external override onlyGraduationManager {
        SecureTokenInfo storage info = _tokenInfo[token];
        require(info.graduated, "Not graduated");
        
        uint256 ethAmount = info.realEthReserve;
        require(ethAmount > 0, "No ETH to withdraw");
        
        info.realEthReserve = 0;
        
        (bool success, ) = graduationManager.call{value: ethAmount}("");
        require(success, "ETH transfer failed");
    }

    // Fee claim functions
    function claimCreatorFees(address token) external override nonReentrant {
        SecureTokenInfo storage info = _tokenInfo[token];
        require(msg.sender == info.creator, "Not creator");
        
        uint256 fees = info.creatorFees;
        require(fees > 0, "No fees");
        
        info.creatorFees = 0;
        (bool success, ) = msg.sender.call{value: fees}("");
        require(success, "Transfer failed");
        
        emit FeeClaimed(token, msg.sender, fees, true);
    }

    function claimPlatformFees() external override nonReentrant {
        require(msg.sender == feeRecipient, "Not fee recipient");
        
        uint256 fees = totalPlatformFees;
        require(fees > 0, "No fees");
        
        totalPlatformFees = 0;
        (bool success, ) = feeRecipient.call{value: fees}("");
        require(success, "Transfer failed");
        
        emit FeeClaimed(address(0), feeRecipient, fees, false);
    }

    // Admin functions
    function setGraduationManager(address _graduationManager) external onlyRole(DEFAULT_ADMIN_ROLE) {
        graduationManager = _graduationManager;
    }

    function setFeeRecipient(address _feeRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        feeRecipient = _feeRecipient;
    }

    receive() external payable {}
    
    // Public wrappers for testing
    function getTransactionLimit(address token) external view returns (uint256) {
        return _getTransactionLimit(token);
    }
    
    function getTransactionLimitBps(address token) external view returns (uint256) {
        return _getTransactionLimitBps(token);
    }
    
    function getCurrentFeeBps(address token) external view returns (uint256) {
        return _getCurrentFeeBps(token);
    }
}