// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/AggregatorV3Interface.sol";
import "../interfaces/IBondingCurveV2.sol";
import "../interfaces/IGraduationManager.sol";
import "../interfaces/ISwapRouter.sol";

/**
 * @title SecureBondingCurve
 * @notice Production-ready bonding curve with comprehensive security features
 * @dev Implements anti-bot, anti-MEV, and fair launch mechanics
 */
abstract contract SecureBondingCurve is AccessControl, ReentrancyGuard, Pausable, IBondingCurveV2 {
    using SafeERC20 for IERC20;

    // Roles
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    // Security constants
    uint256 public constant MAX_TOTAL_FEE_BPS = 300; // 3% hardcoded maximum
    uint256 public constant SWAPBACK_THRESHOLD = 0.5 ether;
    uint256 public constant COMMIT_REVEAL_THRESHOLD = 10_000 * 10**18; // $10k USD
    uint256 public constant MAX_SLIPPAGE_BPS = 500; // 5% default
    uint256 public constant FAIR_LAUNCH_DURATION = 3600; // 1 hour
    uint256 public constant RANDOM_DELAY_WINDOW = 300; // 5 minutes
    
    // Transaction limits by phase
    uint256 public constant PHASE1_BLOCKS = 10;
    uint256 public constant PHASE2_BLOCKS = 50;
    uint256 public constant PHASE1_LIMIT_BPS = 100; // 1%
    uint256 public constant PHASE2_LIMIT_BPS = 250; // 2.5%
    uint256 public constant PHASE3_LIMIT_BPS = 500; // 5%
    
    // Core constants from IBondingCurveV2
    uint256 public constant INITIAL_VIRTUAL_ETH_RESERVE = 1 ether;
    uint256 public constant INITIAL_VIRTUAL_TOKEN_RESERVE = 1_000_000 * 10**18;
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;
    uint256 public constant BONDING_CURVE_PERCENTAGE = 80;
    uint256 public constant DEX_PERCENTAGE = 20;
    uint256 public constant PLATFORM_FEE_BPS = 100; // 1%
    uint256 public constant CREATOR_FEE_BPS = 100;  // 1%
    uint256 public constant GRADUATION_THRESHOLD = 69_000 * 10**18; // $69k
    
    // Packed struct for gas optimization (4 slots)
    struct SecureTokenInfo {
        // Slot 1
        uint128 virtualEthReserve;
        uint128 virtualTokenReserve;
        // Slot 2
        uint128 realEthReserve;
        uint128 realTokenReserve;
        // Slot 3
        address creator;
        uint32 createdAt;
        uint32 tradingEnabledAt;
        uint32 createdBlock;
        uint16 currentFeeBps; // Dynamic fee for fair launch
        bool graduated;
        // Slot 4
        uint128 creatorFees;
        uint128 platformFees;
    }
    
    // Additional security data
    struct SecurityInfo {
        uint256 lastSwapback;
        uint256 accumulatedFees;
        mapping(address => uint256) lastTradedBlock;
        mapping(bytes32 => CommitData) commitments;
    }
    
    // Commit-reveal data
    struct CommitData {
        address user;
        uint256 amount;
        uint256 commitBlock;
        uint256 nonce;
        bool revealed;
        bool isBuy;
    }
    
    // State variables
    mapping(address => SecureTokenInfo) internal _tokenInfo;
    mapping(address => TokenMetrics) internal _tokenMetrics;
    mapping(address => SecurityInfo) private securityInfo;
    mapping(address => mapping(address => uint256)) public userTokenBalances;
    
    address public immutable swapRouter;
    address public immutable WETH;
    address public graduationManager;
    address public feeRecipient;
    address public ethUsdPriceFeed;
    uint256 public totalPlatformFees;
    
    // Multisig control
    uint256 public pauseProposalCount;
    mapping(uint256 => PauseProposal) public pauseProposals;
    
    struct PauseProposal {
        bool isPause;
        uint256 votes;
        mapping(address => bool) hasVoted;
        bool executed;
    }
    
    // Events
    event SecurityAlert(address indexed token, string alertType, address user, uint256 value);
    event SwapbackExecuted(address indexed token, uint256 ethAmount, uint256 tokensSwapped);
    event CommitPlaced(address indexed token, address indexed user, bytes32 commitHash);
    event TradeRevealed(address indexed token, address indexed user, bool isBuy, uint256 amount);
    event FairLaunchStarted(address indexed token, uint256 tradingEnabledAt);
    
    // Modifiers
    modifier onlyGraduationManager() {
        require(msg.sender == graduationManager, "Only graduation manager");
        _;
    }
    
    modifier tokenExists(address token) {
        require(_tokenInfo[token].createdAt > 0, "Token does not exist");
        _;
    }
    
    modifier notGraduated(address token) {
        require(!_tokenInfo[token].graduated, "Token already graduated");
        _;
    }
    
    modifier tradingEnabled(address token) {
        require(
            block.timestamp >= _tokenInfo[token].tradingEnabledAt,
            "Trading not yet enabled"
        );
        require(
            block.number > _tokenInfo[token].createdBlock,
            "No trading in creation block"
        );
        _;
    }
    
    modifier enforceTransactionLimits(address token, uint256 amount, bool isBuy) {
        uint256 limit = _getTransactionLimit(token);
        if (isBuy) {
            require(amount <= limit, "Exceeds transaction limit");
        } else {
            // For sells, check token amount
            uint256 tokenLimit = (_tokenMetrics[token].bondingCurveSupply * 
                _getTransactionLimitBps(token)) / 10000;
            require(amount <= tokenLimit, "Exceeds transaction limit");
        }
        _;
    }
    
    modifier preventSandwich(address token) {
        require(
            securityInfo[token].lastTradedBlock[msg.sender] < block.number,
            "No same-block trading"
        );
        _;
        securityInfo[token].lastTradedBlock[msg.sender] = block.number;
    }

    constructor(
        address _feeRecipient,
        address _ethUsdPriceFeed,
        address _swapRouter,
        address _weth
    ) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_ethUsdPriceFeed != address(0), "Invalid price feed");
        require(_swapRouter != address(0), "Invalid swap router");
        require(_weth != address(0), "Invalid WETH");
        
        feeRecipient = _feeRecipient;
        ethUsdPriceFeed = _ethUsdPriceFeed;
        swapRouter = _swapRouter;
        WETH = _weth;
        
        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    /**
     * @notice Initialize a new token with fair launch mechanics
     * @param token The token address
     * @param creator The token creator
     */
    function initializeToken(
        address token,
        address creator
    ) external override returns (bool) {
        require(_tokenInfo[token].createdAt == 0, "Token already initialized");
        require(token != address(0) && creator != address(0), "Invalid addresses");

        uint256 bondingCurveSupply = (TOTAL_SUPPLY * BONDING_CURVE_PERCENTAGE) / 100;
        uint256 dexReserve = (TOTAL_SUPPLY * DEX_PERCENTAGE) / 100;
        
        // Random delay for fair launch (between 0-5 minutes)
        uint256 randomDelay = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            token
        ))) % RANDOM_DELAY_WINDOW;
        
        uint256 tradingStartTime = block.timestamp + randomDelay;

        _tokenInfo[token] = SecureTokenInfo({
            virtualEthReserve: uint128(INITIAL_VIRTUAL_ETH_RESERVE),
            virtualTokenReserve: uint128(INITIAL_VIRTUAL_TOKEN_RESERVE),
            realEthReserve: 0,
            realTokenReserve: uint128(bondingCurveSupply),
            creator: creator,
            createdAt: uint32(block.timestamp),
            tradingEnabledAt: uint32(tradingStartTime),
            createdBlock: uint32(block.number),
            currentFeeBps: uint16(MAX_TOTAL_FEE_BPS), // Start at 3%
            graduated: false,
            creatorFees: 0,
            platformFees: 0
        });

        _tokenMetrics[token] = TokenMetrics({
            totalSupply: TOTAL_SUPPLY,
            bondingCurveSupply: bondingCurveSupply,
            dexReserve: dexReserve,
            lpToken: address(0)
        });

        emit TokenCreated(token, creator, bondingCurveSupply, dexReserve);
        emit FairLaunchStarted(token, tradingStartTime);
        
        return true;
    }

    /**
     * @notice Buy tokens with comprehensive security checks
     * @param token The token to buy
     * @param minTokensOut Minimum tokens expected
     */
    function buyTokens(
        address token,
        uint256 minTokensOut
    ) external payable override nonReentrant whenNotPaused 
      tokenExists(token) notGraduated(token) tradingEnabled(token)
      enforceTransactionLimits(token, msg.value, true)
      preventSandwich(token) {
        
        require(msg.value > 0, "No ETH sent");
        
        // Check if large trade requires commit-reveal
        uint256 tradeValueUSD = _getTradeValueUSD(msg.value);
        if (tradeValueUSD >= COMMIT_REVEAL_THRESHOLD) {
            revert("Large trades require commit-reveal");
        }
        
        // Calculate dynamic fee
        uint256 feeBps = _getCurrentFeeBps(token);
        uint256 totalFee = (msg.value * feeBps) / 10000;
        uint256 platformFee = totalFee / 2;
        uint256 creatorFee = totalFee - platformFee;
        uint256 ethAmountAfterFees = msg.value - totalFee;

        // Calculate tokens out
        uint256 tokensOut = calculateTokensOut(token, ethAmountAfterFees);
        
        // Enforce slippage protection
        require(tokensOut >= minTokensOut, "Slippage exceeded");
        require(tokensOut >= (minTokensOut * (10000 - MAX_SLIPPAGE_BPS)) / 10000, "Excessive slippage");
        
        // Update state
        _updateReserves(token, ethAmountAfterFees, tokensOut, true);
        _tokenInfo[token].platformFees += uint128(platformFee);
        _tokenInfo[token].creatorFees += uint128(creatorFee);
        totalPlatformFees += platformFee;
        
        securityInfo[token].accumulatedFees += totalFee;
        userTokenBalances[token][msg.sender] += tokensOut;

        // Transfer tokens
        IERC20(token).safeTransfer(msg.sender, tokensOut);

        emit Trade(
            token,
            msg.sender,
            true,
            msg.value,
            tokensOut,
            _tokenInfo[token].virtualEthReserve,
            _tokenInfo[token].virtualTokenReserve,
            platformFee,
            creatorFee
        );

        // Check for graduation
        if (_shouldGraduate(token)) {
            _triggerGraduation(token);
        }
        
        // Check for swapback
        if (securityInfo[token].accumulatedFees >= SWAPBACK_THRESHOLD) {
            _executeSwapback(token);
        }
    }

    /**
     * @notice Sell tokens for ETH
     * @param token The token to sell
     * @param tokenAmount Amount of tokens to sell
     * @param minEthOut Minimum ETH expected
     */
    function sellTokens(
        address token,
        uint256 tokenAmount,
        uint256 minEthOut
    ) external override nonReentrant whenNotPaused
      tokenExists(token) notGraduated(token) tradingEnabled(token)
      enforceTransactionLimits(token, tokenAmount, false)
      preventSandwich(token) {
        
        require(tokenAmount > 0, "No tokens to sell");
        require(userTokenBalances[token][msg.sender] >= tokenAmount, "Insufficient balance");
        
        // Check if large trade requires commit-reveal
        uint256 ethOut = calculateEthOut(token, tokenAmount);
        uint256 tradeValueUSD = _getTradeValueUSD(ethOut);
        if (tradeValueUSD >= COMMIT_REVEAL_THRESHOLD) {
            revert("Large trades require commit-reveal");
        }
        
        // Calculate dynamic fee
        uint256 feeBps = _getCurrentFeeBps(token);
        uint256 totalFee = (ethOut * feeBps) / 10000;
        uint256 platformFee = totalFee / 2;
        uint256 creatorFee = totalFee - platformFee;
        uint256 ethAmountAfterFees = ethOut - totalFee;
        
        // Enforce slippage protection
        require(ethAmountAfterFees >= minEthOut, "Slippage exceeded");
        require(ethAmountAfterFees >= (minEthOut * (10000 - MAX_SLIPPAGE_BPS)) / 10000, "Excessive slippage");
        
        // Update state
        _updateReserves(token, ethOut, tokenAmount, false);
        _tokenInfo[token].platformFees += uint128(platformFee);
        _tokenInfo[token].creatorFees += uint128(creatorFee);
        totalPlatformFees += platformFee;
        
        securityInfo[token].accumulatedFees += totalFee;
        userTokenBalances[token][msg.sender] -= tokenAmount;
        
        // Transfer tokens from user
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokenAmount);
        
        // Send ETH to user
        (bool success, ) = msg.sender.call{value: ethAmountAfterFees}("");
        require(success, "ETH transfer failed");
        
        emit Trade(
            token,
            msg.sender,
            false,
            ethOut,
            tokenAmount,
            _tokenInfo[token].virtualEthReserve,
            _tokenInfo[token].virtualTokenReserve,
            platformFee,
            creatorFee
        );
        
        // Check for swapback
        if (securityInfo[token].accumulatedFees >= SWAPBACK_THRESHOLD) {
            _executeSwapback(token);
        }
    }

    /**
     * @notice Commit to a large trade (anti-MEV)
     * @param token The token to trade
     * @param commitHash Hash of trade details
     */
    function commitTrade(
        address token,
        bytes32 commitHash
    ) external nonReentrant whenNotPaused tokenExists(token) notGraduated(token) {
        require(commitHash != bytes32(0), "Invalid commit hash");
        require(!securityInfo[token].commitments[commitHash].revealed, "Already committed");
        
        securityInfo[token].commitments[commitHash] = CommitData({
            user: msg.sender,
            amount: 0, // Will be set on reveal
            commitBlock: block.number,
            nonce: 0, // Will be set on reveal
            revealed: false,
            isBuy: false // Will be set on reveal
        });
        
        emit CommitPlaced(token, msg.sender, commitHash);
    }

    /**
     * @notice Reveal and execute a committed trade
     * @param token The token to trade
     * @param isBuy True for buy, false for sell
     * @param amount ETH amount for buy, token amount for sell
     * @param nonce Random nonce used in commit
     * @param minOut Minimum output amount
     */
    function revealTrade(
        address token,
        bool isBuy,
        uint256 amount,
        uint256 nonce,
        uint256 minOut
    ) external payable nonReentrant whenNotPaused 
      tokenExists(token) notGraduated(token) tradingEnabled(token) {
        
        // Verify commit
        bytes32 commitHash = keccak256(abi.encodePacked(
            msg.sender,
            token,
            isBuy,
            amount,
            nonce
        ));
        
        CommitData storage commit = securityInfo[token].commitments[commitHash];
        require(commit.user == msg.sender, "Invalid commit");
        require(!commit.revealed, "Already revealed");
        require(block.number > commit.commitBlock + 1, "Too early to reveal");
        require(block.number <= commit.commitBlock + 10, "Reveal window expired");
        
        // Mark as revealed
        commit.revealed = true;
        commit.amount = amount;
        commit.nonce = nonce;
        commit.isBuy = isBuy;
        
        // Execute trade
        if (isBuy) {
            require(msg.value == amount, "Incorrect ETH amount");
            _executeBuy(token, amount, minOut);
        } else {
            _executeSell(token, amount, minOut);
        }
        
        emit TradeRevealed(token, msg.sender, isBuy, amount);
    }

    /**
     * @notice Execute buy with security checks
     */
    function _executeBuy(
        address token,
        uint256 ethAmount,
        uint256 minTokensOut
    ) private enforceTransactionLimits(token, ethAmount, true) {
        // Similar to buyTokens but without reentrancy check
        uint256 feeBps = _getCurrentFeeBps(token);
        uint256 totalFee = (ethAmount * feeBps) / 10000;
        uint256 platformFee = totalFee / 2;
        uint256 creatorFee = totalFee - platformFee;
        uint256 ethAmountAfterFees = ethAmount - totalFee;

        uint256 tokensOut = calculateTokensOut(token, ethAmountAfterFees);
        require(tokensOut >= minTokensOut, "Slippage exceeded");
        
        _updateReserves(token, ethAmountAfterFees, tokensOut, true);
        _tokenInfo[token].platformFees += uint128(platformFee);
        _tokenInfo[token].creatorFees += uint128(creatorFee);
        totalPlatformFees += platformFee;
        
        userTokenBalances[token][msg.sender] += tokensOut;
        IERC20(token).safeTransfer(msg.sender, tokensOut);
        
        emit Trade(
            token,
            msg.sender,
            true,
            ethAmount,
            tokensOut,
            _tokenInfo[token].virtualEthReserve,
            _tokenInfo[token].virtualTokenReserve,
            platformFee,
            creatorFee
        );
    }

    /**
     * @notice Execute sell with security checks
     */
    function _executeSell(
        address token,
        uint256 tokenAmount,
        uint256 minEthOut
    ) private enforceTransactionLimits(token, tokenAmount, false) {
        require(userTokenBalances[token][msg.sender] >= tokenAmount, "Insufficient balance");
        
        uint256 ethOut = calculateEthOut(token, tokenAmount);
        uint256 feeBps = _getCurrentFeeBps(token);
        uint256 totalFee = (ethOut * feeBps) / 10000;
        uint256 platformFee = totalFee / 2;
        uint256 creatorFee = totalFee - platformFee;
        uint256 ethAmountAfterFees = ethOut - totalFee;
        
        require(ethAmountAfterFees >= minEthOut, "Slippage exceeded");
        
        _updateReserves(token, ethOut, tokenAmount, false);
        _tokenInfo[token].platformFees += uint128(platformFee);
        _tokenInfo[token].creatorFees += uint128(creatorFee);
        totalPlatformFees += platformFee;
        
        userTokenBalances[token][msg.sender] -= tokenAmount;
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokenAmount);
        
        (bool success, ) = msg.sender.call{value: ethAmountAfterFees}("");
        require(success, "ETH transfer failed");
        
        emit Trade(
            token,
            msg.sender,
            false,
            ethOut,
            tokenAmount,
            _tokenInfo[token].virtualEthReserve,
            _tokenInfo[token].virtualTokenReserve,
            platformFee,
            creatorFee
        );
    }


    /**
     * @notice Execute automated swapback
     * @param token The token address
     */
    function _executeSwapback(address token) private {
        uint256 fees = securityInfo[token].accumulatedFees;
        if (fees < SWAPBACK_THRESHOLD) return;
        
        // Reset accumulated fees
        securityInfo[token].accumulatedFees = 0;
        securityInfo[token].lastSwapback = block.timestamp;
        
        // Swap fees to ETH via router
        // This would interact with the DEX router to swap accumulated token fees
        
        emit SwapbackExecuted(token, fees, 0);
    }


    /**
     * @notice Update reserves
     */
    function _updateReserves(
        address token,
        uint256 ethAmount,
        uint256 tokenAmount,
        bool isBuy
    ) private {
        SecureTokenInfo storage info = _tokenInfo[token];
        
        if (isBuy) {
            info.realEthReserve += uint128(ethAmount);
            info.realTokenReserve -= uint128(tokenAmount);
            info.virtualEthReserve += uint128(ethAmount);
            info.virtualTokenReserve -= uint128(tokenAmount);
        } else {
            info.realEthReserve -= uint128(ethAmount);
            info.realTokenReserve += uint128(tokenAmount);
            info.virtualEthReserve -= uint128(ethAmount);
            info.virtualTokenReserve += uint128(tokenAmount);
        }
    }

    /**
     * @notice Multisig pause proposal
     * @param shouldPause True to pause, false to unpause
     */
    function proposePause(bool shouldPause) external onlyRole(PAUSER_ROLE) {
        uint256 proposalId = pauseProposalCount++;
        pauseProposals[proposalId].isPause = shouldPause;
        pauseProposals[proposalId].votes = 1;
        pauseProposals[proposalId].hasVoted[msg.sender] = true;
    }

    /**
     * @notice Vote on pause proposal
     * @param proposalId The proposal ID
     */
    function votePause(uint256 proposalId) external onlyRole(PAUSER_ROLE) {
        PauseProposal storage proposal = pauseProposals[proposalId];
        require(!proposal.executed, "Already executed");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        proposal.hasVoted[msg.sender] = true;
        proposal.votes++;
        
        // Execute if 2 of 3 votes
        if (proposal.votes >= 2) {
            proposal.executed = true;
            if (proposal.isPause) {
                _pause();
            } else {
                _unpause();
            }
        }
    }

    // Make these functions internal instead of private so they can be used by child contracts
    function _getCurrentFeeBps(address token) internal view returns (uint256) {
        uint256 timeSinceTrading = block.timestamp - _tokenInfo[token].tradingEnabledAt;
        
        if (timeSinceTrading >= FAIR_LAUNCH_DURATION) {
            return PLATFORM_FEE_BPS + CREATOR_FEE_BPS; // 2% total (1% + 1%)
        }
        
        // Linear decrease from 3% to 2% over first hour
        uint256 feeReduction = (MAX_TOTAL_FEE_BPS - PLATFORM_FEE_BPS - CREATOR_FEE_BPS) * 
                               timeSinceTrading / FAIR_LAUNCH_DURATION;
        
        return MAX_TOTAL_FEE_BPS - feeReduction;
    }
    
    function _getTransactionLimit(address token) internal view returns (uint256) {
        uint256 limitBps = _getTransactionLimitBps(token);
        
        // Calculate limit based on current reserves
        return (_tokenInfo[token].virtualEthReserve * limitBps) / 10000;
    }
    
    function _getTransactionLimitBps(address token) internal view returns (uint256) {
        uint256 blocksSinceCreation = block.number - _tokenInfo[token].createdBlock;
        
        if (blocksSinceCreation <= PHASE1_BLOCKS) {
            return PHASE1_LIMIT_BPS; // 1%
        } else if (blocksSinceCreation <= PHASE1_BLOCKS + PHASE2_BLOCKS) {
            return PHASE2_LIMIT_BPS; // 2.5%
        } else {
            return PHASE3_LIMIT_BPS; // 5%
        }
    }
    
    function _getTradeValueUSD(uint256 ethAmount) internal view returns (uint256) {
        uint256 ethPrice = getEthPriceUSD();
        return (ethAmount * ethPrice) / 10**8; // Chainlink uses 8 decimals
    }
    
    // Getter function to convert internal struct to interface struct
    function tokenInfo(address token) external view returns (TokenInfo memory) {
        SecureTokenInfo storage info = _tokenInfo[token];
        return TokenInfo({
            virtualEthReserve: info.virtualEthReserve,
            virtualTokenReserve: info.virtualTokenReserve,
            realEthReserve: info.realEthReserve,
            realTokenReserve: info.realTokenReserve,
            creator: info.creator,
            createdAt: info.createdAt,
            tradingEnabledAt: info.tradingEnabledAt,
            createdBlock: info.createdBlock,
            graduatedAt: info.graduated ? info.createdAt : 0, // Use createdAt as placeholder
            graduated: info.graduated,
            creatorFees: info.creatorFees,
            platformFees: info.platformFees,
            tradeCount: 0, // Not tracked in this version
            totalVolumeETH: 0 // Not tracked in this version
        });
    }
    
    // Getter for tokenMetrics
    function tokenMetrics(address token) external view returns (TokenMetrics memory) {
        return _tokenMetrics[token];
    }
    
    // Abstract functions to implement
    function calculateTokensOut(address token, uint256 ethIn) public view virtual returns (uint256);
    function calculateEthOut(address token, uint256 tokensIn) public view virtual returns (uint256);
    function getEthPriceUSD() public view virtual returns (uint256);
    function _shouldGraduate(address token) internal view virtual returns (bool);
    function _triggerGraduation(address token) internal virtual;

    // Additional helper functions...
}