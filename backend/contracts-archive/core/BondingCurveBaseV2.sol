// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/AggregatorV3Interface.sol";

/**
 * @title BondingCurveBase
 * @notice Abstract contract for implementing different bonding curve formulas
 * @dev Optimized for gas efficiency with packed structs and minimal storage operations
 */
abstract contract BondingCurveBase is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Packed struct to minimize storage slots (5 slots total)
    struct TokenInfo {
        // Slot 1
        uint128 virtualEthReserve;      // Virtual ETH reserve for pricing
        uint128 virtualTokenReserve;    // Virtual token reserve for pricing
        // Slot 2
        uint128 realEthReserve;         // Actual ETH in contract
        uint128 realTokenReserve;       // Actual tokens available for trading
        // Slot 3
        address creator;                // Token creator address (160 bits)
        uint32 createdAt;              // Creation timestamp (sufficient until year 2106)
        uint32 graduatedAt;            // Graduation timestamp
        bool graduated;                // Graduation status (8 bits)
        // Slot 4
        uint128 creatorFees;           // Accumulated creator fees
        uint128 platformFees;          // Accumulated platform fees
        // Slot 5
        uint64 tradeCount;             // Total number of trades
        uint192 totalVolumeETH;        // Total ETH volume traded
    }

    // Additional token data that doesn't need frequent access
    struct TokenMetrics {
        uint256 totalSupply;           // Total token supply (constant)
        uint256 bondingCurveSupply;   // Tokens allocated to bonding curve
        uint256 dexReserve;           // Tokens reserved for DEX liquidity
        address lpToken;              // LP token address after graduation
    }

    // Constants
    uint256 public constant INITIAL_VIRTUAL_ETH_RESERVE = 1 ether;
    uint256 public constant INITIAL_VIRTUAL_TOKEN_RESERVE = 1_000_000 * 10**18;
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;
    uint256 public constant BONDING_CURVE_PERCENTAGE = 80;
    uint256 public constant DEX_PERCENTAGE = 20;
    uint256 public constant PLATFORM_FEE_BPS = 100; // 1% in basis points
    uint256 public constant CREATOR_FEE_BPS = 100;  // 1% in basis points
    uint256 public constant MAX_FEE_BPS = 300;      // 3% max total fees
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant GRADUATION_THRESHOLD = 69_000 * 10**18; // $69k in USD

    // State variables
    mapping(address => TokenInfo) public tokenInfo;
    mapping(address => TokenMetrics) public tokenMetrics;
    mapping(address => mapping(address => uint256)) public userTokenBalances;

    address public graduationManager;
    address public feeRecipient;
    address public ethUsdPriceFeed; // Chainlink price feed
    uint256 public totalPlatformFees;

    // Events
    event TokenCreated(
        address indexed token,
        address indexed creator,
        uint256 bondingCurveSupply,
        uint256 dexReserve
    );

    event Trade(
        address indexed token,
        address indexed trader,
        bool isBuy,
        uint256 ethAmount,
        uint256 tokenAmount,
        uint256 newEthReserve,
        uint256 newTokenReserve,
        uint256 platformFee,
        uint256 creatorFee
    );

    event TokenGraduated(
        address indexed token,
        address indexed lpToken,
        uint256 ethLiquidity,
        uint256 tokenLiquidity,
        uint256 finalMarketCap
    );

    event FeeClaimed(
        address indexed token,
        address indexed recipient,
        uint256 amount,
        bool isCreatorFee
    );

    // Modifiers
    modifier onlyGraduationManager() {
        require(msg.sender == graduationManager, "Only graduation manager");
        _;
    }

    modifier tokenExists(address token) {
        require(tokenInfo[token].createdAt > 0, "Token does not exist");
        _;
    }

    modifier notGraduated(address token) {
        require(!tokenInfo[token].graduated, "Token already graduated");
        _;
    }

    constructor(address _feeRecipient, address _ethUsdPriceFeed) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_ethUsdPriceFeed != address(0), "Invalid price feed");
        feeRecipient = _feeRecipient;
        ethUsdPriceFeed = _ethUsdPriceFeed;
    }

    /**
     * @notice Initialize a new token with bonding curve
     * @param token The token address
     * @param creator The token creator address
     */
    function initializeToken(
        address token,
        address creator
    ) external returns (bool) {
        require(tokenInfo[token].createdAt == 0, "Token already initialized");
        require(token != address(0) && creator != address(0), "Invalid addresses");

        unchecked {
            uint256 bondingCurveSupply = (TOTAL_SUPPLY * BONDING_CURVE_PERCENTAGE) / 100;
            uint256 dexReserve = (TOTAL_SUPPLY * DEX_PERCENTAGE) / 100;

            // Initialize token info with packed struct
            tokenInfo[token] = TokenInfo({
                virtualEthReserve: uint128(INITIAL_VIRTUAL_ETH_RESERVE),
                virtualTokenReserve: uint128(INITIAL_VIRTUAL_TOKEN_RESERVE),
                realEthReserve: 0,
                realTokenReserve: uint128(bondingCurveSupply),
                creator: creator,
                createdAt: uint32(block.timestamp),
                graduatedAt: 0,
                graduated: false,
                creatorFees: 0,
                platformFees: 0,
                tradeCount: 0,
                totalVolumeETH: 0
            });

            // Initialize metrics separately
            tokenMetrics[token] = TokenMetrics({
                totalSupply: TOTAL_SUPPLY,
                bondingCurveSupply: bondingCurveSupply,
                dexReserve: dexReserve,
                lpToken: address(0)
            });
        }

        emit TokenCreated(token, creator, tokenMetrics[token].bondingCurveSupply, tokenMetrics[token].dexReserve);
        return true;
    }

    /**
     * @notice Buy tokens from the bonding curve
     * @param token The token to buy
     * @param minTokensOut Minimum tokens expected (slippage protection)
     */
    function buyTokens(
        address token,
        uint256 minTokensOut
    ) external payable nonReentrant whenNotPaused tokenExists(token) notGraduated(token) {
        require(msg.value > 0, "No ETH sent");

        TokenInfo storage info = tokenInfo[token];
        
        // Calculate fees
        uint256 platformFee;
        uint256 creatorFee;
        uint256 ethAmountAfterFees;
        
        unchecked {
            platformFee = (msg.value * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
            creatorFee = (msg.value * CREATOR_FEE_BPS) / BPS_DENOMINATOR;
            ethAmountAfterFees = msg.value - platformFee - creatorFee;
        }

        // Calculate tokens out using curve formula
        uint256 tokensOut = calculateTokensOut(token, ethAmountAfterFees);
        require(tokensOut >= minTokensOut, "Slippage exceeded");
        require(tokensOut <= info.realTokenReserve, "Insufficient token reserve");

        // Update reserves and fees atomically
        unchecked {
            info.realEthReserve += uint128(ethAmountAfterFees);
            info.realTokenReserve -= uint128(tokensOut);
            info.virtualEthReserve += uint128(ethAmountAfterFees);
            info.virtualTokenReserve -= uint128(tokensOut);
            info.platformFees += uint128(platformFee);
            info.creatorFees += uint128(creatorFee);
            info.tradeCount += 1;
            info.totalVolumeETH += uint192(msg.value);
            totalPlatformFees += platformFee;
        }

        // Update user balance
        userTokenBalances[token][msg.sender] += tokensOut;

        // Transfer tokens
        IERC20(token).safeTransfer(msg.sender, tokensOut);

        emit Trade(
            token,
            msg.sender,
            true,
            msg.value,
            tokensOut,
            info.virtualEthReserve,
            info.virtualTokenReserve,
            platformFee,
            creatorFee
        );

        // Check graduation after state updates
        if (_shouldGraduate(token)) {
            _triggerGraduation(token);
        }
    }

    /**
     * @notice Sell tokens to the bonding curve
     * @param token The token to sell
     * @param tokenAmount Amount of tokens to sell
     * @param minEthOut Minimum ETH expected (slippage protection)
     */
    function sellTokens(
        address token,
        uint256 tokenAmount,
        uint256 minEthOut
    ) external nonReentrant whenNotPaused tokenExists(token) notGraduated(token) {
        require(tokenAmount > 0, "Invalid token amount");
        require(userTokenBalances[token][msg.sender] >= tokenAmount, "Insufficient balance");

        TokenInfo storage info = tokenInfo[token];

        // Calculate ETH out using curve formula
        uint256 ethOut = calculateEthOut(token, tokenAmount);
        
        // Calculate fees
        uint256 platformFee;
        uint256 creatorFee;
        uint256 ethAmountAfterFees;
        
        unchecked {
            platformFee = (ethOut * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
            creatorFee = (ethOut * CREATOR_FEE_BPS) / BPS_DENOMINATOR;
            ethAmountAfterFees = ethOut - platformFee - creatorFee;
        }

        require(ethAmountAfterFees >= minEthOut, "Slippage exceeded");
        require(ethOut <= info.realEthReserve, "Insufficient ETH reserve");

        // Update reserves and fees atomically
        unchecked {
            info.realEthReserve -= uint128(ethOut);
            info.realTokenReserve += uint128(tokenAmount);
            info.virtualEthReserve -= uint128(ethOut);
            info.virtualTokenReserve += uint128(tokenAmount);
            info.platformFees += uint128(platformFee);
            info.creatorFees += uint128(creatorFee);
            info.tradeCount += 1;
            info.totalVolumeETH += uint192(ethOut);
            totalPlatformFees += platformFee;
        }

        // Update user balance
        userTokenBalances[token][msg.sender] -= tokenAmount;

        // Transfer tokens from seller
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokenAmount);

        // Send ETH to seller
        (bool success, ) = msg.sender.call{value: ethAmountAfterFees}("");
        require(success, "ETH transfer failed");

        emit Trade(
            token,
            msg.sender,
            false,
            ethOut,
            tokenAmount,
            info.virtualEthReserve,
            info.virtualTokenReserve,
            platformFee,
            creatorFee
        );
    }

    /**
     * @notice Get current token price in ETH (18 decimals)
     * @param token The token address
     * @return Current price per token in ETH
     */
    function getCurrentPrice(address token) public view tokenExists(token) returns (uint256) {
        TokenInfo memory info = tokenInfo[token];
        if (info.virtualTokenReserve == 0) return 0;
        
        // Price = ethReserve / tokenReserve
        // Multiply by 10^18 for precision
        return (uint256(info.virtualEthReserve) * 10**18) / uint256(info.virtualTokenReserve);
    }

    /**
     * @notice Get current market cap in USD
     * @param token The token address
     * @return Market cap in USD (18 decimals)
     */
    function getMarketCap(address token) public view tokenExists(token) returns (uint256) {
        uint256 pricePerTokenInEth = getCurrentPrice(token);
        uint256 ethPriceInUsd = getEthPriceInUsd();
        
        // MarketCap = (pricePerToken * totalSupply * ethPrice) / 10^36
        // We divide by 10^36 because:
        // - pricePerToken has 18 decimals
        // - ethPrice has 8 decimals (Chainlink)
        // - We need result in 18 decimals
        return (pricePerTokenInEth * TOTAL_SUPPLY * ethPriceInUsd) / 10**26;
    }

    /**
     * @notice Get ETH price in USD from Chainlink
     * @return ETH price with 8 decimals
     */
    function getEthPriceInUsd() public view returns (uint256) {
        (, int256 price, , , ) = AggregatorV3Interface(ethUsdPriceFeed).latestRoundData();
        require(price > 0, "Invalid price feed");
        return uint256(price);
    }

    /**
     * @notice Get detailed trading metrics for a token
     * @param token The token address
     */
    function getTradingMetrics(address token) external view tokenExists(token) returns (
        uint256 tradeCount,
        uint256 totalVolumeETH,
        uint256 currentPrice,
        uint256 marketCap,
        uint256 realEthReserve,
        uint256 realTokenReserve
    ) {
        TokenInfo memory info = tokenInfo[token];
        return (
            info.tradeCount,
            info.totalVolumeETH,
            getCurrentPrice(token),
            getMarketCap(token),
            info.realEthReserve,
            info.realTokenReserve
        );
    }

    /**
     * @notice Claim accumulated creator fees
     * @param token The token address
     */
    function claimCreatorFees(address token) external nonReentrant tokenExists(token) {
        TokenInfo storage info = tokenInfo[token];
        require(msg.sender == info.creator, "Not token creator");
        
        uint256 fees = info.creatorFees;
        require(fees > 0, "No fees to claim");

        info.creatorFees = 0;

        (bool success, ) = msg.sender.call{value: fees}("");
        require(success, "ETH transfer failed");

        emit FeeClaimed(token, msg.sender, fees, true);
    }

    /**
     * @notice Claim accumulated platform fees
     */
    function claimPlatformFees() external nonReentrant {
        require(msg.sender == feeRecipient, "Not fee recipient");
        
        uint256 fees = totalPlatformFees;
        require(fees > 0, "No fees to claim");

        totalPlatformFees = 0;

        (bool success, ) = feeRecipient.call{value: fees}("");
        require(success, "ETH transfer failed");

        emit FeeClaimed(address(0), feeRecipient, fees, false);
    }

    /**
     * @notice Check if token should graduate
     * @param token The token address
     */
    function _shouldGraduate(address token) internal view returns (bool) {
        return getMarketCap(token) >= GRADUATION_THRESHOLD && !tokenInfo[token].graduated;
    }

    /**
     * @notice Trigger graduation process
     * @param token The token address
     */
    function _triggerGraduation(address token) internal {
        if (graduationManager != address(0)) {
            (bool success, ) = graduationManager.call(
                abi.encodeWithSignature("graduateToken(address)", token)
            );
            if (!success) {
                revert("Graduation failed");
            }
        }
    }

    /**
     * @notice Mark token as graduated
     * @param token The token address
     * @param lpToken The LP token address
     */
    function markAsGraduated(
        address token,
        address lpToken
    ) external onlyGraduationManager tokenExists(token) notGraduated(token) {
        TokenInfo storage info = tokenInfo[token];
        info.graduated = true;
        info.graduatedAt = uint32(block.timestamp);
        
        tokenMetrics[token].lpToken = lpToken;

        emit TokenGraduated(
            token,
            lpToken,
            info.realEthReserve,
            tokenMetrics[token].dexReserve,
            getMarketCap(token)
        );
    }

    // Abstract functions to be implemented by specific curve types
    function calculateTokensOut(address token, uint256 ethIn) public view virtual returns (uint256);
    function calculateEthOut(address token, uint256 tokensIn) public view virtual returns (uint256);

    /**
     * @notice Withdraw ETH for graduation
     * @param token The token address
     */
    function withdrawGraduationLiquidity(address token) external onlyGraduationManager {
        TokenInfo storage info = tokenInfo[token];
        require(info.graduated, "Not graduated");
        
        uint256 ethAmount = info.realEthReserve;
        require(ethAmount > 0, "No ETH to withdraw");
        
        info.realEthReserve = 0;
        
        (bool success, ) = graduationManager.call{value: ethAmount}("");
        require(success, "ETH transfer failed");
    }

    // Admin functions
    function setGraduationManager(address _graduationManager) external onlyOwner {
        require(_graduationManager != address(0), "Invalid graduation manager");
        graduationManager = _graduationManager;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    function setPriceFeed(address _ethUsdPriceFeed) external onlyOwner {
        require(_ethUsdPriceFeed != address(0), "Invalid price feed");
        ethUsdPriceFeed = _ethUsdPriceFeed;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    receive() external payable {}
}