// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITokenFactory {
    function createToken(
        string calldata name,
        string calldata symbol,
        string calldata description,
        string calldata imageUrl
    ) external returns (address token);
    
    function isValidToken(address token) external view returns (bool);
    
    function getTokenMetadata(address token) external view returns (
        string memory name,
        string memory symbol,
        string memory description,
        string memory imageUrl,
        address creator,
        uint256 createdAt
    );
    
    function predictTokenAddress(
        address creator,
        string calldata name,
        string calldata symbol
    ) external view returns (address);
}