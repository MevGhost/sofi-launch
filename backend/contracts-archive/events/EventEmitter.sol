// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IEventEmitter.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title EventEmitter
 * @notice Centralized event emission system for gas optimization
 * @dev Separates event emission from business logic to reduce contract size
 */
contract EventEmitter is IEventEmitter, AccessControl {
    bytes32 public constant EMITTER_ROLE = keccak256("EMITTER_ROLE");
    
    uint256 public constant CURRENT_VERSION = 1;
    uint256 public eventVersion;
    
    // Tracking for aggregated events
    mapping(address => uint256) public lastSnapshotBlock;
    mapping(address => DailyData) private dailyData;
    
    struct DailyData {
        uint256 volume;
        uint256 high;
        uint256 low;
        uint256 open;
        uint256 close;
        uint256 trades;
        uint256 lastUpdate;
    }
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EMITTER_ROLE, msg.sender);
        eventVersion = CURRENT_VERSION;
    }
    
    // ============ Lifecycle Events ============
    
    function emitTokenCreated(
        address token,
        address creator,
        uint256 tokenId,
        string calldata name,
        string calldata symbol,
        bytes32 metadata
    ) external onlyRole(EMITTER_ROLE) {
        emit TokenCreated(
            token,
            creator,
            tokenId,
            name,
            symbol,
            block.timestamp,
            metadata
        );
    }
    
    function emitTokenTraded(
        address token,
        address trader,
        bool isBuy,
        uint256 ethAmount,
        uint256 tokenAmount,
        uint256 newPrice,
        uint256 newMarketCap
    ) external onlyRole(EMITTER_ROLE) {
        emit TokenTraded(
            token,
            trader,
            isBuy,
            ethAmount,
            tokenAmount,
            newPrice,
            newMarketCap,
            block.timestamp
        );
        
        // Update daily data
        _updateDailyData(token, newPrice, ethAmount);
    }
    
    function emitTokenGraduated(
        address token,
        address uniswapPool,
        uint256 finalMarketCap,
        uint256 liquidityAdded,
        uint256 ethLiquidity,
        uint256 tokenLiquidity
    ) external onlyRole(EMITTER_ROLE) {
        emit TokenGraduated(
            token,
            uniswapPool,
            finalMarketCap,
            liquidityAdded,
            ethLiquidity,
            tokenLiquidity,
            block.timestamp
        );
    }
    
    // ============ Financial Events ============
    
    function emitFeesCollected(
        address token,
        uint256 platformFee,
        uint256 creatorFee,
        uint256 totalVolume
    ) external onlyRole(EMITTER_ROLE) {
        emit FeesCollected(
            token,
            block.number,
            platformFee,
            creatorFee,
            totalVolume
        );
    }
    
    function emitCreatorFeeClaimed(
        address token,
        address creator,
        uint256 amount,
        uint256 totalClaimed
    ) external onlyRole(EMITTER_ROLE) {
        emit CreatorFeeClaimed(
            token,
            creator,
            amount,
            totalClaimed,
            block.timestamp
        );
    }
    
    function emitSwapbackExecuted(
        address executor,
        uint256 ethAmount,
        uint256 tokensReceived,
        uint256 priceImpact
    ) external onlyRole(EMITTER_ROLE) {
        emit SwapbackExecuted(
            executor,
            block.number,
            ethAmount,
            tokensReceived,
            priceImpact,
            block.timestamp
        );
    }
    
    // ============ Tool Events ============
    
    function emitLiquidityLocked(
        address token,
        address locker,
        uint256 lockId,
        uint256 duration,
        uint256 amount,
        uint256 unlockTime
    ) external onlyRole(EMITTER_ROLE) {
        emit LiquidityLocked(
            token,
            locker,
            lockId,
            duration,
            amount,
            unlockTime
        );
    }
    
    function emitVestingScheduleCreated(
        address beneficiary,
        address token,
        uint256 scheduleId,
        uint256 amount,
        uint256 vestingStart,
        uint256 vestingEnd,
        uint256 cliff
    ) external onlyRole(EMITTER_ROLE) {
        emit VestingScheduleCreated(
            beneficiary,
            token,
            scheduleId,
            amount,
            vestingStart,
            vestingEnd,
            cliff
        );
    }
    
    function emitMultisendCompleted(
        address token,
        address sender,
        uint256 recipientCount,
        uint256 totalAmount
    ) external onlyRole(EMITTER_ROLE) {
        uint256 averageAmount = recipientCount > 0 ? totalAmount / recipientCount : 0;
        
        emit MultisendCompleted(
            token,
            sender,
            recipientCount,
            totalAmount,
            averageAmount,
            block.timestamp
        );
    }
    
    // ============ State Events ============
    
    function emitTradingEnabled(address token) external onlyRole(EMITTER_ROLE) {
        emit TradingEnabled(token, block.number, block.timestamp);
    }
    
    function emitTokenPausedStateChanged(
        address token,
        bool paused,
        uint256 reason
    ) external onlyRole(EMITTER_ROLE) {
        emit TokenPausedStateChanged(token, paused, reason, block.timestamp);
    }
    
    // ============ Aggregated Events ============
    
    function emitTokenMetricsUpdate(
        address token,
        uint256 price,
        uint256 volume24h,
        uint32 holders,
        uint32 trades24h,
        uint256 liquidity
    ) external onlyRole(EMITTER_ROLE) {
        // Pack data efficiently
        bytes32 packedData = bytes32(
            (uint256(uint64(price)) << 192) |
            (uint256(uint64(volume24h)) << 128) |
            (uint256(holders) << 96) |
            (uint256(trades24h) << 64) |
            uint64(liquidity)
        );
        
        emit TokenMetricsUpdate(token, block.number, packedData);
        lastSnapshotBlock[token] = block.number;
    }
    
    function emitDailySnapshot(address token) external onlyRole(EMITTER_ROLE) {
        DailyData memory data = dailyData[token];
        
        // Only emit if we have data for this day
        if (data.trades > 0) {
            uint256 date = (block.timestamp / 86400) * 86400; // Start of current day
            
            emit DailySnapshot(
                token,
                date,
                data.volume,
                data.high,
                data.low,
                data.close,
                data.trades
            );
            
            // Reset daily data
            delete dailyData[token];
        }
    }
    
    // ============ System Events ============
    
    function emitProtocolConfigUpdated(
        bytes32 parameter,
        uint256 oldValue,
        uint256 newValue
    ) external onlyRole(EMITTER_ROLE) {
        emit ProtocolConfigUpdated(
            parameter,
            oldValue,
            newValue,
            block.timestamp
        );
    }
    
    function upgradeEventSchema(
        uint256 newVersion,
        string calldata description
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newVersion > eventVersion, "Invalid version");
        
        emit EventSchemaUpgraded(newVersion, block.number, description);
        eventVersion = newVersion;
    }
    
    // ============ Internal Functions ============
    
    function _updateDailyData(
        address token,
        uint256 price,
        uint256 volume
    ) private {
        DailyData storage data = dailyData[token];
        uint256 currentDay = block.timestamp / 86400;
        uint256 dataDay = data.lastUpdate / 86400;
        
        // New day - reset data
        if (currentDay > dataDay) {
            data.volume = volume;
            data.high = price;
            data.low = price;
            data.open = price;
            data.close = price;
            data.trades = 1;
        } else {
            // Same day - update data
            data.volume += volume;
            if (price > data.high) data.high = price;
            if (price < data.low || data.low == 0) data.low = price;
            data.close = price;
            data.trades++;
        }
        
        data.lastUpdate = block.timestamp;
    }
    
    // ============ View Functions ============
    
    function getDailyData(address token) external view returns (
        uint256 volume,
        uint256 high,
        uint256 low,
        uint256 open,
        uint256 close,
        uint256 trades
    ) {
        DailyData memory data = dailyData[token];
        return (
            data.volume,
            data.high,
            data.low,
            data.open,
            data.close,
            data.trades
        );
    }
    
    function getCurrentVersion() external view returns (uint256) {
        return eventVersion;
    }
    
    /**
     * @notice Decode packed metrics data
     * @param data The packed bytes32 data from TokenMetricsUpdate event
     */
    function decodeMetrics(bytes32 data) external pure returns (
        uint64 price,
        uint64 volume24h,
        uint32 holders,
        uint32 trades24h,
        uint64 liquidity
    ) {
        price = uint64(uint256(data) >> 192);
        volume24h = uint64(uint256(data) >> 128);
        holders = uint32(uint256(data) >> 96);
        trades24h = uint32(uint256(data) >> 64);
        liquidity = uint64(uint256(data));
    }
}