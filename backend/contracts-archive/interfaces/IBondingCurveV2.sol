// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IBondingCurveV2
 * @notice Interface for the modular bonding curve system
 */
interface IBondingCurveV2 {
    // Events
    event TokenCreated(address indexed token, address indexed creator, uint256 bondingCurveSupply, uint256 dexReserve);
    event Trade(address indexed token, address indexed trader, bool isBuy, uint256 ethAmount, uint256 tokenAmount, uint256 newEthReserve, uint256 newTokenReserve, uint256 platformFee, uint256 creatorFee);
    event TokenGraduated(address indexed token, address indexed lpToken, uint256 ethLiquidity, uint256 tokenLiquidity);
    event FeeClaimed(address indexed token, address indexed recipient, uint256 amount, bool isCreatorFee);
    
    // Structs
    struct TokenInfo {
        uint128 virtualEthReserve;
        uint128 virtualTokenReserve;
        uint128 realEthReserve;
        uint128 realTokenReserve;
        address creator;
        uint32 createdAt;
        uint32 tradingEnabledAt;
        uint32 createdBlock;
        uint32 graduatedAt;
        bool graduated;
        uint128 creatorFees;
        uint128 platformFees;
        uint64 tradeCount;
        uint192 totalVolumeETH;
    }

    struct TokenMetrics {
        uint256 totalSupply;
        uint256 bondingCurveSupply;
        uint256 dexReserve;
        address lpToken;
    }

    // Core functions
    function initializeToken(address token, address creator) external returns (bool);
    
    function buyTokens(address token, uint256 minTokensOut) external payable;
    
    function sellTokens(address token, uint256 tokenAmount, uint256 minEthOut) external;
    
    // View functions
    function calculateTokensOut(address token, uint256 ethIn) external view returns (uint256);
    
    function calculateEthOut(address token, uint256 tokensIn) external view returns (uint256);
    
    function getCurrentPrice(address token) external view returns (uint256);
    
    function getMarketCap(address token) external view returns (uint256);
    
    function getEthPriceUSD() external view returns (uint256);
    
    function getTradingMetrics(address token) external view returns (
        uint256 tradeCount,
        uint256 totalVolumeETH,
        uint256 currentPrice,
        uint256 marketCap,
        uint256 realEthReserve,
        uint256 realTokenReserve
    );
    
    // Fee functions
    function claimCreatorFees(address token) external;
    
    function claimPlatformFees() external;
    
    // Graduation functions
    function markAsGraduated(address token, address lpToken) external;
    
    function withdrawGraduationLiquidity(address token) external;
    
    // Getters
    function tokenInfo(address token) external view returns (TokenInfo memory);
    
    function tokenMetrics(address token) external view returns (TokenMetrics memory);
    
    function userTokenBalances(address token, address user) external view returns (uint256);
    
    function graduationManager() external view returns (address);
    
    function feeRecipient() external view returns (address);
    
    function ethUsdPriceFeed() external view returns (address);
    
    function totalPlatformFees() external view returns (uint256);
}