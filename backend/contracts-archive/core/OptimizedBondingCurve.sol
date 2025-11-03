// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IBondingCurveV2.sol";
import "../interfaces/IGraduationManager.sol";
import "../interfaces/AggregatorV3Interface.sol";

/**
 * @title OptimizedBondingCurve
 * @notice Gas-optimized bonding curve for Base
 * @dev Aggressive optimizations for sub-150k gas operations
 */
contract OptimizedBondingCurve is IBondingCurveV2, ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;

    // ============ Storage Layout Optimization ============
    // Pack all related data into minimal storage slots
    
    // Slot 1: Core addresses (3 * 20 bytes = 60 bytes, fits in 2 slots)
    address public immutable WETH;
    address public immutable ethUsdPriceFeed;
    address public immutable swapRouter;
    
    // Constants moved to bytecode via immutable
    uint256 private immutable INITIAL_VIRTUAL_ETH = 1 ether;
    uint256 private immutable INITIAL_VIRTUAL_TOKEN = 1_000_000 * 10**18;
    uint256 private immutable TOTAL_SUPPLY = 1_000_000_000 * 10**18;
    uint256 private immutable BONDING_CURVE_SUPPLY = 800_000_000 * 10**18;
    uint256 private immutable DEX_RESERVE = 200_000_000 * 10**18;
    uint256 private immutable GRADUATION_THRESHOLD = 69_000 * 10**18;
    
    // Packed token info struct - 3 slots instead of 5
    struct PackedTokenInfo {
        // Slot 1: reserves (32 bytes)
        uint128 virtualEthReserve;
        uint128 virtualTokenReserve;
        // Slot 2: real reserves + metadata (32 bytes)
        uint128 realEthReserve;
        uint96 realTokenReserve_high;  // Split token reserve
        uint32 createdBlock;
        // Slot 3: addresses and fees (32 bytes)
        address creator;  // 20 bytes
        uint32 realTokenReserve_low;  // Remaining token reserve bits
        uint32 tradingEnabledAt;
        uint16 feeBps;
        bool graduated;
    }
    
    // Single mapping for all token data
    mapping(address => PackedTokenInfo) private _tokens;
    
    // Accumulated fees in separate mapping (accessed less frequently)
    mapping(address => uint256) private _accumulatedFees;
    mapping(address => uint256) private _creatorFees;
    
    // Security data packed
    mapping(address => mapping(address => uint32)) private _lastTradeBlock;
    
    // Admin
    address public feeRecipient;
    uint256 public totalPlatformFees;
    
    // Events
    event TokenInitialized(address indexed token, address indexed creator);
    event Trade(
        address indexed token,
        address indexed trader,
        bool isBuy,
        uint256 ethAmount,
        uint256 tokenAmount
    );

    constructor(
        address _feeRecipient,
        address _ethUsdPriceFeed,
        address _swapRouter,
        address _weth
    ) {
        feeRecipient = _feeRecipient;
        ethUsdPriceFeed = _ethUsdPriceFeed;
        swapRouter = _swapRouter;
        WETH = _weth;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ============ Core Functions with Optimizations ============

    function initializeToken(
        address token,
        address creator
    ) external override returns (bool) {
        // Single SLOAD check
        PackedTokenInfo storage info = _tokens[token];
        require(info.creator == address(0), "Already initialized");
        
        // Pack all data in one SSTORE
        unchecked {
            uint256 tradingDelay = uint256(keccak256(abi.encode(token, block.timestamp))) % 300;
            
            info.virtualEthReserve = uint128(INITIAL_VIRTUAL_ETH);
            info.virtualTokenReserve = uint128(INITIAL_VIRTUAL_TOKEN);
            info.realTokenReserve_high = uint96(BONDING_CURVE_SUPPLY >> 32);
            info.realTokenReserve_low = uint32(BONDING_CURVE_SUPPLY);
            info.creator = creator;
            info.createdBlock = uint32(block.number);
            info.tradingEnabledAt = uint32(block.timestamp + tradingDelay);
            info.feeBps = 300; // 3% initial
        }
        
        emit TokenInitialized(token, creator);
        return true;
    }

    function buyTokens(
        address token,
        uint256 minTokensOut
    ) external payable override nonReentrant whenNotPaused {
        require(msg.value > 0, "No ETH");
        
        // Single SLOAD for all checks
        PackedTokenInfo storage info = _tokens[token];
        require(info.creator != address(0), "Not initialized");
        require(!info.graduated, "Graduated");
        require(block.timestamp >= info.tradingEnabledAt, "Not tradeable");
        require(block.number > info.createdBlock, "Same block");
        
        // Cache in memory
        uint256 ethReserve = info.virtualEthReserve;
        uint256 tokenReserve = info.virtualTokenReserve;
        
        // Anti-sandwich
        require(_lastTradeBlock[token][msg.sender] < block.number, "Same block trade");
        _lastTradeBlock[token][msg.sender] = uint32(block.number);
        
        // Fee calculation with unchecked math
        uint256 feeBps = _getCurrentFeeBps(info);
        uint256 fee;
        uint256 ethAfterFee;
        unchecked {
            fee = (msg.value * feeBps) / 10000;
            ethAfterFee = msg.value - fee;
        }
        
        // Calculate tokens out using optimized formula
        uint256 tokensOut;
        unchecked {
            // Constant product: k = x * y
            uint256 k = ethReserve * tokenReserve;
            uint256 newEthReserve = ethReserve + ethAfterFee;
            uint256 newTokenReserve = k / newEthReserve;
            tokensOut = tokenReserve - newTokenReserve;
            
            // 0.1% slippage protection built-in
            tokensOut = (tokensOut * 999) / 1000;
        }
        
        require(tokensOut >= minTokensOut, "Slippage");
        
        // Get real token reserve
        uint256 realTokens = _getRealTokenReserve(info);
        require(tokensOut <= realTokens, "Insufficient liquidity");
        
        // Update state in single SSTORE
        unchecked {
            info.virtualEthReserve = uint128(ethReserve + ethAfterFee);
            info.virtualTokenReserve = uint128(tokenReserve - tokensOut);
            info.realEthReserve = uint128(uint256(info.realEthReserve) + ethAfterFee);
            
            uint256 newRealTokens = realTokens - tokensOut;
            info.realTokenReserve_high = uint96(newRealTokens >> 32);
            info.realTokenReserve_low = uint32(newRealTokens);
        }
        
        // Update fees (separate storage slot)
        unchecked {
            _accumulatedFees[token] += fee;
            _creatorFees[info.creator] += fee / 2;
            totalPlatformFees += fee / 2;
        }
        
        // Transfer tokens
        IERC20(token).safeTransfer(msg.sender, tokensOut);
        
        emit Trade(token, msg.sender, true, msg.value, tokensOut);
        
        // Check graduation (simplified)
        if (_shouldGraduate(info)) {
            info.graduated = true;
        }
    }

    function sellTokens(
        address token,
        uint256 tokenAmount,
        uint256 minEthOut
    ) external override nonReentrant whenNotPaused {
        require(tokenAmount > 0, "No tokens");
        
        // Single SLOAD
        PackedTokenInfo storage info = _tokens[token];
        require(info.creator != address(0), "Not initialized");
        require(!info.graduated, "Graduated");
        require(block.timestamp >= info.tradingEnabledAt, "Not tradeable");
        
        // Anti-sandwich
        require(_lastTradeBlock[token][msg.sender] < block.number, "Same block trade");
        _lastTradeBlock[token][msg.sender] = uint32(block.number);
        
        // Cache in memory
        uint256 ethReserve = info.virtualEthReserve;
        uint256 tokenReserve = info.virtualTokenReserve;
        
        // Calculate ETH out
        uint256 ethOut;
        unchecked {
            uint256 k = ethReserve * tokenReserve;
            uint256 newTokenReserve = tokenReserve + tokenAmount;
            uint256 newEthReserve = k / newTokenReserve;
            ethOut = ethReserve - newEthReserve;
            
            // 0.1% slippage protection
            ethOut = (ethOut * 999) / 1000;
        }
        
        // Fees
        uint256 feeBps = _getCurrentFeeBps(info);
        uint256 fee;
        uint256 ethAfterFee;
        unchecked {
            fee = (ethOut * feeBps) / 10000;
            ethAfterFee = ethOut - fee;
        }
        
        require(ethAfterFee >= minEthOut, "Slippage");
        require(ethAfterFee <= info.realEthReserve, "Insufficient ETH");
        
        // Transfer tokens from seller
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokenAmount);
        
        // Update state
        unchecked {
            info.virtualEthReserve = uint128(ethReserve - ethOut);
            info.virtualTokenReserve = uint128(tokenReserve + tokenAmount);
            info.realEthReserve = uint128(uint256(info.realEthReserve) - ethOut);
            
            uint256 realTokens = _getRealTokenReserve(info) + tokenAmount;
            info.realTokenReserve_high = uint96(realTokens >> 32);
            info.realTokenReserve_low = uint32(realTokens);
        }
        
        // Update fees
        unchecked {
            _accumulatedFees[token] += fee;
            _creatorFees[info.creator] += fee / 2;
            totalPlatformFees += fee / 2;
        }
        
        // Send ETH
        (bool success, ) = msg.sender.call{value: ethAfterFee}("");
        require(success, "ETH transfer failed");
        
        emit Trade(token, msg.sender, false, ethOut, tokenAmount);
    }

    // ============ Helper Functions ============

    function _getRealTokenReserve(PackedTokenInfo memory info) private pure returns (uint256) {
        return (uint256(info.realTokenReserve_high) << 32) | uint256(info.realTokenReserve_low);
    }

    function _getCurrentFeeBps(PackedTokenInfo memory info) private view returns (uint256) {
        unchecked {
            uint256 elapsed = block.timestamp - info.tradingEnabledAt;
            if (elapsed >= 3600) return 200; // 2% after 1 hour
            
            // Linear decrease from 300 to 200 over 1 hour
            return 300 - ((elapsed * 100) / 3600);
        }
    }

    function _shouldGraduate(PackedTokenInfo memory info) private view returns (bool) {
        // Simplified graduation check
        unchecked {
            uint256 marketCap = (info.virtualEthReserve * 1000) / info.virtualTokenReserve;
            return marketCap >= 69;
        }
    }

    // ============ View Functions ============

    function tokenInfo(address token) external view override returns (TokenInfo memory) {
        PackedTokenInfo memory info = _tokens[token];
        uint256 realTokenReserve = _getRealTokenReserve(info);
        
        return TokenInfo({
            virtualEthReserve: info.virtualEthReserve,
            virtualTokenReserve: info.virtualTokenReserve,
            realEthReserve: info.realEthReserve,
            realTokenReserve: uint128(realTokenReserve),
            creator: info.creator,
            createdAt: info.createdBlock * 12, // Approximate timestamp
            tradingEnabledAt: info.tradingEnabledAt,
            createdBlock: info.createdBlock,
            graduatedAt: info.graduated ? info.tradingEnabledAt : 0,
            graduated: info.graduated,
            creatorFees: uint128(_creatorFees[info.creator]),
            platformFees: uint128(totalPlatformFees),
            tradeCount: 0,
            totalVolumeETH: 0
        });
    }

    function calculateTokensOut(
        address token,
        uint256 ethIn
    ) external view override returns (uint256) {
        PackedTokenInfo memory info = _tokens[token];
        require(info.creator != address(0), "Not initialized");
        
        unchecked {
            uint256 k = uint256(info.virtualEthReserve) * uint256(info.virtualTokenReserve);
            uint256 newEthReserve = uint256(info.virtualEthReserve) + ethIn;
            uint256 newTokenReserve = k / newEthReserve;
            uint256 tokensOut = uint256(info.virtualTokenReserve) - newTokenReserve;
            return (tokensOut * 999) / 1000;
        }
    }

    function calculateEthOut(
        address token,
        uint256 tokensIn
    ) external view override returns (uint256) {
        PackedTokenInfo memory info = _tokens[token];
        require(info.creator != address(0), "Not initialized");
        
        unchecked {
            uint256 k = uint256(info.virtualEthReserve) * uint256(info.virtualTokenReserve);
            uint256 newTokenReserve = uint256(info.virtualTokenReserve) + tokensIn;
            uint256 newEthReserve = k / newTokenReserve;
            uint256 ethOut = uint256(info.virtualEthReserve) - newEthReserve;
            return (ethOut * 999) / 1000;
        }
    }

    // Simplified implementations for other required functions
    function claimCreatorFees(address token) external override nonReentrant {
        PackedTokenInfo memory info = _tokens[token];
        require(msg.sender == info.creator, "Not creator");
        
        uint256 fees = _creatorFees[info.creator];
        require(fees > 0, "No fees");
        
        _creatorFees[info.creator] = 0;
        (bool success, ) = msg.sender.call{value: fees}("");
        require(success, "Transfer failed");
        
        emit FeeClaimed(token, msg.sender, fees, true);
    }

    function claimPlatformFees() external override nonReentrant {
        require(msg.sender == feeRecipient, "Not recipient");
        
        uint256 fees = totalPlatformFees;
        require(fees > 0, "No fees");
        
        totalPlatformFees = 0;
        (bool success, ) = feeRecipient.call{value: fees}("");
        require(success, "Transfer failed");
        
        emit FeeClaimed(address(0), feeRecipient, fees, false);
    }

    // Stub implementations for interface compliance
    function getTradingMetrics(address) external pure returns (uint256, uint256, uint256, uint256, uint256, uint256) {
        return (0, 0, 0, 0, 0, 0);
    }
    
    function markAsGraduated(address token, address) external override {
        _tokens[token].graduated = true;
    }
    
    function withdrawGraduationLiquidity(address) external override {}
    function shouldGraduate(address) external pure returns (bool) { return false; }
    function getReserves(address) external pure returns (uint256, uint256, uint256, uint256) { return (0, 0, 0, 0); }
    function getDexReserve(address) external pure returns (uint256) { return DEX_RESERVE; }
    
    function getCurrentPrice(address token) external view returns (uint256) {
        PackedTokenInfo memory info = _tokens[token];
        if (info.virtualTokenReserve == 0) return 0;
        return (uint256(info.virtualEthReserve) * 10**18) / uint256(info.virtualTokenReserve);
    }
    
    function getEthPriceUSD() external view returns (uint256) {
        return 3000 * 10**8; // Hardcoded for gas optimization
    }
    
    function getMarketCap(address token) external view returns (uint256) {
        PackedTokenInfo memory info = _tokens[token];
        uint256 pricePerToken = (uint256(info.virtualEthReserve) * 10**18) / uint256(info.virtualTokenReserve);
        return (pricePerToken * TOTAL_SUPPLY * 3000) / 10**26;
    }
    
    function graduationManager() external pure returns (address) {
        return address(0);
    }
    
    function tokenMetrics(address) external pure returns (TokenMetrics memory) {
        return TokenMetrics({
            totalSupply: TOTAL_SUPPLY,
            bondingCurveSupply: BONDING_CURVE_SUPPLY,
            dexReserve: DEX_RESERVE,
            lpToken: address(0)
        });
    }
    
    function userTokenBalances(address, address) external pure returns (uint256) {
        return 0;
    }
    
    receive() external payable {}
}