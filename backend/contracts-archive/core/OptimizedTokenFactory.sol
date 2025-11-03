// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "../interfaces/ILaunchpadToken.sol";
import "../interfaces/IBondingCurveV2.sol";

/**
 * @title OptimizedTokenFactory
 * @notice Ultra gas-optimized token factory for Base
 * @dev Target: < 500k gas for token creation
 */
contract OptimizedTokenFactory {
    using Clones for address;

    // Immutables (no storage cost)
    address private immutable tokenImplementation;
    uint256 private immutable TOTAL_SUPPLY = 1_000_000_000 * 10**18;
    uint256 private immutable CURVE_SUPPLY = 800_000_000 * 10**18;
    uint256 private immutable DEX_SUPPLY = 200_000_000 * 10**18;
    
    // Single packed struct for token metadata (1 slot)
    struct TokenMeta {
        uint128 tokenId;
        uint64 createdAt;
        uint64 category; // 0=NEW, 1=TRENDING, 2=GRADUATING, 3=GRADUATED
    }
    
    // Minimal storage
    address public bondingCurve;
    address public owner;
    uint128 public totalTokensCreated;
    uint128 public creationFee;
    
    // Single mapping for all token data
    mapping(address => TokenMeta) public tokenMeta;
    mapping(address => bool) public isValidToken;
    
    // Events (store metadata here instead of storage)
    event TokenCreated(
        address indexed token,
        address indexed creator,
        uint256 indexed tokenId,
        string name,
        string symbol,
        string imageUrl,
        string description,
        uint256 timestamp
    );
    
    event BondingCurveUpdated(address indexed oldCurve, address indexed newCurve);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _tokenImplementation) {
        require(_tokenImplementation != address(0), "Invalid impl");
        tokenImplementation = _tokenImplementation;
        owner = msg.sender;
    }

    /**
     * @notice Create token with aggressive gas optimizations
     */
    function createToken(
        string calldata name,
        string calldata symbol,
        string calldata imageUrl,
        string calldata description
    ) external payable returns (address token) {
        // Minimal validation
        require(bondingCurve != address(0), "No curve");
        require(bytes(name).length > 0 && bytes(name).length <= 32, "Invalid name");
        require(bytes(symbol).length > 0 && bytes(symbol).length <= 8, "Invalid symbol");
        
        // Check fee
        uint256 requiredFee = creationFee;
        require(msg.value >= requiredFee, "Insufficient fee");
        
        // Deploy token using CREATE2 for gas efficiency
        bytes32 salt = keccak256(abi.encodePacked(msg.sender, totalTokensCreated));
        token = Clones.cloneDeterministic(tokenImplementation, salt);
        
        // Initialize token
        ILaunchpadToken(token).initialize(
            name,
            symbol,
            address(this),
            bondingCurve
        );
        
        // Update state in single SSTORE
        unchecked {
            uint128 tokenId = totalTokensCreated++;
            tokenMeta[token] = TokenMeta({
                tokenId: tokenId,
                createdAt: uint64(block.timestamp),
                category: 0 // NEW
            });
        }
        
        isValidToken[token] = true;
        
        // Initialize bonding curve
        IBondingCurveV2(bondingCurve).initializeToken(token, msg.sender);
        
        // Transfer tokens to bonding curve
        ILaunchpadToken(token).transfer(bondingCurve, CURVE_SUPPLY + DEX_SUPPLY);
        
        // Emit event with metadata (cheaper than storage)
        emit TokenCreated(
            token,
            msg.sender,
            uint256(totalTokensCreated - 1),
            name,
            symbol,
            imageUrl,
            description,
            block.timestamp
        );
        
        // Refund excess ETH
        unchecked {
            if (msg.value > requiredFee) {
                (bool success, ) = msg.sender.call{value: msg.value - requiredFee}("");
                require(success, "Refund failed");
            }
        }
    }

    /**
     * @notice Predict token address
     */
    function predictTokenAddress(
        address creator,
        uint256 nonce
    ) external view returns (address) {
        bytes32 salt = keccak256(abi.encodePacked(creator, nonce));
        return Clones.predictDeterministicAddress(tokenImplementation, salt);
    }

    /**
     * @notice Update token category (gas-optimized)
     */
    function updateCategory(address token, uint64 category) external {
        require(msg.sender == bondingCurve || msg.sender == owner, "Unauthorized");
        tokenMeta[token].category = category;
    }

    // Admin functions
    function setBondingCurve(address _bondingCurve) external onlyOwner {
        require(_bondingCurve != address(0), "Invalid");
        address old = bondingCurve;
        bondingCurve = _bondingCurve;
        emit BondingCurveUpdated(old, _bondingCurve);
    }

    function setCreationFee(uint128 _fee) external onlyOwner {
        creationFee = _fee;
    }

    function withdrawFees() external onlyOwner {
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success, "Failed");
    }

    receive() external payable {}
}