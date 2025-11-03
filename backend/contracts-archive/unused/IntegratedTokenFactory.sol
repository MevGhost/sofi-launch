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
        
        // Mint total supply to initial holder (the factory)
        _mint(_initialHolder, _totalSupply);
    }
}

/**
 * @title IntegratedTokenFactory
 * @dev All-in-one token factory with integrated bonding curve
 * Simplified version that combines factory and bonding curve in one contract
 */
contract IntegratedTokenFactory is Ownable(msg.sender), ReentrancyGuard {
    // Token configuration
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1B tokens
    uint256 public constant BONDING_SUPPLY = 800_000_000 * 10**18; // 800M to bonding curve
    uint256 public constant DEX_RESERVE = 200_000_000 * 10**18; // 200M for DEX
    uint256 public constant CREATION_FEE = 0.02 ether;
    
    // Bonding curve configuration
    uint256 public constant INITIAL_VIRTUAL_ETH = 1 ether;
    uint256 public constant INITIAL_VIRTUAL_TOKENS = 1_000_000 * 10**18; // 1M tokens
    uint256 public constant GRADUATION_THRESHOLD = 69_000 * 10**18; // $69k market cap (in ETH value)
    
    // Fees
    uint256 public constant PLATFORM_FEE_BPS = 100; // 1%
    uint256 public constant CREATOR_FEE_BPS = 100; // 1%
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // Token info for bonding curve
    struct TokenInfo {
        address tokenAddress;
        address creator;
        uint256 virtualEthReserve;
        uint256 virtualTokenReserve;
        uint256 realEthReserve;
        uint256 realTokenReserve;
        uint256 dexReserve; // Tokens reserved for DEX
        uint256 creatorFees;
        uint256 platformFees;
        bool graduated;
        uint256 createdAt;
    }
    
    // Storage
    mapping(address => TokenInfo) public tokenInfo;
    address[] public allTokens;
    mapping(address => bool) public isValidToken;
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
        uint256 tokenReserve
    );
    
    /**
     * @dev Get the creation fee
     */
    function getCreationFee() public pure returns (uint256) {
        return CREATION_FEE;
    }
    
    /**
     * @dev Create a new token with bonding curve
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
    ) external payable nonReentrant returns (address) {
        require(msg.value >= CREATION_FEE, "Insufficient creation fee");
        require(bytes(_name).length > 0 && bytes(_name).length <= 32, "Invalid name");
        require(bytes(_symbol).length > 0 && bytes(_symbol).length <= 8, "Invalid symbol");
        
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
            address(this) // Factory holds the tokens initially
        );
        
        address tokenAddress = address(newToken);
        
        // Initialize bonding curve for this token
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
            createdAt: block.timestamp
        });
        
        // Track token
        allTokens.push(tokenAddress);
        isValidToken[tokenAddress] = true;
        
        // Add platform fee to total
        totalPlatformFees += CREATION_FEE;
        
        emit TokenCreated(tokenAddress, msg.sender, _name, _symbol, block.timestamp);
        
        // Refund excess ETH
        if (msg.value > CREATION_FEE) {
            (bool success, ) = msg.sender.call{value: msg.value - CREATION_FEE}("");
            require(success, "Refund failed");
        }
        
        return tokenAddress;
    }
    
    /**
     * @dev Buy tokens from bonding curve
     */
    function buyTokens(address _token, uint256 _minTokensOut) 
        external 
        payable 
        nonReentrant 
        returns (uint256) 
    {
        TokenInfo storage info = tokenInfo[_token];
        require(info.tokenAddress != address(0), "Token does not exist");
        require(!info.graduated, "Token has graduated");
        require(msg.value > 0, "No ETH sent");
        
        // Calculate fees
        uint256 platformFee = (msg.value * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 creatorFee = (msg.value * CREATOR_FEE_BPS) / BPS_DENOMINATOR;
        uint256 ethAfterFees = msg.value - platformFee - creatorFee;
        
        // Calculate tokens out using constant product formula
        uint256 totalEthReserve = info.virtualEthReserve + info.realEthReserve;
        uint256 totalTokenReserve = info.virtualTokenReserve + info.realTokenReserve;
        
        // k = x * y (constant product)
        uint256 k = totalEthReserve * totalTokenReserve;
        uint256 newEthReserve = totalEthReserve + ethAfterFees;
        uint256 newTokenReserve = k / newEthReserve;
        uint256 tokensOut = totalTokenReserve - newTokenReserve;
        
        require(tokensOut >= _minTokensOut, "Slippage exceeded");
        require(tokensOut <= info.realTokenReserve, "Insufficient liquidity");
        
        // Update reserves
        info.realEthReserve += ethAfterFees;
        info.realTokenReserve -= tokensOut;
        info.creatorFees += creatorFee;
        info.platformFees += platformFee;
        totalPlatformFees += platformFee;
        
        // Transfer tokens to buyer
        require(IERC20(_token).transfer(msg.sender, tokensOut), "Token transfer failed");
        
        // Emit event without calculating price inline to avoid stack too deep
        emit TokenTraded(
            _token, 
            msg.sender, 
            true, 
            msg.value, 
            tokensOut, 
            ((info.virtualEthReserve + info.realEthReserve) * 10**18) / (info.virtualTokenReserve + info.realTokenReserve),
            platformFee, 
            creatorFee
        );
        
        // Check for graduation (simplified - using ETH value instead of USD)
        uint256 currentPrice = ((info.virtualEthReserve + info.realEthReserve) * 10**18) / (info.virtualTokenReserve + info.realTokenReserve);
        if ((currentPrice * TOTAL_SUPPLY / 10**18) >= GRADUATION_THRESHOLD) {
            _graduateToken(_token);
        }
        
        return tokensOut;
    }
    
    /**
     * @dev Sell tokens to bonding curve
     */
    function sellTokens(address _token, uint256 _tokenAmount, uint256 _minEthOut) 
        external 
        nonReentrant 
        returns (uint256) 
    {
        TokenInfo storage info = tokenInfo[_token];
        require(info.tokenAddress != address(0), "Token does not exist");
        require(!info.graduated, "Token has graduated");
        require(_tokenAmount > 0, "No tokens to sell");
        
        // Transfer tokens from seller to contract
        require(IERC20(_token).transferFrom(msg.sender, address(this), _tokenAmount), "Token transfer failed");
        
        // Calculate ETH out using constant product formula
        uint256 totalEthReserve = info.virtualEthReserve + info.realEthReserve;
        uint256 totalTokenReserve = info.virtualTokenReserve + info.realTokenReserve;
        
        uint256 k = totalEthReserve * totalTokenReserve;
        uint256 newTokenReserve = totalTokenReserve + _tokenAmount;
        uint256 newEthReserve = k / newTokenReserve;
        uint256 ethOut = totalEthReserve - newEthReserve;
        
        // Calculate fees on the ETH output
        uint256 platformFee = (ethOut * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 creatorFee = (ethOut * CREATOR_FEE_BPS) / BPS_DENOMINATOR;
        uint256 ethAfterFees = ethOut - platformFee - creatorFee;
        
        require(ethAfterFees >= _minEthOut, "Slippage exceeded");
        require(ethAfterFees <= info.realEthReserve, "Insufficient ETH liquidity");
        
        // Update reserves
        info.realEthReserve -= ethOut;
        info.realTokenReserve += _tokenAmount;
        info.creatorFees += creatorFee;
        info.platformFees += platformFee;
        totalPlatformFees += platformFee;
        
        // Send ETH to seller
        (bool success, ) = msg.sender.call{value: ethAfterFees}("");
        require(success, "ETH transfer failed");
        
        // Emit event
        emit TokenTraded(
            _token, 
            msg.sender, 
            false, 
            ethAfterFees, 
            _tokenAmount, 
            ((info.virtualEthReserve + info.realEthReserve) * 10**18) / (info.virtualTokenReserve + info.realTokenReserve),
            platformFee, 
            creatorFee
        );
        
        return ethAfterFees;
    }
    
    /**
     * @dev Graduate token to DEX (simplified version)
     */
    function _graduateToken(address _token) private {
        TokenInfo storage info = tokenInfo[_token];
        info.graduated = true;
        
        // In production, this would:
        // 1. Create Uniswap V3 pool
        // 2. Add liquidity (realEthReserve + dexReserve tokens)
        // 3. Burn LP NFT
        // For now, just mark as graduated
        
        emit TokenGraduated(_token, info.realEthReserve, info.dexReserve);
    }
    
    /**
     * @dev Get token price
     */
    function getTokenPrice(address _token) external view returns (uint256) {
        TokenInfo storage info = tokenInfo[_token];
        require(info.tokenAddress != address(0), "Token does not exist");
        
        uint256 totalEthReserve = info.virtualEthReserve + info.realEthReserve;
        uint256 totalTokenReserve = info.virtualTokenReserve + info.realTokenReserve;
        
        return (totalEthReserve * 10**18) / totalTokenReserve;
    }
    
    /**
     * @dev Calculate market cap
     */
    function calculateMarketCap(address _token) external view returns (uint256) {
        TokenInfo storage info = tokenInfo[_token];
        require(info.tokenAddress != address(0), "Token does not exist");
        
        uint256 price = (info.virtualEthReserve + info.realEthReserve) * 10**18 / 
                       (info.virtualTokenReserve + info.realTokenReserve);
        return (price * TOTAL_SUPPLY) / 10**18;
    }
    
    /**
     * @dev Calculate bonding progress percentage
     */
    function bondingProgress(address _token) external view returns (uint256) {
        TokenInfo storage info = tokenInfo[_token];
        require(info.tokenAddress != address(0), "Token does not exist");
        
        uint256 marketCap = ((info.virtualEthReserve + info.realEthReserve) * 10**18 / 
                           (info.virtualTokenReserve + info.realTokenReserve)) * TOTAL_SUPPLY / 10**18;
        
        return (marketCap * 100) / GRADUATION_THRESHOLD;
    }
    
    /**
     * @dev Calculate expected tokens for ETH input
     */
    function calculateBuyReturn(address _token, uint256 _ethAmount) external view returns (uint256) {
        TokenInfo storage info = tokenInfo[_token];
        require(info.tokenAddress != address(0), "Token does not exist");
        
        uint256 ethAfterFees = _ethAmount - (_ethAmount * (PLATFORM_FEE_BPS + CREATOR_FEE_BPS)) / BPS_DENOMINATOR;
        
        uint256 totalEthReserve = info.virtualEthReserve + info.realEthReserve;
        uint256 totalTokenReserve = info.virtualTokenReserve + info.realTokenReserve;
        
        uint256 k = totalEthReserve * totalTokenReserve;
        uint256 newEthReserve = totalEthReserve + ethAfterFees;
        uint256 newTokenReserve = k / newEthReserve;
        
        return totalTokenReserve - newTokenReserve;
    }
    
    /**
     * @dev Calculate expected ETH for token input
     */
    function calculateSellReturn(address _token, uint256 _tokenAmount) external view returns (uint256) {
        TokenInfo storage info = tokenInfo[_token];
        require(info.tokenAddress != address(0), "Token does not exist");
        
        uint256 totalEthReserve = info.virtualEthReserve + info.realEthReserve;
        uint256 totalTokenReserve = info.virtualTokenReserve + info.realTokenReserve;
        
        uint256 k = totalEthReserve * totalTokenReserve;
        uint256 newTokenReserve = totalTokenReserve + _tokenAmount;
        uint256 newEthReserve = k / newTokenReserve;
        uint256 ethOut = totalEthReserve - newEthReserve;
        
        return ethOut - (ethOut * (PLATFORM_FEE_BPS + CREATOR_FEE_BPS)) / BPS_DENOMINATOR;
    }
    
    /**
     * @dev Claim creator fees
     */
    function claimCreatorFees(address _token) external nonReentrant {
        TokenInfo storage info = tokenInfo[_token];
        require(info.creator == msg.sender, "Not token creator");
        require(info.creatorFees > 0, "No fees to claim");
        
        uint256 fees = info.creatorFees;
        info.creatorFees = 0;
        
        (bool success, ) = msg.sender.call{value: fees}("");
        require(success, "Fee transfer failed");
    }
    
    /**
     * @dev Withdraw platform fees (owner only)
     */
    function withdrawPlatformFees() external onlyOwner {
        uint256 fees = totalPlatformFees;
        totalPlatformFees = 0;
        
        (bool success, ) = owner().call{value: fees}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev Get all tokens
     */
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }
    
    /**
     * @dev Get token count
     */
    function getTokenCount() external view returns (uint256) {
        return allTokens.length;
    }
}