// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title S4Token
 * @dev ERC20 token created through the S4Labs platform
 */
contract S4Token is ERC20 {
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
        address _creator
    ) ERC20(_name, _symbol) {
        imageUrl = _imageUrl;
        description = _description;
        twitter = _twitter;
        telegram = _telegram;
        website = _website;
        creator = _creator;
        createdAt = block.timestamp;
        
        // Mint total supply to the bonding curve contract (will be set later)
        _mint(_creator, _totalSupply);
    }
}

/**
 * @title BondingCurve
 * @dev Simple constant product bonding curve for token trading
 */
contract BondingCurve is ReentrancyGuard {
    uint256 public constant GRADUATION_THRESHOLD = 69000 * 10**18; // $69k market cap
    uint256 public constant PLATFORM_FEE_BPS = 100; // 1%
    uint256 public constant CREATOR_FEE_BPS = 100; // 1%
    uint256 public constant MAX_BPS = 10000;
    
    struct TokenInfo {
        address tokenAddress;
        uint256 virtualEthReserve;
        uint256 virtualTokenReserve;
        uint256 realEthReserve;
        uint256 realTokenReserve;
        bool graduated;
        address creator;
        uint256 collectedFees;
    }
    
    mapping(address => TokenInfo) public tokens;
    address public platformFeeReceiver;
    
    event TokenListed(address indexed token, address indexed creator);
    event TokensBought(address indexed token, address indexed buyer, uint256 ethIn, uint256 tokensOut);
    event TokensSold(address indexed token, address indexed seller, uint256 tokensIn, uint256 ethOut);
    event TokenGraduated(address indexed token, uint256 liquidity);
    
    constructor(address _platformFeeReceiver) {
        platformFeeReceiver = _platformFeeReceiver;
    }
    
    function listToken(
        address _token,
        uint256 _initialTokenSupply
    ) external {
        require(tokens[_token].tokenAddress == address(0), "Token already listed");
        
        // Initial virtual reserves (constant product curve)
        tokens[_token] = TokenInfo({
            tokenAddress: _token,
            virtualEthReserve: 1 ether, // 1 ETH virtual reserve
            virtualTokenReserve: 1000000 * 10**18, // 1M tokens virtual reserve
            realEthReserve: 0,
            realTokenReserve: _initialTokenSupply,
            graduated: false,
            creator: msg.sender,
            collectedFees: 0
        });
        
        emit TokenListed(_token, msg.sender);
    }
    
    function buyTokens(address _token, uint256 _minTokensOut) 
        external 
        payable 
        nonReentrant 
        returns (uint256 tokensOut) 
    {
        TokenInfo storage info = tokens[_token];
        require(info.tokenAddress != address(0), "Token not listed");
        require(!info.graduated, "Token graduated");
        require(msg.value > 0, "No ETH sent");
        
        // Calculate fees
        uint256 platformFee = (msg.value * PLATFORM_FEE_BPS) / MAX_BPS;
        uint256 creatorFee = (msg.value * CREATOR_FEE_BPS) / MAX_BPS;
        uint256 ethAfterFees = msg.value - platformFee - creatorFee;
        
        // Calculate tokens out using constant product formula
        // (x + dx) * (y - dy) = x * y
        uint256 k = (info.virtualEthReserve + info.realEthReserve) * 
                   (info.virtualTokenReserve + info.realTokenReserve);
        uint256 newEthReserve = info.virtualEthReserve + info.realEthReserve + ethAfterFees;
        uint256 newTokenReserve = k / newEthReserve;
        tokensOut = (info.virtualTokenReserve + info.realTokenReserve) - newTokenReserve;
        
        require(tokensOut >= _minTokensOut, "Slippage exceeded");
        require(tokensOut <= info.realTokenReserve, "Insufficient token reserve");
        
        // Update reserves
        info.realEthReserve += ethAfterFees;
        info.realTokenReserve -= tokensOut;
        info.collectedFees += creatorFee;
        
        // Transfer tokens to buyer
        IERC20(_token).transfer(msg.sender, tokensOut);
        
        // Send platform fee
        if (platformFee > 0) {
            payable(platformFeeReceiver).transfer(platformFee);
        }
        
        emit TokensBought(_token, msg.sender, msg.value, tokensOut);
        
        // Check graduation
        uint256 marketCap = calculateMarketCap(_token);
        if (marketCap >= GRADUATION_THRESHOLD) {
            _graduateToken(_token);
        }
    }
    
    function sellTokens(address _token, uint256 _tokenAmount, uint256 _minEthOut) 
        external 
        nonReentrant 
        returns (uint256 ethOut) 
    {
        TokenInfo storage info = tokens[_token];
        require(info.tokenAddress != address(0), "Token not listed");
        require(!info.graduated, "Token graduated");
        require(_tokenAmount > 0, "No tokens to sell");
        
        // Transfer tokens from seller
        IERC20(_token).transferFrom(msg.sender, address(this), _tokenAmount);
        
        // Calculate ETH out using constant product formula
        uint256 k = (info.virtualEthReserve + info.realEthReserve) * 
                   (info.virtualTokenReserve + info.realTokenReserve);
        uint256 newTokenReserve = info.virtualTokenReserve + info.realTokenReserve + _tokenAmount;
        uint256 newEthReserve = k / newTokenReserve;
        ethOut = (info.virtualEthReserve + info.realEthReserve) - newEthReserve;
        
        // Calculate fees
        uint256 platformFee = (ethOut * PLATFORM_FEE_BPS) / MAX_BPS;
        uint256 creatorFee = (ethOut * CREATOR_FEE_BPS) / MAX_BPS;
        uint256 ethAfterFees = ethOut - platformFee - creatorFee;
        
        require(ethAfterFees >= _minEthOut, "Slippage exceeded");
        require(ethOut <= info.realEthReserve, "Insufficient ETH reserve");
        
        // Update reserves
        info.realEthReserve -= ethOut;
        info.realTokenReserve += _tokenAmount;
        info.collectedFees += creatorFee;
        
        // Send ETH to seller
        payable(msg.sender).transfer(ethAfterFees);
        
        // Send platform fee
        if (platformFee > 0) {
            payable(platformFeeReceiver).transfer(platformFee);
        }
        
        emit TokensSold(_token, msg.sender, _tokenAmount, ethAfterFees);
    }
    
    function calculateMarketCap(address _token) public view returns (uint256) {
        TokenInfo storage info = tokens[_token];
        if (info.tokenAddress == address(0)) return 0;
        
        // Price = ETH Reserve / Token Reserve
        uint256 totalEth = info.virtualEthReserve + info.realEthReserve;
        uint256 totalTokens = info.virtualTokenReserve + info.realTokenReserve;
        
        // Market cap = price * total supply
        // Using 1B tokens as total supply
        return (totalEth * 1000000000 * 10**18) / totalTokens;
    }
    
    function getTokenPrice(address _token) public view returns (uint256) {
        TokenInfo storage info = tokens[_token];
        if (info.tokenAddress == address(0)) return 0;
        
        uint256 totalEth = info.virtualEthReserve + info.realEthReserve;
        uint256 totalTokens = info.virtualTokenReserve + info.realTokenReserve;
        
        // Price in wei per token
        return (totalEth * 10**18) / totalTokens;
    }
    
    function bondingProgress(address _token) public view returns (uint256) {
        uint256 marketCap = calculateMarketCap(_token);
        if (marketCap >= GRADUATION_THRESHOLD) return 100;
        return (marketCap * 100) / GRADUATION_THRESHOLD;
    }
    
    function _graduateToken(address _token) private {
        TokenInfo storage info = tokens[_token];
        info.graduated = true;
        
        // In production, this would create a Uniswap V3 pool
        // For now, just mark as graduated
        emit TokenGraduated(_token, info.realEthReserve);
    }
    
    function claimCreatorFees(address _token) external {
        TokenInfo storage info = tokens[_token];
        require(info.creator == msg.sender, "Not creator");
        require(info.collectedFees > 0, "No fees to claim");
        
        uint256 fees = info.collectedFees;
        info.collectedFees = 0;
        
        payable(msg.sender).transfer(fees);
    }
}

/**
 * @title TokenFactory
 * @dev Factory contract for deploying new tokens and listing them on bonding curve
 */
contract TokenFactory is Ownable, ReentrancyGuard {
    uint256 public constant CREATION_FEE = 0.02 ether;
    uint256 public constant INITIAL_SUPPLY = 1000000000 * 10**18; // 1B tokens
    uint256 public constant BONDING_CURVE_SUPPLY = 800000000 * 10**18; // 800M to bonding curve
    
    BondingCurve public immutable bondingCurve;
    address[] public allTokens;
    mapping(address => bool) public isToken;
    
    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol
    );
    
    constructor() Ownable(msg.sender) {
        // Deploy bonding curve with factory as fee receiver initially
        bondingCurve = new BondingCurve(address(this));
    }
    
    function createToken(
        string memory _name,
        string memory _symbol,
        string memory _description,
        string memory _imageUrl,
        string memory _twitter,
        string memory _telegram,
        string memory _website,
        string memory /* _category - unused for now */
    ) external payable nonReentrant returns (address) {
        require(msg.value >= CREATION_FEE, "Insufficient creation fee");
        
        // Deploy new token
        S4Token token = new S4Token(
            _name,
            _symbol,
            INITIAL_SUPPLY,
            _imageUrl,
            _description,
            _twitter,
            _telegram,
            _website,
            msg.sender
        );
        
        address tokenAddress = address(token);
        
        // Transfer tokens to bonding curve
        token.transfer(address(bondingCurve), BONDING_CURVE_SUPPLY);
        
        // List token on bonding curve
        bondingCurve.listToken(tokenAddress, BONDING_CURVE_SUPPLY);
        
        // Track token
        allTokens.push(tokenAddress);
        isToken[tokenAddress] = true;
        
        emit TokenCreated(tokenAddress, msg.sender, _name, _symbol);
        
        // Refund excess ETH
        if (msg.value > CREATION_FEE) {
            payable(msg.sender).transfer(msg.value - CREATION_FEE);
        }
        
        return tokenAddress;
    }
    
    function getCreationFee() external pure returns (uint256) {
        return CREATION_FEE;
    }
    
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }
    
    function tokenCount() external view returns (uint256) {
        return allTokens.length;
    }
    
    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    function setBondingCurveFeeReceiver(address _newReceiver) external onlyOwner {
        // This would update the bonding curve fee receiver
        // Implementation depends on bonding curve contract
    }
}