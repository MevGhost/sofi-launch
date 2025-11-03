// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ILaunchpadToken.sol";
import "../interfaces/IBondingCurveV2.sol";

/**
 * @title TokenFactoryV2
 * @notice Gas-optimized factory for creating tokens with deterministic addresses
 * @dev Uses CREATE2 and minimal proxy pattern for 90% gas savings
 */
contract TokenFactoryV2 is Ownable, ReentrancyGuard {
    using Clones for address;

    // Constants
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;
    uint256 public constant BONDING_CURVE_SUPPLY = 800_000_000 * 10**18;
    uint256 public constant DEX_RESERVE = 200_000_000 * 10**18;
    uint256 public constant FREE_CREATION_THRESHOLD = 1_000_000 * 10**18; // 1M tokens
    uint256 public constant MAX_NAME_LENGTH = 32;
    uint256 public constant MAX_SYMBOL_LENGTH = 8;
    uint256 public constant MAX_URL_LENGTH = 256;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 256;

    // State variables
    address public immutable tokenImplementation;
    address public bondingCurve;
    address public platformToken;
    uint256 public creationFee;
    uint256 public totalTokensCreated;
    
    // Anti-spam: Track creations per block
    mapping(address => mapping(uint256 => uint256)) public creationsPerBlock;
    uint256 public maxCreationsPerBlock = 3;
    
    // Token registry
    mapping(uint256 => address) public tokenByIndex;
    mapping(address => uint256) public tokenIndex;
    mapping(address => bool) public isValidToken;
    mapping(address => address[]) public creatorTokens;
    mapping(bytes32 => bool) public nameHashUsed;
    
    // Categories
    enum TokenCategory { NEW, TRENDING, GRADUATING, GRADUATED }
    mapping(address => TokenCategory) public tokenCategory;
    
    // Events for indexing (minimal on-chain storage)
    event TokenCreated(
        address indexed token,
        address indexed creator,
        uint256 indexed tokenId,
        string name,
        string symbol,
        string imageUrl,
        string description,
        uint256 timestamp,
        bytes32 salt
    );
    
    event TokenCategorized(
        address indexed token,
        TokenCategory indexed oldCategory,
        TokenCategory indexed newCategory,
        uint256 timestamp
    );
    
    event CreationFeeUpdated(uint256 oldFee, uint256 newFee);
    event PlatformTokenUpdated(address oldToken, address newToken);
    event BondingCurveUpdated(address oldCurve, address newCurve);
    event MaxCreationsPerBlockUpdated(uint256 oldMax, uint256 newMax);

    // Modifiers
    modifier validBondingCurve() {
        require(bondingCurve != address(0), "Bonding curve not set");
        _;
    }
    
    modifier antiSpam() {
        uint256 currentBlock = block.number;
        require(
            creationsPerBlock[msg.sender][currentBlock] < maxCreationsPerBlock,
            "Max creations per block exceeded"
        );
        creationsPerBlock[msg.sender][currentBlock]++;
        _;
    }

    constructor(address _tokenImplementation) {
        require(_tokenImplementation != address(0), "Invalid implementation");
        tokenImplementation = _tokenImplementation;
    }

    /**
     * @notice Create a new token with deterministic address
     * @param name Token name
     * @param symbol Token symbol
     * @param imageUrl Token image URL
     * @param description Token description
     * @return token The deployed token address
     */
    function createToken(
        string calldata name,
        string calldata symbol,
        string calldata imageUrl,
        string calldata description
    ) external payable nonReentrant antiSpam validBondingCurve returns (address token) {
        // Validate inputs
        _validateTokenParams(name, symbol, imageUrl, description);
        
        // Check creation fee
        uint256 requiredFee = getCreationFee(msg.sender);
        require(msg.value >= requiredFee, "Insufficient fee");
        
        // Generate deterministic salt
        bytes32 salt = _generateSalt(msg.sender, name, symbol);
        
        // Prevent duplicate names in same block
        bytes32 nameHash = keccak256(abi.encodePacked(block.number, name));
        require(!nameHashUsed[nameHash], "Name already used in this block");
        nameHashUsed[nameHash] = true;
        
        // Deploy token using CREATE2
        token = Clones.cloneDeterministic(tokenImplementation, salt);
        
        // Initialize token
        ILaunchpadToken(token).initialize(
            name,
            symbol,
            address(this),
            bondingCurve
        );
        
        // Register token
        uint256 tokenId = totalTokensCreated++;
        tokenByIndex[tokenId] = token;
        tokenIndex[token] = tokenId;
        isValidToken[token] = true;
        creatorTokens[msg.sender].push(token);
        tokenCategory[token] = TokenCategory.NEW;
        
        // Initialize bonding curve
        IBondingCurveV2(bondingCurve).initializeToken(token, msg.sender);
        
        // Transfer tokens to bonding curve
        IERC20(token).transfer(bondingCurve, BONDING_CURVE_SUPPLY + DEX_RESERVE);
        
        // Emit comprehensive event for indexing
        emit TokenCreated(
            token,
            msg.sender,
            tokenId,
            name,
            symbol,
            imageUrl,
            description,
            block.timestamp,
            salt
        );
        
        // Refund excess ETH
        if (msg.value > requiredFee) {
            (bool success, ) = msg.sender.call{value: msg.value - requiredFee}("");
            require(success, "Refund failed");
        }
        
        return token;
    }

    /**
     * @notice Predict token address before deployment
     * @param creator Creator address
     * @param name Token name
     * @param symbol Token symbol
     * @return Predicted token address
     */
    function predictTokenAddress(
        address creator,
        string calldata name,
        string calldata symbol
    ) external view returns (address) {
        bytes32 salt = _generateSalt(creator, name, symbol);
        return Clones.predictDeterministicAddress(tokenImplementation, salt);
    }

    /**
     * @notice Get creation fee for an address
     * @param creator Creator address
     * @return Required fee in ETH
     */
    function getCreationFee(address creator) public view returns (uint256) {
        if (platformToken != address(0)) {
            uint256 balance = IERC20(platformToken).balanceOf(creator);
            if (balance >= FREE_CREATION_THRESHOLD) {
                return 0; // Free for large holders
            }
        }
        return creationFee;
    }

    /**
     * @notice Update token category
     * @param token Token address
     * @param newCategory New category
     */
    function updateTokenCategory(
        address token,
        TokenCategory newCategory
    ) external {
        require(msg.sender == bondingCurve || msg.sender == owner(), "Unauthorized");
        require(isValidToken[token], "Invalid token");
        
        TokenCategory oldCategory = tokenCategory[token];
        tokenCategory[token] = newCategory;
        
        emit TokenCategorized(token, oldCategory, newCategory, block.timestamp);
    }

    /**
     * @notice Get tokens by creator
     * @param creator Creator address
     * @return Array of token addresses
     */
    function getTokensByCreator(address creator) external view returns (address[] memory) {
        return creatorTokens[creator];
    }

    /**
     * @notice Get tokens by category with pagination
     * @param category Token category
     * @param offset Starting index
     * @param limit Number of tokens to return
     * @return tokens Array of token addresses
     */
    function getTokensByCategory(
        TokenCategory category,
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory tokens) {
        uint256 count = 0;
        uint256 totalTokens = totalTokensCreated;
        
        // First pass: count tokens in category
        for (uint256 i = 0; i < totalTokens && count < limit; i++) {
            address token = tokenByIndex[i];
            if (tokenCategory[token] == category) {
                if (count >= offset) {
                    count++;
                }
            }
        }
        
        // Second pass: collect tokens
        tokens = new address[](count);
        uint256 index = 0;
        count = 0;
        
        for (uint256 i = 0; i < totalTokens && index < tokens.length; i++) {
            address token = tokenByIndex[i];
            if (tokenCategory[token] == category) {
                if (count >= offset) {
                    tokens[index++] = token;
                }
                count++;
            }
        }
        
        return tokens;
    }

    /**
     * @notice Get paginated list of all tokens
     * @param offset Starting index
     * @param limit Number of tokens to return
     * @return tokens Array of token addresses
     */
    function getTokensPaginated(
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory tokens) {
        uint256 totalTokens = totalTokensCreated;
        require(offset < totalTokens, "Offset out of bounds");
        
        uint256 end = offset + limit;
        if (end > totalTokens) {
            end = totalTokens;
        }
        
        tokens = new address[](end - offset);
        for (uint256 i = 0; i < tokens.length; i++) {
            tokens[i] = tokenByIndex[offset + i];
        }
        
        return tokens;
    }

    /**
     * @notice Generate deterministic salt for CREATE2
     * @param creator Creator address
     * @param name Token name
     * @param symbol Token symbol
     * @return salt Deterministic salt
     */
    function _generateSalt(
        address creator,
        string calldata name,
        string calldata symbol
    ) private view returns (bytes32) {
        return keccak256(abi.encodePacked(
            creator,
            name,
            symbol,
            block.chainid,
            address(this)
        ));
    }

    /**
     * @notice Validate token parameters
     * @param name Token name
     * @param symbol Token symbol
     * @param imageUrl Token image URL
     * @param description Token description
     */
    function _validateTokenParams(
        string calldata name,
        string calldata symbol,
        string calldata imageUrl,
        string calldata description
    ) private pure {
        require(bytes(name).length > 0 && bytes(name).length <= MAX_NAME_LENGTH, "Invalid name");
        require(bytes(symbol).length > 0 && bytes(symbol).length <= MAX_SYMBOL_LENGTH, "Invalid symbol");
        require(bytes(imageUrl).length <= MAX_URL_LENGTH, "URL too long");
        require(bytes(description).length <= MAX_DESCRIPTION_LENGTH, "Description too long");
        
        // Validate symbol is alphanumeric
        bytes memory symbolBytes = bytes(symbol);
        for (uint256 i = 0; i < symbolBytes.length; i++) {
            bytes1 char = symbolBytes[i];
            require(
                (char >= 0x30 && char <= 0x39) || // 0-9
                (char >= 0x41 && char <= 0x5A) || // A-Z
                (char >= 0x61 && char <= 0x7A),   // a-z
                "Symbol must be alphanumeric"
            );
        }
    }

    // Admin functions
    
    /**
     * @notice Set bonding curve address
     * @param _bondingCurve New bonding curve address
     */
    function setBondingCurve(address _bondingCurve) external onlyOwner {
        require(_bondingCurve != address(0), "Invalid address");
        address oldCurve = bondingCurve;
        bondingCurve = _bondingCurve;
        emit BondingCurveUpdated(oldCurve, _bondingCurve);
    }

    /**
     * @notice Set platform token for free creation
     * @param _platformToken Platform token address
     */
    function setPlatformToken(address _platformToken) external onlyOwner {
        address oldToken = platformToken;
        platformToken = _platformToken;
        emit PlatformTokenUpdated(oldToken, _platformToken);
    }

    /**
     * @notice Set creation fee
     * @param _creationFee Fee in wei
     */
    function setCreationFee(uint256 _creationFee) external onlyOwner {
        uint256 oldFee = creationFee;
        creationFee = _creationFee;
        emit CreationFeeUpdated(oldFee, _creationFee);
    }

    /**
     * @notice Set max creations per block
     * @param _maxCreationsPerBlock New maximum
     */
    function setMaxCreationsPerBlock(uint256 _maxCreationsPerBlock) external onlyOwner {
        require(_maxCreationsPerBlock > 0, "Invalid max");
        uint256 oldMax = maxCreationsPerBlock;
        maxCreationsPerBlock = _maxCreationsPerBlock;
        emit MaxCreationsPerBlockUpdated(oldMax, _maxCreationsPerBlock);
    }

    /**
     * @notice Withdraw accumulated fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    receive() external payable {}
}