// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

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
 * @title DevBondingCurveV2
 * @dev Fixed version with proper liquidity handling
 */
contract DevBondingCurveV2 is Ownable(msg.sender), ReentrancyGuard {
    // Token configuration
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1B tokens
    uint256 public constant BONDING_SUPPLY = 800_000_000 * 10**18; // 800M to bonding curve
    uint256 public constant DEX_RESERVE = 200_000_000 * 10**18; // 200M for DEX
    uint256 public constant CREATION_FEE = 0.001 ether; // Ultra-low fee for dev
    
    // Fixed virtual reserves - these NEVER change
    uint256 public constant VIRTUAL_ETH_RESERVE = 1 ether;
    uint256 public constant VIRTUAL_TOKEN_RESERVE = 1_000_000 * 10**18;
    
    // Graduation threshold
    uint256 public constant GRADUATION_THRESHOLD = 69_000 * 10**18; // $69k market cap
    
    // Fees
    uint256 public platformFeeBps = 100; // 1% default
    uint256 public creatorFeeBps = 100; // 1% default
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // Dev buy configuration
    uint256 public constant MAX_DEV_BUY = 10 ether;
    
    // Token info for bonding curve
    struct TokenInfo {
        address tokenAddress;
        address creator;
        uint256 realEthReserve;     // Actual ETH in the pool
        uint256 realTokenReserve;    // Actual tokens in the pool
        uint256 k;                   // Constant product (including virtual reserves)
        uint256 dexReserve;
        uint256 creatorFees;
        uint256 platformFees;
        bool graduated;
        uint256 createdAt;
        uint256 totalVolume;
        uint256 tradeCount;
    }
    
    // Storage
    mapping(address => TokenInfo) public tokenInfo;
    mapping(address => bool) public isValidToken;
    address[] public allTokens;
    uint256 public totalPlatformFees;
    
    // Events
    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 timestamp,
        uint256 devBuyAmount
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
    
    // Modifiers
    modifier validToken(address _token) {
        require(isValidToken[_token], "Invalid token");
        _;
    }
    
    /**
     * @dev Create a new token with fixed initial liquidity
     */
    function createToken(
        string memory _name,
        string memory _symbol,
        string memory _description,
        string memory _imageUrl,
        string memory _twitter,
        string memory _telegram,
        string memory _website,
        string memory /* _category */,
        uint256 _devBuyAmount
    ) external payable nonReentrant returns (address) {
        require(msg.value >= CREATION_FEE + _devBuyAmount, "Insufficient payment");
        require(_devBuyAmount <= MAX_DEV_BUY, "Dev buy exceeds maximum");
        
        // Basic validation
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_symbol).length > 0, "Symbol required");
        
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
        
        // Calculate initial k value (constant product)
        // k = (virtualEth + realEth) * (virtualTokens + realTokens)
        uint256 initialK = (VIRTUAL_ETH_RESERVE + 0) * (VIRTUAL_TOKEN_RESERVE + BONDING_SUPPLY);
        
        // Initialize bonding curve with proper k value
        tokenInfo[tokenAddress] = TokenInfo({
            tokenAddress: tokenAddress,
            creator: msg.sender,
            realEthReserve: 0,
            realTokenReserve: BONDING_SUPPLY,
            k: initialK,
            dexReserve: DEX_RESERVE,
            creatorFees: 0,
            platformFees: 0,
            graduated: false,
            createdAt: block.timestamp,
            totalVolume: 0,
            tradeCount: 0
        });
        
        // Execute dev buy if requested
        if (_devBuyAmount > 0) {
            _executeDevBuy(tokenAddress, _devBuyAmount);
        }
        
        // Update tracking
        allTokens.push(tokenAddress);
        isValidToken[tokenAddress] = true;
        totalPlatformFees += CREATION_FEE;
        
        emit TokenCreated(tokenAddress, msg.sender, _name, _symbol, block.timestamp, _devBuyAmount);
        
        // Refund excess
        if (msg.value > CREATION_FEE + _devBuyAmount) {
            (bool success, ) = msg.sender.call{value: msg.value - CREATION_FEE - _devBuyAmount}("");
            require(success, "Refund failed");
        }
        
        return tokenAddress;
    }
    
    /**
     * @dev Execute dev buy without breaking the bonding curve
     */
    function _executeDevBuy(address _token, uint256 _ethAmount) private {
        TokenInfo storage info = tokenInfo[_token];
        
        // No fees on dev buy
        uint256 ethIn = _ethAmount;
        
        // Current reserves (including virtual)
        uint256 currentEthReserve = VIRTUAL_ETH_RESERVE + info.realEthReserve;
        uint256 currentTokenReserve = VIRTUAL_TOKEN_RESERVE + info.realTokenReserve;
        
        // Calculate tokens out using constant product formula
        // newEthReserve * newTokenReserve = k
        // (currentEthReserve + ethIn) * newTokenReserve = k
        // newTokenReserve = k / (currentEthReserve + ethIn)
        uint256 newEthReserve = currentEthReserve + ethIn;
        uint256 newTokenReserve = info.k / newEthReserve;
        uint256 tokensOut = currentTokenReserve - newTokenReserve;
        
        // Ensure we have enough real tokens
        require(tokensOut <= info.realTokenReserve, "Insufficient token liquidity");
        
        // Update reserves (only real reserves change, virtual stay constant)
        info.realEthReserve += ethIn;
        info.realTokenReserve -= tokensOut;
        
        // Update stats
        info.totalVolume += ethIn;
        info.tradeCount++;
        
        // Transfer tokens to creator
        require(IERC20(_token).transfer(msg.sender, tokensOut), "Token transfer failed");
        
        // Calculate and emit price
        uint256 newPrice = calculatePrice(newEthReserve, newTokenReserve);
        emit TokenTraded(_token, msg.sender, true, ethIn, tokensOut, newPrice, 0, 0);
    }
    
    /**
     * @dev Buy tokens with proper constant product formula
     */
    function buyTokens(address _token, uint256 _minTokensOut) 
        external 
        payable 
        nonReentrant
        validToken(_token)
        returns (uint256) 
    {
        TokenInfo storage info = tokenInfo[_token];
        require(!info.graduated, "Token graduated");
        require(msg.value > 0, "Send ETH");
        
        // Calculate fees
        uint256 platformFee = (msg.value * platformFeeBps) / BPS_DENOMINATOR;
        uint256 creatorFee = (msg.value * creatorFeeBps) / BPS_DENOMINATOR;
        uint256 ethAfterFees = msg.value - platformFee - creatorFee;
        
        // Current reserves (including virtual)
        uint256 currentEthReserve = VIRTUAL_ETH_RESERVE + info.realEthReserve;
        uint256 currentTokenReserve = VIRTUAL_TOKEN_RESERVE + info.realTokenReserve;
        
        // Calculate tokens out using constant product formula
        uint256 newEthReserve = currentEthReserve + ethAfterFees;
        uint256 newTokenReserve = info.k / newEthReserve;
        uint256 tokensOut = currentTokenReserve - newTokenReserve;
        
        // Slippage protection
        require(tokensOut >= _minTokensOut, "Slippage exceeded");
        require(tokensOut <= info.realTokenReserve, "Insufficient token liquidity");
        
        // Update state (only real reserves change)
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
        uint256 newPrice = calculatePrice(newEthReserve, newTokenReserve);
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
        uint256 marketCap = (newPrice * TOTAL_SUPPLY) / 10**18;
        if (marketCap >= GRADUATION_THRESHOLD) {
            _graduateToken(_token);
        }
        
        return tokensOut;
    }
    
    /**
     * @dev Sell tokens with proper constant product formula
     */
    function sellTokens(
        address _token,
        uint256 _tokenAmount,
        uint256 _minEthOut
    )
        external
        nonReentrant
        validToken(_token)
        returns (uint256)
    {
        TokenInfo storage info = tokenInfo[_token];
        require(!info.graduated, "Token graduated");
        require(_tokenAmount > 0, "Invalid amount");
        
        // Current reserves (including virtual)
        uint256 currentEthReserve = VIRTUAL_ETH_RESERVE + info.realEthReserve;
        uint256 currentTokenReserve = VIRTUAL_TOKEN_RESERVE + info.realTokenReserve;
        
        // Calculate ETH out using constant product formula
        uint256 newTokenReserve = currentTokenReserve + _tokenAmount;
        uint256 newEthReserve = info.k / newTokenReserve;
        uint256 ethOut = currentEthReserve - newEthReserve;
        
        // Apply fees
        uint256 platformFee = (ethOut * platformFeeBps) / BPS_DENOMINATOR;
        uint256 creatorFee = (ethOut * creatorFeeBps) / BPS_DENOMINATOR;
        uint256 ethAfterFees = ethOut - platformFee - creatorFee;
        
        // Slippage protection and liquidity check
        require(ethAfterFees >= _minEthOut, "Slippage exceeded");
        require(ethOut <= info.realEthReserve, "Insufficient ETH liquidity");
        
        // Transfer tokens from seller
        require(
            IERC20(_token).transferFrom(msg.sender, address(this), _tokenAmount),
            "Transfer failed"
        );
        
        // Update state (only real reserves change)
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
        uint256 newPrice = calculatePrice(newEthReserve, newTokenReserve);
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
        
        emit TokenGraduated(
            _token,
            info.realEthReserve,
            info.dexReserve,
            info.totalVolume
        );
    }
    
    /**
     * @dev Calculate price from reserves
     */
    function calculatePrice(uint256 ethReserve, uint256 tokenReserve) private pure returns (uint256) {
        return (ethReserve * 10**18) / tokenReserve;
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
        require(_platformFeeBps + _creatorFeeBps <= 1000, "Total fees too high"); // Max 10%
        platformFeeBps = _platformFeeBps;
        creatorFeeBps = _creatorFeeBps;
        emit FeesUpdated(_platformFeeBps, _creatorFeeBps);
    }
    
    function withdrawPlatformFees() external onlyOwner {
        uint256 fees = totalPlatformFees;
        totalPlatformFees = 0;
        (bool success, ) = owner().call{value: fees}("");
        require(success, "Transfer failed");
    }
    
    // View functions
    
    function getTokenPrice(address _token) external view returns (uint256) {
        TokenInfo storage info = tokenInfo[_token];
        if (!isValidToken[_token]) return 0;
        
        uint256 totalEthReserve = VIRTUAL_ETH_RESERVE + info.realEthReserve;
        uint256 totalTokenReserve = VIRTUAL_TOKEN_RESERVE + info.realTokenReserve;
        
        return calculatePrice(totalEthReserve, totalTokenReserve);
    }
    
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }
    
    function getTokenCount() external view returns (uint256) {
        return allTokens.length;
    }
    
    function calculateBuyReturn(address _token, uint256 _ethAmount) external view returns (uint256) {
        TokenInfo storage info = tokenInfo[_token];
        if (!isValidToken[_token]) return 0;
        
        uint256 platformFee = (_ethAmount * platformFeeBps) / BPS_DENOMINATOR;
        uint256 creatorFee = (_ethAmount * creatorFeeBps) / BPS_DENOMINATOR;
        uint256 ethAfterFees = _ethAmount - platformFee - creatorFee;
        
        uint256 currentEthReserve = VIRTUAL_ETH_RESERVE + info.realEthReserve;
        uint256 currentTokenReserve = VIRTUAL_TOKEN_RESERVE + info.realTokenReserve;
        
        uint256 newEthReserve = currentEthReserve + ethAfterFees;
        uint256 newTokenReserve = info.k / newEthReserve;
        
        return currentTokenReserve - newTokenReserve;
    }
    
    function calculateSellReturn(address _token, uint256 _tokenAmount) external view returns (uint256) {
        TokenInfo storage info = tokenInfo[_token];
        if (!isValidToken[_token]) return 0;
        
        uint256 currentEthReserve = VIRTUAL_ETH_RESERVE + info.realEthReserve;
        uint256 currentTokenReserve = VIRTUAL_TOKEN_RESERVE + info.realTokenReserve;
        
        uint256 newTokenReserve = currentTokenReserve + _tokenAmount;
        uint256 newEthReserve = info.k / newTokenReserve;
        uint256 ethOut = currentEthReserve - newEthReserve;
        
        uint256 platformFee = (ethOut * platformFeeBps) / BPS_DENOMINATOR;
        uint256 creatorFee = (ethOut * creatorFeeBps) / BPS_DENOMINATOR;
        
        return ethOut - platformFee - creatorFee;
    }
    
    function calculateMarketCap(address _token) external view returns (uint256) {
        TokenInfo storage info = tokenInfo[_token];
        if (!isValidToken[_token]) return 0;
        
        uint256 totalEthReserve = VIRTUAL_ETH_RESERVE + info.realEthReserve;
        uint256 totalTokenReserve = VIRTUAL_TOKEN_RESERVE + info.realTokenReserve;
        uint256 price = calculatePrice(totalEthReserve, totalTokenReserve);
        
        return (price * TOTAL_SUPPLY) / 10**18;
    }
    
    function bondingProgress(address _token) external view returns (uint256) {
        TokenInfo storage info = tokenInfo[_token];
        if (!isValidToken[_token]) return 0;
        
        uint256 totalEthReserve = VIRTUAL_ETH_RESERVE + info.realEthReserve;
        uint256 totalTokenReserve = VIRTUAL_TOKEN_RESERVE + info.realTokenReserve;
        uint256 price = calculatePrice(totalEthReserve, totalTokenReserve);
        uint256 marketCap = (price * TOTAL_SUPPLY) / 10**18;
        
        return (marketCap * 100) / GRADUATION_THRESHOLD;
    }
    
    // Get full token info including virtual reserves
    function getFullTokenInfo(address _token) external view returns (
        address creator,
        uint256 virtualEthReserve,
        uint256 virtualTokenReserve,
        uint256 realEthReserve,
        uint256 realTokenReserve,
        uint256 k,
        bool graduated
    ) {
        TokenInfo storage info = tokenInfo[_token];
        return (
            info.creator,
            VIRTUAL_ETH_RESERVE,
            VIRTUAL_TOKEN_RESERVE,
            info.realEthReserve,
            info.realTokenReserve,
            info.k,
            info.graduated
        );
    }
}