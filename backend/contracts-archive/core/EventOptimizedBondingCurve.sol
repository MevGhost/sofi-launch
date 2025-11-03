// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./OptimizedBondingCurve.sol";
import "../events/IEventEmitter.sol";

/**
 * @title EventOptimizedBondingCurve
 * @notice Optimized bonding curve with comprehensive event emission
 * @dev Extends OptimizedBondingCurve with event system integration
 */
contract EventOptimizedBondingCurve is OptimizedBondingCurve {
    IEventEmitter public immutable eventEmitter;
    
    // Additional tracking for events
    mapping(address => uint256) public tokenVolume24h;
    mapping(address => uint256) public lastVolumeUpdate;
    mapping(address => uint256) public tokenTrades24h;
    mapping(address => uint256) public lastTradeUpdate;
    
    constructor(
        address _feeRecipient,
        address _priceFeed,
        address _uniswapRouter,
        address _weth,
        address _eventEmitter
    ) OptimizedBondingCurve(_feeRecipient, _priceFeed, _uniswapRouter, _weth) {
        eventEmitter = IEventEmitter(_eventEmitter);
    }
    
    /**
     * @notice Override buyTokens to emit comprehensive events
     */
    function buyTokens(
        address token,
        uint256 minTokensOut
    ) external payable override nonReentrant returns (uint256) {
        require(msg.value > 0, "No ETH");
        
        PackedTokenInfo storage info = _tokens[token];
        require(info.creator != address(0), "Not initialized");
        require(!info.graduated, "Graduated");
        require(block.number > uint256(info.createdBlock), "Same block");
        require(info.tradingEnabledAt > 0 && block.timestamp >= info.tradingEnabledAt, "Trading not enabled");
        
        // Calculate tokens out
        uint256 tokensOut;
        uint256 fee;
        uint256 creatorFee;
        
        unchecked {
            // Calculate based on virtual reserves
            uint256 k = uint256(info.virtualEthReserve) * uint256(info.virtualTokenReserve);
            
            // Apply fees
            fee = (msg.value * uint256(info.feeBps)) / 10000;
            creatorFee = (msg.value * 100) / 10000; // 1% creator fee
            uint256 ethAfterFee = msg.value - fee - creatorFee;
            
            // Update virtual reserves
            uint256 newVirtualEthReserve = uint256(info.virtualEthReserve) + ethAfterFee;
            uint256 newVirtualTokenReserve = k / newVirtualEthReserve;
            tokensOut = uint256(info.virtualTokenReserve) - newVirtualTokenReserve;
            
            // Apply slippage protection
            tokensOut = (tokensOut * 999) / 1000;
            require(tokensOut >= minTokensOut, "Slippage");
            
            // Update state
            info.virtualEthReserve = uint128(newVirtualEthReserve);
            info.virtualTokenReserve = uint128(newVirtualTokenReserve);
            info.realEthReserve = uint128(uint256(info.realEthReserve) + ethAfterFee);
            
            uint256 realTokenReserve = _unpackRealTokenReserve(info);
            realTokenReserve -= tokensOut;
            _packRealTokenReserve(info, realTokenReserve);
            
            // Track fees
            _platformFees += fee;
            _creatorFees[info.creator] += creatorFee;
        }
        
        // Transfer tokens
        IERC20(token).transfer(msg.sender, tokensOut);
        
        // Calculate new price and market cap for events
        uint256 newPrice = getCurrentPrice(token);
        uint256 newMarketCap = getMarketCap(token);
        
        // Update volume tracking
        _updateVolumeTracking(token, msg.value);
        
        // Emit comprehensive events
        eventEmitter.emitTokenTraded(
            token,
            msg.sender,
            true, // isBuy
            msg.value,
            tokensOut,
            newPrice,
            newMarketCap
        );
        
        eventEmitter.emitFeesCollected(
            token,
            fee,
            creatorFee,
            tokenVolume24h[token]
        );
        
        // Check for metrics update (every 100 blocks)
        if (block.number % 100 == 0) {
            _emitMetricsUpdate(token);
        }
        
        // Original event for backward compatibility
        emit Trade(token, msg.sender, true, msg.value, tokensOut, newPrice);
        
        return tokensOut;
    }
    
    /**
     * @notice Override sellTokens to emit comprehensive events
     */
    function sellTokens(
        address token,
        uint256 tokenAmount,
        uint256 minEthOut
    ) external override nonReentrant returns (uint256) {
        require(tokenAmount > 0, "No tokens");
        
        PackedTokenInfo storage info = _tokens[token];
        require(info.creator != address(0), "Not initialized");
        require(!info.graduated, "Graduated");
        require(block.number > uint256(info.createdBlock), "Same block");
        
        // Calculate ETH out
        uint256 ethOut;
        uint256 fee;
        uint256 creatorFee;
        
        unchecked {
            // Calculate based on virtual reserves
            uint256 k = uint256(info.virtualEthReserve) * uint256(info.virtualTokenReserve);
            
            // Update virtual reserves
            uint256 newVirtualTokenReserve = uint256(info.virtualTokenReserve) + tokenAmount;
            uint256 newVirtualEthReserve = k / newVirtualTokenReserve;
            ethOut = uint256(info.virtualEthReserve) - newVirtualEthReserve;
            
            // Apply fees
            fee = (ethOut * uint256(info.feeBps)) / 10000;
            creatorFee = (ethOut * 100) / 10000; // 1% creator fee
            ethOut = ethOut - fee - creatorFee;
            
            // Apply slippage protection
            ethOut = (ethOut * 999) / 1000;
            require(ethOut >= minEthOut, "Slippage");
            
            // Update state
            info.virtualEthReserve = uint128(newVirtualEthReserve);
            info.virtualTokenReserve = uint128(newVirtualTokenReserve);
            info.realEthReserve = uint128(uint256(info.realEthReserve) - ethOut);
            
            uint256 realTokenReserve = _unpackRealTokenReserve(info);
            realTokenReserve += tokenAmount;
            _packRealTokenReserve(info, realTokenReserve);
            
            // Track fees
            _platformFees += fee;
            _creatorFees[info.creator] += creatorFee;
        }
        
        // Transfer tokens from seller
        IERC20(token).transferFrom(msg.sender, address(this), tokenAmount);
        
        // Send ETH to seller
        (bool success, ) = msg.sender.call{value: ethOut}("");
        require(success, "ETH transfer failed");
        
        // Calculate new price and market cap for events
        uint256 newPrice = getCurrentPrice(token);
        uint256 newMarketCap = getMarketCap(token);
        
        // Update volume tracking
        _updateVolumeTracking(token, ethOut);
        
        // Emit comprehensive events
        eventEmitter.emitTokenTraded(
            token,
            msg.sender,
            false, // isSell
            ethOut,
            tokenAmount,
            newPrice,
            newMarketCap
        );
        
        eventEmitter.emitFeesCollected(
            token,
            fee,
            creatorFee,
            tokenVolume24h[token]
        );
        
        // Check for daily snapshot (once per day)
        if (block.timestamp / 86400 > lastVolumeUpdate[token] / 86400) {
            eventEmitter.emitDailySnapshot(token);
        }
        
        // Original event for backward compatibility
        emit Trade(token, msg.sender, false, ethOut, tokenAmount, newPrice);
        
        return ethOut;
    }
    
    /**
     * @notice Override enableTrading to emit event
     */
    function enableTrading(address token) external override {
        PackedTokenInfo storage info = _tokens[token];
        require(info.creator != address(0), "Not initialized");
        require(info.tradingEnabledAt == 0, "Already enabled");
        
        info.tradingEnabledAt = uint32(block.timestamp + 60); // 1 minute delay
        
        eventEmitter.emitTradingEnabled(token);
    }
    
    /**
     * @notice Override graduation to emit comprehensive event
     */
    function markAsGraduated(address token, address uniswapPool) external override onlyRole(GRADUATION_ROLE) {
        PackedTokenInfo storage info = _tokens[token];
        require(info.creator != address(0), "Not initialized");
        require(!info.graduated, "Already graduated");
        
        info.graduated = true;
        
        // Calculate final metrics
        uint256 finalMarketCap = getMarketCap(token);
        uint256 ethLiquidity = info.realEthReserve;
        uint256 tokenLiquidity = _unpackRealTokenReserve(info);
        
        eventEmitter.emitTokenGraduated(
            token,
            uniswapPool,
            finalMarketCap,
            ethLiquidity + tokenLiquidity, // Total liquidity value
            ethLiquidity,
            tokenLiquidity
        );
        
        emit TokenGraduated(token, uniswapPool);
    }
    
    /**
     * @notice Override fee claims to emit events
     */
    function claimCreatorFees(address token) external override nonReentrant {
        PackedTokenInfo memory info = _tokens[token];
        require(msg.sender == info.creator, "Not creator");
        
        uint256 fees = _creatorFees[info.creator];
        require(fees > 0, "No fees");
        
        _creatorFees[info.creator] = 0;
        
        (bool success, ) = msg.sender.call{value: fees}("");
        require(success, "Transfer failed");
        
        // Track total claimed (would need additional storage in production)
        eventEmitter.emitCreatorFeeClaimed(
            token,
            msg.sender,
            fees,
            fees // In production, track cumulative
        );
        
        emit FeeClaimed(token, msg.sender, fees, true);
    }
    
    // ============ Internal Functions ============
    
    function _updateVolumeTracking(address token, uint256 amount) private {
        uint256 currentWindow = block.timestamp / 86400;
        uint256 lastWindow = lastVolumeUpdate[token] / 86400;
        
        if (currentWindow > lastWindow) {
            // Reset for new day
            tokenVolume24h[token] = amount;
            tokenTrades24h[token] = 1;
        } else {
            tokenVolume24h[token] += amount;
            tokenTrades24h[token]++;
        }
        
        lastVolumeUpdate[token] = block.timestamp;
        lastTradeUpdate[token] = block.timestamp;
    }
    
    function _emitMetricsUpdate(address token) private {
        PackedTokenInfo memory info = _tokens[token];
        
        // Get holder count (simplified - would need Transfer event tracking)
        uint32 holders = 100; // Placeholder
        
        eventEmitter.emitTokenMetricsUpdate(
            token,
            getCurrentPrice(token),
            tokenVolume24h[token],
            holders,
            uint32(tokenTrades24h[token]),
            info.realEthReserve
        );
    }
    
    // ============ View Functions ============
    
    function getVolume24h(address token) external view returns (uint256) {
        uint256 currentWindow = block.timestamp / 86400;
        uint256 lastWindow = lastVolumeUpdate[token] / 86400;
        
        if (currentWindow > lastWindow) {
            return 0; // New day, no volume yet
        }
        
        return tokenVolume24h[token];
    }
    
    function getTrades24h(address token) external view returns (uint256) {
        uint256 currentWindow = block.timestamp / 86400;
        uint256 lastWindow = lastTradeUpdate[token] / 86400;
        
        if (currentWindow > lastWindow) {
            return 0; // New day, no trades yet
        }
        
        return tokenTrades24h[token];
    }
}