// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MinimalToken
 * @dev Minimal implementation token to be cloned
 */
contract MinimalToken is ERC20 {
    string public imageUrl;
    address public creator;
    uint256 public createdAt;
    bool private initialized;
    
    constructor() ERC20("", "") {}
    
    function initialize(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply,
        string memory _imageUrl,
        address _creator,
        address _initialHolder
    ) external {
        require(!initialized, "Already initialized");
        initialized = true;
        
        // Set token metadata (can't use constructor in clone)
        _name = _name;
        _symbol = _symbol;
        imageUrl = _imageUrl;
        creator = _creator;
        createdAt = block.timestamp;
        
        // Mint total supply
        _mint(_initialHolder, _totalSupply);
    }
    
    // Override name and symbol to use storage
    string private _name;
    string private _symbol;
    
    function name() public view virtual override returns (string memory) {
        return _name;
    }
    
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }
}

/**
 * @title OptimizedTokenFactory
 * @dev Gas-optimized factory using minimal proxy pattern
 * Reduces deployment cost by ~10x
 */
contract OptimizedTokenFactory is Ownable(msg.sender), ReentrancyGuard {
    using Clones for address;
    
    // Implementation contract (deployed once)
    address public immutable tokenImplementation;
    
    // Token configuration
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;
    uint256 public constant BONDING_SUPPLY = 800_000_000 * 10**18;
    uint256 public constant DEX_RESERVE = 200_000_000 * 10**18;
    
    // DRASTICALLY REDUCED FEES
    uint256 public constant CREATION_FEE = 0.001 ether; // 0.001 ETH (~$2-3)
    uint256 public constant PLATFORM_FEE_BPS = 100; // 1%
    uint256 public constant CREATOR_FEE_BPS = 100; // 1%
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // Bonding curve configuration  
    uint256 public constant INITIAL_VIRTUAL_ETH = 0.1 ether; // Reduced from 1 ETH
    uint256 public constant INITIAL_VIRTUAL_TOKENS = 100_000 * 10**18; // Reduced from 1M
    uint256 public constant GRADUATION_THRESHOLD = 10 ether; // Reduced from 69k
    
    struct TokenInfo {
        address tokenAddress;
        address creator;
        uint256 virtualEthReserve;
        uint256 virtualTokenReserve;
        uint256 realEthReserve;
        uint256 realTokenReserve;
        uint256 creatorFees;
        bool graduated;
        uint256 createdAt;
    }
    
    mapping(address => TokenInfo) public tokenInfo;
    address[] public allTokens;
    uint256 public totalPlatformFees;
    
    event TokenCreated(address indexed token, address indexed creator, string name, string symbol);
    event TokenTraded(address indexed token, address indexed trader, bool isBuy, uint256 ethAmount, uint256 tokenAmount);
    event TokenGraduated(address indexed token, uint256 ethLiquidity, uint256 tokenLiquidity);
    
    constructor() {
        // Deploy implementation once
        tokenImplementation = address(new MinimalToken());
    }
    
    /**
     * @dev Create token using minimal proxy - MUCH cheaper than full deployment
     */
    function createToken(
        string memory _name,
        string memory _symbol,
        string memory _imageUrl
    ) external payable nonReentrant returns (address) {
        require(msg.value >= CREATION_FEE, "Fee too low");
        require(bytes(_name).length > 0 && bytes(_name).length <= 32, "Invalid name");
        require(bytes(_symbol).length > 0 && bytes(_symbol).length <= 8, "Invalid symbol");
        
        // Clone the implementation (CHEAP - only ~45k gas!)
        address tokenAddress = Clones.clone(tokenImplementation);
        
        // Initialize the clone
        MinimalToken(tokenAddress).initialize(
            _name,
            _symbol,
            TOTAL_SUPPLY,
            _imageUrl,
            msg.sender,
            address(this)
        );
        
        // Setup bonding curve
        tokenInfo[tokenAddress] = TokenInfo({
            tokenAddress: tokenAddress,
            creator: msg.sender,
            virtualEthReserve: INITIAL_VIRTUAL_ETH,
            virtualTokenReserve: INITIAL_VIRTUAL_TOKENS,
            realEthReserve: 0,
            realTokenReserve: BONDING_SUPPLY,
            creatorFees: 0,
            graduated: false,
            createdAt: block.timestamp
        });
        
        allTokens.push(tokenAddress);
        totalPlatformFees += msg.value;
        
        emit TokenCreated(tokenAddress, msg.sender, _name, _symbol);
        
        // Refund excess
        if (msg.value > CREATION_FEE) {
            payable(msg.sender).transfer(msg.value - CREATION_FEE);
        }
        
        return tokenAddress;
    }
    
    /**
     * @dev Buy tokens - same bonding curve logic but optimized
     */
    function buyTokens(address _token) external payable nonReentrant {
        TokenInfo storage info = tokenInfo[_token];
        require(info.tokenAddress != address(0), "Invalid token");
        require(!info.graduated, "Token graduated");
        require(msg.value > 0, "No ETH sent");
        
        // Calculate fees
        uint256 platformFee = (msg.value * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 creatorFee = (msg.value * CREATOR_FEE_BPS) / BPS_DENOMINATOR;
        uint256 ethAfterFees = msg.value - platformFee - creatorFee;
        
        // x*y=k formula
        uint256 k = (info.virtualEthReserve + info.realEthReserve) * 
                   (info.virtualTokenReserve + info.realTokenReserve);
        uint256 newEthReserve = info.virtualEthReserve + info.realEthReserve + ethAfterFees;
        uint256 newTokenReserve = k / newEthReserve;
        uint256 tokensOut = (info.virtualTokenReserve + info.realTokenReserve) - newTokenReserve;
        
        require(tokensOut > 0 && tokensOut <= info.realTokenReserve, "Invalid output");
        
        // Update reserves
        info.realEthReserve += ethAfterFees;
        info.realTokenReserve -= tokensOut;
        info.creatorFees += creatorFee;
        totalPlatformFees += platformFee;
        
        // Transfer tokens
        ERC20(_token).transfer(msg.sender, tokensOut);
        
        // Check graduation (reduced threshold)
        if (info.realEthReserve >= GRADUATION_THRESHOLD) {
            _graduateToken(_token);
        }
        
        emit TokenTraded(_token, msg.sender, true, msg.value, tokensOut);
    }
    
    /**
     * @dev Sell tokens - optimized
     */
    function sellTokens(address _token, uint256 _amount) external nonReentrant {
        TokenInfo storage info = tokenInfo[_token];
        require(info.tokenAddress != address(0), "Invalid token");
        require(!info.graduated, "Token graduated");
        require(_amount > 0, "Invalid amount");
        
        // Transfer tokens to contract
        ERC20(_token).transferFrom(msg.sender, address(this), _amount);
        
        // Calculate ETH output
        uint256 k = (info.virtualEthReserve + info.realEthReserve) * 
                   (info.virtualTokenReserve + info.realTokenReserve);
        uint256 newTokenReserve = info.virtualTokenReserve + info.realTokenReserve + _amount;
        uint256 newEthReserve = k / newTokenReserve;
        uint256 ethOut = (info.virtualEthReserve + info.realEthReserve) - newEthReserve;
        
        require(ethOut > 0 && ethOut <= info.realEthReserve, "Invalid output");
        
        // Calculate fees
        uint256 platformFee = (ethOut * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 creatorFee = (ethOut * CREATOR_FEE_BPS) / BPS_DENOMINATOR;
        uint256 ethAfterFees = ethOut - platformFee - creatorFee;
        
        // Update reserves
        info.realEthReserve -= ethOut;
        info.realTokenReserve += _amount;
        info.creatorFees += creatorFee;
        totalPlatformFees += platformFee;
        
        // Send ETH
        payable(msg.sender).transfer(ethAfterFees);
        
        emit TokenTraded(_token, msg.sender, false, ethOut, _amount);
    }
    
    function _graduateToken(address _token) private {
        TokenInfo storage info = tokenInfo[_token];
        info.graduated = true;
        
        // Here you would add liquidity to Uniswap V3
        // For now, just mark as graduated
        
        emit TokenGraduated(_token, info.realEthReserve, info.realTokenReserve);
    }
    
    // Admin functions
    function withdrawPlatformFees() external onlyOwner {
        uint256 fees = totalPlatformFees;
        totalPlatformFees = 0;
        payable(owner()).transfer(fees);
    }
    
    function claimCreatorFees(address _token) external {
        TokenInfo storage info = tokenInfo[_token];
        require(info.creator == msg.sender, "Not creator");
        
        uint256 fees = info.creatorFees;
        info.creatorFees = 0;
        payable(msg.sender).transfer(fees);
    }
}