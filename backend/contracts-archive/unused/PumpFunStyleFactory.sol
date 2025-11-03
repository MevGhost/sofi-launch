// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BondingCurveToken
 * @dev Simple ERC20 token for bonding curve
 */
contract BondingCurveToken is ERC20 {
    address public immutable creator;
    uint256 public immutable createdAt;
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply,
        address _creator,
        address _initialHolder
    ) ERC20(_name, _symbol) {
        creator = _creator;
        createdAt = block.timestamp;
        _mint(_initialHolder, _totalSupply);
    }
}

/**
 * @title PumpFunStyleFactory
 * @dev Implements pump.fun/lets-bonk style bonding curve
 * - NO upfront fees for creators
 * - First buyer pays the creation cost
 * - Creator gets reward when token graduates
 * - 1% trading fees (split between platform and creator)
 */
contract PumpFunStyleFactory is Ownable(msg.sender), ReentrancyGuard {
    
    // Token configuration (pump.fun standard)
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1B tokens
    uint256 public constant BONDING_CURVE_SUPPLY = 800_000_000 * 10**18; // 800M (80%)
    uint256 public constant DEX_LIQUIDITY = 200_000_000 * 10**18; // 200M (20%)
    
    // PUMP.FUN STYLE: First buyer pays, creator deploys FREE
    uint256 public constant CREATION_COST = 0.005 ether; // First buyer pays this
    uint256 public constant CREATOR_REWARD = 0.1 ether; // Creator gets this on graduation
    
    // Bonding curve configuration  
    uint256 public constant INITIAL_VIRTUAL_ETH = 30 ether; // Virtual ETH reserve
    uint256 public constant INITIAL_VIRTUAL_TOKENS = 1_073_000_000 * 10**18; // Virtual token reserve
    
    // GRADUATION at $69,000 market cap
    // Assuming ETH = $2500, that's 27.6 ETH market cap
    // But we need real ETH in pool, so graduation when real ETH = ~10 ETH
    uint256 public constant GRADUATION_ETH_THRESHOLD = 10 ether; 
    
    // Fees (lets-bonk style: 1% total)
    uint256 public constant TRADING_FEE_BPS = 100; // 1% total fee
    uint256 public constant PLATFORM_FEE_SHARE = 60; // Platform gets 60% of fees
    uint256 public constant CREATOR_FEE_SHARE = 40; // Creator gets 40% of fees
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    struct TokenInfo {
        address tokenAddress;
        address creator;
        uint256 virtualEthReserve;
        uint256 virtualTokenReserve;
        uint256 realEthReserve;
        uint256 realTokenReserve;
        uint256 creatorEarnings;
        bool firstBuyCompleted;
        bool graduated;
        uint256 createdAt;
    }
    
    struct PendingToken {
        string name;
        string symbol;
        address creator;
        uint256 createdAt;
    }
    
    // Storage
    mapping(address => TokenInfo) public tokenInfo;
    mapping(address => PendingToken) public pendingTokens;
    address[] public allTokens;
    address[] public pendingTokensList;
    uint256 public totalPlatformFees;
    
    // Events
    event TokenPending(address indexed pendingAddress, address indexed creator, string name, string symbol);
    event TokenLaunched(address indexed token, address indexed creator, address indexed firstBuyer);
    event TokenTraded(address indexed token, address indexed trader, bool isBuy, uint256 ethAmount, uint256 tokenAmount);
    event TokenGraduated(address indexed token, uint256 ethLiquidity, uint256 tokenLiquidity);
    event CreatorRewarded(address indexed creator, address indexed token, uint256 reward);
    
    /**
     * @dev Create token pending first buy - FREE for creators!
     */
    function createPendingToken(
        string memory _name,
        string memory _symbol
    ) external returns (address) {
        require(bytes(_name).length > 0 && bytes(_name).length <= 32, "Invalid name");
        require(bytes(_symbol).length > 0 && bytes(_symbol).length <= 8, "Invalid symbol");
        
        // Generate deterministic address for pending token
        address pendingAddress = address(uint160(uint256(keccak256(
            abi.encodePacked(_name, _symbol, msg.sender, block.timestamp)
        ))));
        
        require(pendingTokens[pendingAddress].creator == address(0), "Already exists");
        
        // Store pending token info
        pendingTokens[pendingAddress] = PendingToken({
            name: _name,
            symbol: _symbol,
            creator: msg.sender,
            createdAt: block.timestamp
        });
        
        pendingTokensList.push(pendingAddress);
        
        emit TokenPending(pendingAddress, msg.sender, _name, _symbol);
        
        return pendingAddress;
    }
    
    /**
     * @dev First buy launches the token - buyer pays creation cost
     */
    function buyFirstTokens(address _pendingToken) external payable nonReentrant returns (address) {
        PendingToken memory pending = pendingTokens[_pendingToken];
        require(pending.creator != address(0), "Token not found");
        require(msg.value >= CREATION_COST, "Insufficient payment");
        
        // Deploy the actual token
        BondingCurveToken token = new BondingCurveToken(
            pending.name,
            pending.symbol,
            TOTAL_SUPPLY,
            pending.creator,
            address(this)
        );
        
        address tokenAddress = address(token);
        
        // Setup bonding curve
        tokenInfo[tokenAddress] = TokenInfo({
            tokenAddress: tokenAddress,
            creator: pending.creator,
            virtualEthReserve: INITIAL_VIRTUAL_ETH,
            virtualTokenReserve: INITIAL_VIRTUAL_TOKENS,
            realEthReserve: 0,
            realTokenReserve: BONDING_CURVE_SUPPLY,
            creatorEarnings: 0,
            firstBuyCompleted: true,
            graduated: false,
            createdAt: block.timestamp
        });
        
        allTokens.push(tokenAddress);
        
        // Clean up pending token
        delete pendingTokens[_pendingToken];
        
        // Process the first buy with remaining ETH
        uint256 buyAmount = msg.value - CREATION_COST;
        if (buyAmount > 0) {
            _processBuy(tokenAddress, buyAmount, msg.sender);
        }
        
        // Platform gets the creation cost
        totalPlatformFees += CREATION_COST;
        
        emit TokenLaunched(tokenAddress, pending.creator, msg.sender);
        
        return tokenAddress;
    }
    
    /**
     * @dev Buy tokens from existing bonding curve
     */
    function buyTokens(address _token) external payable nonReentrant {
        TokenInfo storage info = tokenInfo[_token];
        require(info.tokenAddress != address(0), "Token not found");
        require(info.firstBuyCompleted, "Use buyFirstTokens");
        require(!info.graduated, "Token graduated");
        require(msg.value > 0, "No ETH sent");
        
        _processBuy(_token, msg.value, msg.sender);
    }
    
    function _processBuy(address _token, uint256 _ethAmount, address _buyer) private {
        TokenInfo storage info = tokenInfo[_token];
        
        // Calculate trading fee (1%)
        uint256 fee = (_ethAmount * TRADING_FEE_BPS) / BPS_DENOMINATOR;
        uint256 ethAfterFee = _ethAmount - fee;
        
        // Split fee between platform and creator
        uint256 platformShare = (fee * PLATFORM_FEE_SHARE) / 100;
        uint256 creatorShare = fee - platformShare;
        
        totalPlatformFees += platformShare;
        info.creatorEarnings += creatorShare;
        
        // Calculate tokens out using x*y=k
        uint256 k = (info.virtualEthReserve + info.realEthReserve) * 
                   (info.virtualTokenReserve + info.realTokenReserve);
        uint256 newEthReserve = info.virtualEthReserve + info.realEthReserve + ethAfterFee;
        uint256 newTokenReserve = k / newEthReserve;
        uint256 tokensOut = (info.virtualTokenReserve + info.realTokenReserve) - newTokenReserve;
        
        require(tokensOut > 0 && tokensOut <= info.realTokenReserve, "Invalid output");
        
        // Update reserves
        info.realEthReserve += ethAfterFee;
        info.realTokenReserve -= tokensOut;
        
        // Transfer tokens
        ERC20(_token).transfer(_buyer, tokensOut);
        
        emit TokenTraded(_token, _buyer, true, _ethAmount, tokensOut);
        
        // Check graduation (when real ETH reaches threshold)
        if (info.realEthReserve >= GRADUATION_ETH_THRESHOLD && !info.graduated) {
            _graduateToken(_token);
        }
    }
    
    /**
     * @dev Sell tokens back to bonding curve
     */
    function sellTokens(address _token, uint256 _amount) external nonReentrant {
        TokenInfo storage info = tokenInfo[_token];
        require(info.tokenAddress != address(0), "Token not found");
        require(!info.graduated, "Token graduated");
        require(_amount > 0, "Invalid amount");
        
        // Transfer tokens to contract
        ERC20(_token).transferFrom(msg.sender, address(this), _amount);
        
        // Calculate ETH out using x*y=k
        uint256 k = (info.virtualEthReserve + info.realEthReserve) * 
                   (info.virtualTokenReserve + info.realTokenReserve);
        uint256 newTokenReserve = info.virtualTokenReserve + info.realTokenReserve + _amount;
        uint256 newEthReserve = k / newTokenReserve;
        uint256 ethOut = (info.virtualEthReserve + info.realEthReserve) - newEthReserve;
        
        require(ethOut > 0 && ethOut <= info.realEthReserve, "Invalid output");
        
        // Calculate fee
        uint256 fee = (ethOut * TRADING_FEE_BPS) / BPS_DENOMINATOR;
        uint256 ethAfterFee = ethOut - fee;
        
        // Split fee
        uint256 platformShare = (fee * PLATFORM_FEE_SHARE) / 100;
        uint256 creatorShare = fee - platformShare;
        
        totalPlatformFees += platformShare;
        info.creatorEarnings += creatorShare;
        
        // Update reserves
        info.realEthReserve -= ethOut;
        info.realTokenReserve += _amount;
        
        // Send ETH
        payable(msg.sender).transfer(ethAfterFee);
        
        emit TokenTraded(_token, msg.sender, false, ethOut, _amount);
    }
    
    /**
     * @dev Graduate token - reward creator!
     */
    function _graduateToken(address _token) private {
        TokenInfo storage info = tokenInfo[_token];
        info.graduated = true;
        
        // Reward creator (pump.fun style)
        payable(info.creator).transfer(CREATOR_REWARD);
        
        emit TokenGraduated(_token, info.realEthReserve, info.realTokenReserve);
        emit CreatorRewarded(info.creator, _token, CREATOR_REWARD);
        
        // Here you would add liquidity to Uniswap V3
        // For now, tokens can be migrated manually
    }
    
    /**
     * @dev Creator claims earnings from trading fees
     */
    function claimCreatorEarnings(address _token) external {
        TokenInfo storage info = tokenInfo[_token];
        require(info.creator == msg.sender, "Not creator");
        
        uint256 earnings = info.creatorEarnings;
        info.creatorEarnings = 0;
        
        payable(msg.sender).transfer(earnings);
    }
    
    /**
     * @dev Platform withdraws fees
     */
    function withdrawPlatformFees() external onlyOwner {
        uint256 fees = totalPlatformFees;
        totalPlatformFees = 0;
        payable(owner()).transfer(fees);
    }
    
    // View functions
    function getPendingTokens() external view returns (address[] memory) {
        return pendingTokensList;
    }
    
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }
    
    function getTokenPrice(address _token) external view returns (uint256) {
        TokenInfo memory info = tokenInfo[_token];
        if (info.tokenAddress == address(0)) return 0;
        
        uint256 totalEth = info.virtualEthReserve + info.realEthReserve;
        uint256 totalTokens = info.virtualTokenReserve + info.realTokenReserve;
        
        // Price per token in wei
        return (totalEth * 10**18) / totalTokens;
    }
    
    function getMarketCap(address _token) external view returns (uint256) {
        TokenInfo memory info = tokenInfo[_token];
        if (info.tokenAddress == address(0)) return 0;
        
        uint256 pricePerToken = (info.virtualEthReserve + info.realEthReserve) * 10**18 / 
                                (info.virtualTokenReserve + info.realTokenReserve);
        
        return (pricePerToken * TOTAL_SUPPLY) / 10**18;
    }
}