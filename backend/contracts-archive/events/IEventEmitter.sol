// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IEventEmitter
 * @notice Interface for comprehensive event emission system
 * @dev Optimized for off-chain indexing with efficient parameter indexing
 */
interface IEventEmitter {
    // ============ Token Lifecycle Events ============
    
    /**
     * @notice Emitted when a new token is created
     * @param token The address of the newly created token
     * @param creator The address of the token creator
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @param timestamp Block timestamp of creation
     * @param metadata Packed metadata (imageUrl hash, description hash, category)
     */
    event TokenCreated(
        address indexed token,
        address indexed creator,
        uint256 indexed tokenId,
        string name,
        string symbol,
        uint256 timestamp,
        bytes32 metadata
    );
    
    /**
     * @notice Emitted on every trade (buy or sell)
     * @param token The token being traded
     * @param trader The address executing the trade
     * @param isBuy True for buys, false for sells
     * @param ethAmount Amount of ETH involved
     * @param tokenAmount Amount of tokens involved
     * @param newPrice New token price after trade
     * @param newMarketCap New market cap in USD (8 decimals)
     * @param timestamp Block timestamp of trade
     */
    event TokenTraded(
        address indexed token,
        address indexed trader,
        bool indexed isBuy,
        uint256 ethAmount,
        uint256 tokenAmount,
        uint256 newPrice,
        uint256 newMarketCap,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when a token graduates to Uniswap
     * @param token The graduated token
     * @param uniswapPool The created Uniswap V3 pool address
     * @param liquidityAdded Amount of liquidity added to the pool
     * @param ethLiquidity ETH amount in initial liquidity
     * @param tokenLiquidity Token amount in initial liquidity
     * @param timestamp Block timestamp of graduation
     */
    event TokenGraduated(
        address indexed token,
        address indexed uniswapPool,
        uint256 indexed finalMarketCap,
        uint256 liquidityAdded,
        uint256 ethLiquidity,
        uint256 tokenLiquidity,
        uint256 timestamp
    );
    
    // ============ Financial Events ============
    
    /**
     * @notice Emitted when fees are collected from a trade
     * @param token The token generating fees
     * @param platformFee Platform fee amount in ETH
     * @param creatorFee Creator fee amount in ETH
     * @param totalVolume Cumulative volume for this token
     */
    event FeesCollected(
        address indexed token,
        uint256 indexed blockNumber,
        uint256 platformFee,
        uint256 creatorFee,
        uint256 totalVolume
    );
    
    /**
     * @notice Emitted when creator claims their fees
     * @param token The token fees are claimed from
     * @param creator The creator claiming fees
     * @param amount Amount of ETH claimed
     * @param totalClaimed Total amount ever claimed by this creator
     */
    event CreatorFeeClaimed(
        address indexed token,
        address indexed creator,
        uint256 amount,
        uint256 totalClaimed,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when automatic swapback is executed
     * @param executor Address triggering the swapback
     * @param ethAmount ETH amount swapped
     * @param tokensReceived Tokens received from swap
     * @param priceImpact Price impact percentage (basis points)
     */
    event SwapbackExecuted(
        address indexed executor,
        uint256 indexed blockNumber,
        uint256 ethAmount,
        uint256 tokensReceived,
        uint256 priceImpact,
        uint256 timestamp
    );
    
    // ============ Tool Events ============
    
    /**
     * @notice Emitted when liquidity is locked
     * @param token Token whose liquidity is locked
     * @param locker Address that locked the liquidity
     * @param lockId Unique identifier for this lock
     * @param duration Lock duration in seconds
     * @param amount Amount of LP tokens locked
     * @param unlockTime Timestamp when unlock is available
     */
    event LiquidityLocked(
        address indexed token,
        address indexed locker,
        uint256 indexed lockId,
        uint256 duration,
        uint256 amount,
        uint256 unlockTime
    );
    
    /**
     * @notice Emitted when a vesting schedule is created
     * @param beneficiary Address receiving vested tokens
     * @param token Token being vested
     * @param scheduleId Unique vesting schedule ID
     * @param amount Total amount to be vested
     * @param vestingStart Start timestamp
     * @param vestingEnd End timestamp
     * @param cliff Cliff duration in seconds
     */
    event VestingScheduleCreated(
        address indexed beneficiary,
        address indexed token,
        uint256 indexed scheduleId,
        uint256 amount,
        uint256 vestingStart,
        uint256 vestingEnd,
        uint256 cliff
    );
    
    /**
     * @notice Emitted when multisend is completed
     * @param token Token being distributed
     * @param sender Address initiating the multisend
     * @param recipientCount Number of recipients
     * @param totalAmount Total amount distributed
     * @param averageAmount Average amount per recipient
     */
    event MultisendCompleted(
        address indexed token,
        address indexed sender,
        uint256 recipientCount,
        uint256 totalAmount,
        uint256 averageAmount,
        uint256 timestamp
    );
    
    // ============ State Change Events ============
    
    /**
     * @notice Emitted when trading is enabled for a token
     * @param token The token address
     * @param enabledAt Block number when enabled
     */
    event TradingEnabled(
        address indexed token,
        uint256 indexed enabledAt,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when a token is paused/unpaused
     * @param token The token address
     * @param paused True if paused, false if unpaused
     * @param reason Reason code for the pause
     */
    event TokenPausedStateChanged(
        address indexed token,
        bool indexed paused,
        uint256 reason,
        uint256 timestamp
    );
    
    // ============ Aggregated Events (for efficient indexing) ============
    
    /**
     * @notice Packed event for high-frequency updates
     * @param token Token address
     * @param data Packed data containing multiple values
     * Format: [price(64)][volume24h(64)][holders(32)][trades24h(32)][liquidity(64)]
     */
    event TokenMetricsUpdate(
        address indexed token,
        uint256 indexed blockNumber,
        bytes32 data
    );
    
    /**
     * @notice Daily snapshot event for historical data
     * @param token Token address
     * @param date Date as unix timestamp (start of day)
     * @param volume Daily volume in ETH
     * @param high Highest price of the day
     * @param low Lowest price of the day
     * @param close Closing price
     * @param trades Number of trades
     */
    event DailySnapshot(
        address indexed token,
        uint256 indexed date,
        uint256 volume,
        uint256 high,
        uint256 low,
        uint256 close,
        uint256 trades
    );
    
    // ============ System Events ============
    
    /**
     * @notice Protocol-wide configuration changes
     * @param parameter Parameter that changed
     * @param oldValue Previous value
     * @param newValue New value
     */
    event ProtocolConfigUpdated(
        bytes32 indexed parameter,
        uint256 oldValue,
        uint256 newValue,
        uint256 timestamp
    );
    
    /**
     * @notice Event versioning for upgradability
     * @param version New event schema version
     * @param migrationBlock Block number where migration occurs
     */
    event EventSchemaUpgraded(
        uint256 indexed version,
        uint256 indexed migrationBlock,
        string description
    );
}