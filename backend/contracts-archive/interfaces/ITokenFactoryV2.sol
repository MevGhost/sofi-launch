// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ITokenFactoryV2
 * @notice Interface for the optimized token factory
 */
interface ITokenFactoryV2 {
    // Enums
    enum TokenCategory { NEW, TRENDING, GRADUATING, GRADUATED }
    
    // Events
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
    
    // Core functions
    function createToken(
        string calldata name,
        string calldata symbol,
        string calldata imageUrl,
        string calldata description
    ) external payable returns (address token);
    
    function predictTokenAddress(
        address creator,
        string calldata name,
        string calldata symbol
    ) external view returns (address);
    
    // Registry functions
    function getCreationFee(address creator) external view returns (uint256);
    
    function updateTokenCategory(address token, TokenCategory newCategory) external;
    
    function getTokensByCreator(address creator) external view returns (address[] memory);
    
    function getTokensByCategory(
        TokenCategory category,
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory tokens);
    
    function getTokensPaginated(
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory tokens);
    
    // State getters
    function tokenImplementation() external view returns (address);
    function bondingCurve() external view returns (address);
    function platformToken() external view returns (address);
    function creationFee() external view returns (uint256);
    function totalTokensCreated() external view returns (uint256);
    function maxCreationsPerBlock() external view returns (uint256);
    
    function tokenByIndex(uint256 index) external view returns (address);
    function tokenIndex(address token) external view returns (uint256);
    function isValidToken(address token) external view returns (bool);
    function tokenCategory(address token) external view returns (TokenCategory);
    function creationsPerBlock(address creator, uint256 blockNumber) external view returns (uint256);
    
    // Admin functions
    function setBondingCurve(address _bondingCurve) external;
    function setPlatformToken(address _platformToken) external;
    function setCreationFee(uint256 _creationFee) external;
    function setMaxCreationsPerBlock(uint256 _maxCreationsPerBlock) external;
    function withdrawFees() external;
}