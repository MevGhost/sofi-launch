// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LaunchpadToken
 * @dev ERC20 token created through the S4Labs launchpad
 */
contract LaunchpadToken is ERC20 {
    string public imageUrl;
    string public description;
    string public twitter;
    string public telegram;
    string public website;
    address public immutable creator;
    uint256 public immutable createdAt;
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply,
        string memory _imageUrl,
        string memory _description,
        string memory _twitter,
        string memory _telegram,
        string memory _website,
        address _creator,
        address _initialHolder
    ) ERC20(_name, _symbol) {
        imageUrl = _imageUrl;
        description = _description;
        twitter = _twitter;
        telegram = _telegram;
        website = _website;
        creator = _creator;
        createdAt = block.timestamp;
        
        _mint(_initialHolder, _totalSupply);
    }
}

/**
 * @title SecureLowFeeBondingCurve
 * @dev Improved bonding curve with security features and anti-spam mechanisms
 * Inspired by successful Base platforms with added safety
 */
contract SecureLowFeeBondingCurve is Ownable(msg.sender), ReentrancyGuard, Pausable {
    // Token configuration
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1B tokens
    uint256 public constant BONDING_SUPPLY = 800_000_000 * 10**18; // 800M to bonding curve
    uint256 public constant DEX_RESERVE = 200_000_000 * 10**18; // 200M for DEX
    uint256 public constant CREATION_FEE = 0.001 ether; // Keep low fee
    
    // Bonding curve configuration
    uint256 public constant INITIAL_VIRTUAL_ETH = 1 ether;
    uint256 public constant INITIAL_VIRTUAL_TOKENS = 1_000_000 * 10**18;
    uint256 public constant GRADUATION_THRESHOLD = 69_000 * 10**18; // $69k market cap
    
    // Fees (adjustable by owner within limits)
    uint256 public platformFeeBps = 100; // 1% default
    uint256 public creatorFeeBps = 100; // 1% default
    uint256 public constant MAX_FEE_BPS = 300; // 3% max total fees
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // Anti-spam and safety features
    uint256 public constant MIN_TRADE_AMOUNT = 0.0001 ether; // Minimum trade size
    uint256 public constant MAX_TRADE_AMOUNT = 10 ether; // Maximum single trade
    uint256 public constant COOLDOWN_PERIOD = 1 minutes; // Between token creations
    uint256 public constant MAX_TOKENS_PER_USER = 3; // Max tokens per address initially
    uint256 public constant LOCK_PERIOD = 1 hours; // Initial liquidity lock
    
    // MEV Protection
    uint256 private constant MAX_SLIPPAGE_BPS = 500; // 5% max slippage
    mapping(address => uint256) private lastTradeBlock;
    
    // Token info for bonding curve
    struct TokenInfo {
        address tokenAddress;
        address creator;
        uint256 virtualEthReserve;
        uint256 virtualTokenReserve;
        uint256 realEthReserve;
        uint256 realTokenReserve;
        uint256 dexReserve;
        uint256 creatorFees;
        uint256 platformFees;
        bool graduated;
        uint256 createdAt;
        uint256 firstTradeAt;
        uint256 lockedUntil;
        uint256 totalVolume;
        uint256 tradeCount;
    }
    
    // Storage
    mapping(address => TokenInfo) public tokenInfo;
    mapping(address => uint256) public userLastCreation;
    mapping(address => uint256) public userTokenCount;
    mapping(address => bool) public isValidToken;
    mapping(address => bool) public blacklistedUsers;
    address[] public allTokens;
    uint256 public totalPlatformFees;
    
    // Events
    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 timestamp
    );
    
    event TokenTraded(
        address indexed token,
        address indexed trader,
        bool isBuy,
        uint256 ethAmount,
        uint256 tokenAmount,
        uint256 newPrice,
        uint256 platformFee,
        uint256 creatorFee
    );
    
    event TokenGraduated(
        address indexed token,
        uint256 ethReserve,
        uint256 tokenReserve,
        uint256 totalVolume
    );
    
    event FeesUpdated(uint256 platformFeeBps, uint256 creatorFeeBps);
    event UserBlacklisted(address indexed user, bool status);
    event EmergencyWithdraw(address indexed token, uint256 amount);
    
    // Modifiers
    modifier notBlacklisted() {
        require(!blacklistedUsers[msg.sender], "User blacklisted");
        _;
    }
    
    modifier validToken(address _token) {
        require(isValidToken[_token], "Invalid token");
        _;
    }
    
    modifier antiMEV() {
        require(lastTradeBlock[msg.sender] < block.number, "Same block trade");
        lastTradeBlock[msg.sender] = block.number;
        _;
    }
    
    /**
     * @dev Create a new token with improved validation
     */
    function createToken(
        string memory _name,
        string memory _symbol,
        string memory _description,
        string memory _imageUrl,
        string memory _twitter,
        string memory _telegram,
        string memory _website,
        string memory /* _category */
    ) external payable nonReentrant whenNotPaused notBlacklisted returns (address) {
        require(msg.value >= CREATION_FEE, "Insufficient fee");
        
        // Anti-spam checks
        require(
            block.timestamp >= userLastCreation[msg.sender] + COOLDOWN_PERIOD,
            "Cooldown period active"
        );
        require(
            userTokenCount[msg.sender] < MAX_TOKENS_PER_USER || 
            totalPlatformFees >= 1 ether, // Unlock after platform earns 1 ETH
            "Token limit reached"
        );
        
        // Validate inputs
        require(bytes(_name).length > 0 && bytes(_name).length <= 32, "Invalid name");
        require(bytes(_symbol).length >= 2 && bytes(_symbol).length <= 8, "Invalid symbol");
        require(bytes(_description).length <= 500, "Description too long");
        
        // Deploy new token
        LaunchpadToken newToken = new LaunchpadToken(
            _name,
            _symbol,
            TOTAL_SUPPLY,
            _imageUrl,
            _description,
            _twitter,
            _telegram,
            _website,
            msg.sender,
            address(this)
        );
        
        address tokenAddress = address(newToken);
        
        // Initialize bonding curve with lock period
        tokenInfo[tokenAddress] = TokenInfo({
            tokenAddress: tokenAddress,
            creator: msg.sender,
            virtualEthReserve: INITIAL_VIRTUAL_ETH,
            virtualTokenReserve: INITIAL_VIRTUAL_TOKENS,
            realEthReserve: 0,
            realTokenReserve: BONDING_SUPPLY,
            dexReserve: DEX_RESERVE,
            creatorFees: 0,
            platformFees: 0,
            graduated: false,
            createdAt: block.timestamp,
            firstTradeAt: 0,
            lockedUntil: block.timestamp + LOCK_PERIOD,
            totalVolume: 0,
            tradeCount: 0
        });
        
        // Update tracking
        allTokens.push(tokenAddress);
        isValidToken[tokenAddress] = true;
        userLastCreation[msg.sender] = block.timestamp;
        userTokenCount[msg.sender]++;
        totalPlatformFees += CREATION_FEE;
        
        emit TokenCreated(tokenAddress, msg.sender, _name, _symbol, block.timestamp);
        
        // Refund excess
        if (msg.value > CREATION_FEE) {
            (bool success, ) = msg.sender.call{value: msg.value - CREATION_FEE}("");
            require(success, "Refund failed");
        }
        
        return tokenAddress;
    }
    
    /**
     * @dev Buy tokens with improved safety
     */
    function buyTokens(address _token, uint256 _minTokensOut) 
        external 
        payable 
        nonReentrant
        whenNotPaused
        notBlacklisted
        validToken(_token)
        antiMEV
        returns (uint256) 
    {
        TokenInfo storage info = tokenInfo[_token];
        require(!info.graduated, "Token graduated");
        require(msg.value >= MIN_TRADE_AMOUNT, "Trade too small");
        require(msg.value <= MAX_TRADE_AMOUNT, "Trade too large");
        
        // Check lock period for non-creators
        if (msg.sender != info.creator) {
            require(block.timestamp >= info.lockedUntil, "Token locked");
        }
        
        // Record first trade
        if (info.firstTradeAt == 0) {
            info.firstTradeAt = block.timestamp;
        }
        
        // Calculate fees
        uint256 platformFee = (msg.value * platformFeeBps) / BPS_DENOMINATOR;
        uint256 creatorFee = (msg.value * creatorFeeBps) / BPS_DENOMINATOR;
        uint256 ethAfterFees = msg.value - platformFee - creatorFee;
        
        // Calculate tokens out using constant product formula
        uint256 totalEthReserve = info.virtualEthReserve + info.realEthReserve;
        uint256 totalTokenReserve = info.virtualTokenReserve + info.realTokenReserve;
        
        uint256 k = totalEthReserve * totalTokenReserve;
        uint256 newEthReserve = totalEthReserve + ethAfterFees;
        uint256 newTokenReserve = k / newEthReserve;
        uint256 tokensOut = totalTokenReserve - newTokenReserve;
        
        // Slippage protection
        require(tokensOut >= _minTokensOut, "Slippage exceeded");
        require(tokensOut <= info.realTokenReserve, "Insufficient liquidity");
        
        // Additional slippage check (max 5%)
        uint256 expectedTokens = (ethAfterFees * totalTokenReserve) / totalEthReserve;
        require(
            tokensOut >= (expectedTokens * (BPS_DENOMINATOR - MAX_SLIPPAGE_BPS)) / BPS_DENOMINATOR,
            "Excessive slippage"
        );
        
        // Update state
        info.realEthReserve += ethAfterFees;
        info.realTokenReserve -= tokensOut;
        info.creatorFees += creatorFee;
        info.platformFees += platformFee;
        info.totalVolume += msg.value;
        info.tradeCount++;
        totalPlatformFees += platformFee;
        
        // Transfer tokens
        require(IERC20(_token).transfer(msg.sender, tokensOut), "Transfer failed");
        
        // Calculate and emit price
        uint256 newPrice = (newEthReserve * 10**18) / newTokenReserve;
        emit TokenTraded(
            _token,
            msg.sender,
            true,
            msg.value,
            tokensOut,
            newPrice,
            platformFee,
            creatorFee
        );
        
        // Check graduation
        if ((newPrice * TOTAL_SUPPLY / 10**18) >= GRADUATION_THRESHOLD) {
            _graduateToken(_token);
        }
        
        return tokensOut;
    }
    
    /**
     * @dev Sell tokens with improved safety
     */
    function sellTokens(
        address _token,
        uint256 _tokenAmount,
        uint256 _minEthOut
    )
        external
        nonReentrant
        whenNotPaused
        notBlacklisted
        validToken(_token)
        antiMEV
        returns (uint256)
    {
        TokenInfo storage info = tokenInfo[_token];
        require(!info.graduated, "Token graduated");
        require(_tokenAmount > 0, "Invalid amount");
        
        // Check lock period for non-creators
        if (msg.sender != info.creator) {
            require(block.timestamp >= info.lockedUntil, "Token locked");
        }
        
        // Calculate ETH out
        uint256 totalEthReserve = info.virtualEthReserve + info.realEthReserve;
        uint256 totalTokenReserve = info.virtualTokenReserve + info.realTokenReserve;
        
        uint256 k = totalEthReserve * totalTokenReserve;
        uint256 newTokenReserve = totalTokenReserve + _tokenAmount;
        uint256 newEthReserve = k / newTokenReserve;
        uint256 ethOut = totalEthReserve - newEthReserve;
        
        // Apply fees
        uint256 platformFee = (ethOut * platformFeeBps) / BPS_DENOMINATOR;
        uint256 creatorFee = (ethOut * creatorFeeBps) / BPS_DENOMINATOR;
        uint256 ethAfterFees = ethOut - platformFee - creatorFee;
        
        require(ethAfterFees >= _minEthOut, "Slippage exceeded");
        require(ethAfterFees <= info.realEthReserve, "Insufficient liquidity");
        
        // Transfer tokens from seller
        require(
            IERC20(_token).transferFrom(msg.sender, address(this), _tokenAmount),
            "Transfer failed"
        );
        
        // Update state
        info.realEthReserve -= ethOut;
        info.realTokenReserve += _tokenAmount;
        info.creatorFees += creatorFee;
        info.platformFees += platformFee;
        info.totalVolume += ethOut;
        info.tradeCount++;
        totalPlatformFees += platformFee;
        
        // Send ETH to seller
        (bool success, ) = msg.sender.call{value: ethAfterFees}("");
        require(success, "ETH transfer failed");
        
        // Calculate and emit price
        uint256 newPrice = (newEthReserve * 10**18) / newTokenReserve;
        emit TokenTraded(
            _token,
            msg.sender,
            false,
            ethOut,
            _tokenAmount,
            newPrice,
            platformFee,
            creatorFee
        );
        
        return ethAfterFees;
    }
    
    /**
     * @dev Graduate token to DEX
     */
    function _graduateToken(address _token) private {
        TokenInfo storage info = tokenInfo[_token];
        require(!info.graduated, "Already graduated");
        
        info.graduated = true;
        
        // Here you would implement DEX pool creation
        // For now, just emit the event
        emit TokenGraduated(
            _token,
            info.realEthReserve,
            info.dexReserve,
            info.totalVolume
        );
    }
    
    /**
     * @dev Claim creator fees
     */
    function claimCreatorFees(address _token) external nonReentrant {
        TokenInfo storage info = tokenInfo[_token];
        require(msg.sender == info.creator, "Not creator");
        require(info.creatorFees > 0, "No fees to claim");
        
        uint256 fees = info.creatorFees;
        info.creatorFees = 0;
        
        (bool success, ) = msg.sender.call{value: fees}("");
        require(success, "Transfer failed");
    }
    
    // Admin functions
    
    function updateFees(uint256 _platformFeeBps, uint256 _creatorFeeBps) 
        external 
        onlyOwner 
    {
        require(_platformFeeBps + _creatorFeeBps <= MAX_FEE_BPS, "Fees too high");
        platformFeeBps = _platformFeeBps;
        creatorFeeBps = _creatorFeeBps;
        emit FeesUpdated(_platformFeeBps, _creatorFeeBps);
    }
    
    function toggleBlacklist(address _user, bool _status) external onlyOwner {
        blacklistedUsers[_user] = _status;
        emit UserBlacklisted(_user, _status);
    }
    
    function withdrawPlatformFees() external onlyOwner {
        uint256 fees = totalPlatformFees;
        totalPlatformFees = 0;
        (bool success, ) = owner().call{value: fees}("");
        require(success, "Transfer failed");
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // View functions
    
    function getTokenPrice(address _token) external view returns (uint256) {
        TokenInfo storage info = tokenInfo[_token];
        if (info.tokenAddress == address(0)) return 0;
        
        uint256 totalEthReserve = info.virtualEthReserve + info.realEthReserve;
        uint256 totalTokenReserve = info.virtualTokenReserve + info.realTokenReserve;
        
        return (totalEthReserve * 10**18) / totalTokenReserve;
    }
    
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }
    
    function getTokenCount() external view returns (uint256) {
        return allTokens.length;
    }
}