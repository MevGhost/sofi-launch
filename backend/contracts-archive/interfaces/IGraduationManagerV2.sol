// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IGraduationManagerV2
 * @notice Interface for the graduation manager handling bonding curve to Uniswap V3 transitions
 */
interface IGraduationManagerV2 {
    // Structs
    struct GraduationInfo {
        address pool;
        uint256 tokenId;
        uint128 liquidity;
        uint256 ethAmount;
        uint256 tokenAmount;
        uint256 graduatedAt;
        uint160 sqrtPriceX96;
        int24 tickLower;
        int24 tickUpper;
        bool lpBurned;
    }
    
    // Events
    event GraduationInitiated(
        address indexed token,
        uint256 marketCap,
        uint256 ethReserve,
        uint256 tokenReserve
    );
    
    event PoolCreated(
        address indexed token,
        address indexed pool,
        uint160 sqrtPriceX96,
        int24 currentTick
    );
    
    event LiquidityAdded(
        address indexed token,
        uint256 tokenId,
        uint128 liquidity,
        uint256 ethAmount,
        uint256 tokenAmount,
        int24 tickLower,
        int24 tickUpper
    );
    
    event LPTokenBurned(
        address indexed token,
        uint256 tokenId,
        uint128 liquidity
    );
    
    event GraduationCompleted(
        address indexed token,
        address indexed pool,
        uint256 finalMarketCap
    );
    
    event GraduationFailed(
        address indexed token,
        string reason
    );
    
    event EmergencyWithdraw(
        address indexed token,
        uint256 ethAmount,
        uint256 tokenAmount
    );
    
    // Core functions
    function graduateToken(address token) external returns (address pool);
    
    // Post-graduation trading
    function buyOnUniswap(address token, uint256 minAmountOut) external payable returns (uint256 amountOut);
    
    function sellOnUniswap(address token, uint256 amountIn, uint256 minEthOut) external returns (uint256 amountOut);
    
    // View functions
    function getGraduationInfo(address token) external view returns (GraduationInfo memory);
    
    function isGraduated(address token) external view returns (bool);
    
    function getEthPriceUSD() external view returns (uint256);
    
    // State getters
    function uniswapFactory() external view returns (address);
    function positionManager() external view returns (address);
    function swapRouter() external view returns (address);
    function WETH() external view returns (address);
    function bondingCurve() external view returns (address);
    function tokenFactory() external view returns (address);
    function ethUsdPriceFeed() external view returns (address);
    
    // Constants
    function GRADUATION_THRESHOLD() external view returns (uint256);
    function MIN_LIQUIDITY_USD() external view returns (uint256);
    function DEX_RESERVE_AMOUNT() external view returns (uint256);
    function POOL_FEE() external view returns (uint24);
    function PRICE_RANGE_PERCENTAGE() external view returns (uint256);
    
    // Admin functions
    function setBondingCurve(address _bondingCurve) external;
    function setTokenFactory(address _tokenFactory) external;
    function setPriceFeed(address _priceFeed) external;
    function emergencyWithdraw(address token) external;
    function pause() external;
    function unpause() external;
}