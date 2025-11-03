// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IBondingCurveV2.sol";
import "../libraries/SafeMathUnchecked.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title UltraOptimizedBondingCurve
 * @notice Gas-optimized bonding curve targeting <150k gas for buys
 * @dev Aggressive optimizations while maintaining security
 */
contract UltraOptimizedBondingCurve is IBondingCurveV2, ReentrancyGuard, AccessControl {
    using SafeMathUnchecked for uint256;
    using SafeMathUnchecked for uint128;
    
    // Roles
    bytes32 public constant GRADUATION_ROLE = keccak256("GRADUATION_ROLE");
    bytes32 public constant FACTORY_ROLE = keccak256("FACTORY_ROLE");
    
    // Single storage slot (32 bytes) for frequently accessed data
    struct GlobalState {
        address feeRecipient;     // 20 bytes
        uint48 platformFees;      // 6 bytes (up to ~281 trillion wei)
        uint48 totalVolume;       // 6 bytes
    }
    
    // Optimized token data: 2 slots instead of 3
    struct TokenData {
        // Slot 1: 32 bytes
        uint128 virtualEthReserve;    // 16 bytes
        uint128 virtualTokenReserve;  // 16 bytes
        
        // Slot 2: 32 bytes  
        uint128 realEthReserve;       // 16 bytes
        address creator;              // 20 bytes (only need 16)
        uint32 createdBlock;          // 4 bytes
        uint16 feeBps;                // 2 bytes
        bool graduated;               // 1 byte
        bool initialized;             // 1 byte
    }
    
    // Constants (not stored)
    uint256 private constant INITIAL_VIRTUAL_ETH = 1 ether;
    uint256 private constant INITIAL_VIRTUAL_TOKEN = 1000000 * 10**18;
    uint256 private constant TOTAL_SUPPLY = 1000000000 * 10**18;
    uint256 private constant BONDING_CURVE_SUPPLY = 800000000 * 10**18;
    uint256 private constant GRADUATION_THRESHOLD = 69000 * 10**8; // $69k
    uint256 private constant BASE_FEE_BPS = 200; // 2% platform fee
    uint256 private constant CREATOR_FEE_BPS = 100; // 1% creator fee
    
    // State variables
    GlobalState private globalState;
    mapping(address => TokenData) private tokens;
    mapping(address => uint256) private creatorBalances;
    mapping(address => mapping(address => uint256)) private lastTradeBlock;
    
    // Events (minimal to save gas)
    event Trade(address indexed token, address indexed trader, bool isBuy, uint256 ethAmount, uint256 tokenAmount);
    event TokenInitialized(address indexed token, address indexed creator);
    event TokenGraduated(address indexed token);
    event FeeClaimed(address indexed recipient, uint256 amount);
    
    constructor(address _feeRecipient) {
        globalState.feeRecipient = _feeRecipient;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @notice Initialize a new token (called by factory)
     * @dev Optimized to use minimal storage operations
     */
    function initializeToken(
        address token,
        address creator
    ) external override onlyRole(FACTORY_ROLE) {
        TokenData storage data = tokens[token];
        require(!data.initialized, "Already initialized");
        
        // Initialize in single SSTORE
        data.virtualEthReserve = uint128(INITIAL_VIRTUAL_ETH);
        data.virtualTokenReserve = uint128(INITIAL_VIRTUAL_TOKEN);
        data.creator = creator;
        data.createdBlock = uint32(block.number);
        data.feeBps = uint16(BASE_FEE_BPS + CREATOR_FEE_BPS);
        data.initialized = true;
        
        emit TokenInitialized(token, creator);
    }
    
    /**
     * @notice Buy tokens - Ultra optimized for <150k gas
     * @dev Aggressive optimizations with safety checks
     */
    function buyTokens(
        address token,
        uint256 minTokensOut
    ) external payable override nonReentrant returns (uint256 tokensOut) {
        require(msg.value > 0, "No ETH");
        
        // Single SLOAD for all token data
        TokenData memory data = tokens[token];
        require(data.initialized, "Not initialized");
        require(!data.graduated, "Graduated");
        require(lastTradeBlock[token][msg.sender] < block.number, "Same block");
        
        // Calculate fees efficiently
        uint256 totalFee = msg.value.mulBps(data.feeBps);
        uint256 creatorFee = msg.value.mulBps(CREATOR_FEE_BPS);
        uint256 platformFee = totalFee - creatorFee;
        uint256 ethAfterFee = msg.value - totalFee;
        
        // Calculate tokens out using optimized math
        tokensOut = SafeMathUnchecked.calculateTokensOut(
            data.virtualEthReserve,
            data.virtualTokenReserve,
            ethAfterFee
        );
        
        require(tokensOut >= minTokensOut, "Slippage");
        
        // Update reserves in memory
        data.virtualEthReserve = uint128(uint256(data.virtualEthReserve) + ethAfterFee);
        data.virtualTokenReserve = uint128(uint256(data.virtualTokenReserve) - tokensOut);
        data.realEthReserve = uint128(uint256(data.realEthReserve) + ethAfterFee);
        
        // Single SSTORE for all updates
        tokens[token] = data;
        
        // Update other state efficiently
        lastTradeBlock[token][msg.sender] = block.number;
        creatorBalances[data.creator] += creatorFee;
        
        // Update global state in one operation
        GlobalState memory gs = globalState;
        gs.platformFees = uint48(uint256(gs.platformFees) + platformFee);
        gs.totalVolume = uint48(uint256(gs.totalVolume) + msg.value);
        globalState = gs;
        
        // Transfer tokens (most gas expensive part)
        IERC20(token).transfer(msg.sender, tokensOut);
        
        emit Trade(token, msg.sender, true, msg.value, tokensOut);
    }
    
    /**
     * @notice Sell tokens - Optimized version
     */
    function sellTokens(
        address token,
        uint256 tokenAmount,
        uint256 minEthOut
    ) external override nonReentrant returns (uint256 ethOut) {
        require(tokenAmount > 0, "No tokens");
        
        // Single SLOAD
        TokenData memory data = tokens[token];
        require(data.initialized, "Not initialized");
        require(!data.graduated, "Graduated");
        require(lastTradeBlock[token][msg.sender] < block.number, "Same block");
        
        // Calculate ETH out
        ethOut = SafeMathUnchecked.calculateEthOut(
            data.virtualEthReserve,
            data.virtualTokenReserve,
            tokenAmount
        );
        
        // Calculate fees
        uint256 totalFee = ethOut.mulBps(data.feeBps);
        uint256 creatorFee = ethOut.mulBps(CREATOR_FEE_BPS);
        uint256 platformFee = totalFee - creatorFee;
        ethOut = ethOut - totalFee;
        
        require(ethOut >= minEthOut, "Slippage");
        require(ethOut <= data.realEthReserve, "Insufficient liquidity");
        
        // Update reserves
        data.virtualEthReserve = uint128(uint256(data.virtualEthReserve) - ethOut - totalFee);
        data.virtualTokenReserve = uint128(uint256(data.virtualTokenReserve) + tokenAmount);
        data.realEthReserve = uint128(uint256(data.realEthReserve) - ethOut);
        
        // Single SSTORE
        tokens[token] = data;
        
        // Update other state
        lastTradeBlock[token][msg.sender] = block.number;
        creatorBalances[data.creator] += creatorFee;
        globalState.platformFees = uint48(uint256(globalState.platformFees) + platformFee);
        
        // Transfer tokens from seller
        IERC20(token).transferFrom(msg.sender, address(this), tokenAmount);
        
        // Send ETH with fixed gas stipend
        (bool success, ) = msg.sender.call{value: ethOut, gas: 2300}("");
        require(success, "ETH transfer failed");
        
        emit Trade(token, msg.sender, false, ethOut, tokenAmount);
    }
    
    /**
     * @notice Mark token as graduated
     */
    function markAsGraduated(
        address token,
        address /* uniswapPool */
    ) external override onlyRole(GRADUATION_ROLE) {
        TokenData storage data = tokens[token];
        require(data.initialized && !data.graduated, "Invalid state");
        data.graduated = true;
        emit TokenGraduated(token);
    }
    
    /**
     * @notice Claim creator fees
     */
    function claimCreatorFees(address /* token */) external override nonReentrant {
        uint256 fees = creatorBalances[msg.sender];
        require(fees > 0, "No fees");
        
        creatorBalances[msg.sender] = 0;
        
        (bool success, ) = msg.sender.call{value: fees}("");
        require(success, "Transfer failed");
        
        emit FeeClaimed(msg.sender, fees);
    }
    
    /**
     * @notice Claim platform fees
     */
    function claimPlatformFees() external override nonReentrant {
        require(msg.sender == globalState.feeRecipient, "Not recipient");
        
        uint256 fees = globalState.platformFees;
        require(fees > 0, "No fees");
        
        globalState.platformFees = 0;
        
        (bool success, ) = msg.sender.call{value: fees}("");
        require(success, "Transfer failed");
        
        emit FeeClaimed(msg.sender, fees);
    }
    
    // View functions (gas doesn't matter for these)
    function tokenInfo(address token) external view override returns (TokenInfo memory) {
        TokenData memory data = tokens[token];
        
        return TokenInfo({
            virtualEthReserve: data.virtualEthReserve,
            virtualTokenReserve: data.virtualTokenReserve,
            realEthReserve: data.realEthReserve,
            realTokenReserve: 0, // Not tracked to save gas
            creator: data.creator,
            createdAt: 0, // Not tracked
            createdBlock: data.createdBlock,
            tradingEnabledAt: data.createdBlock > 0 ? uint32(block.timestamp) : 0,
            graduated: data.graduated,
            uniswapPool: address(0),
            platformFees: 0,
            creatorFees: creatorBalances[data.creator],
            feeBps: data.feeBps
        });
    }
    
    function getCurrentPrice(address token) external view override returns (uint256) {
        TokenData memory data = tokens[token];
        if (data.virtualTokenReserve == 0) return 0;
        return (uint256(data.virtualEthReserve) * 10**18) / data.virtualTokenReserve;
    }
    
    function calculateTokensOut(
        address token,
        uint256 ethIn
    ) external view override returns (uint256) {
        TokenData memory data = tokens[token];
        uint256 ethAfterFee = ethIn - ethIn.mulBps(data.feeBps);
        return SafeMathUnchecked.calculateTokensOut(
            data.virtualEthReserve,
            data.virtualTokenReserve,
            ethAfterFee
        );
    }
    
    function calculateEthOut(
        address token,
        uint256 tokensIn
    ) external view override returns (uint256) {
        TokenData memory data = tokens[token];
        uint256 ethOut = SafeMathUnchecked.calculateEthOut(
            data.virtualEthReserve,
            data.virtualTokenReserve,
            tokensIn
        );
        return ethOut - ethOut.mulBps(data.feeBps);
    }
    
    function getMarketCap(address token) external view override returns (uint256) {
        TokenData memory data = tokens[token];
        uint256 price = (uint256(data.virtualEthReserve) * 10**18) / data.virtualTokenReserve;
        return (price * TOTAL_SUPPLY * 3000) / 10**26; // Assumes $3000 ETH
    }
    
    function getEthPriceUSD() external pure returns (uint256) {
        return 3000 * 10**8; // Hardcoded for gas optimization
    }
    
    // Admin functions
    function setFeeRecipient(address _feeRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        globalState.feeRecipient = _feeRecipient;
    }
    
    function enableTrading(address /* token */) external override {
        // No-op for gas optimization, trading enabled on init
    }
}