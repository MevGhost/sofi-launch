// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBondingCurve {
    function initializeToken(address token, address creator) external returns (bool);
    
    function buyTokens(address token, uint256 minTokensOut) external payable;
    
    function sellTokens(address token, uint256 tokenAmount, uint256 minEthOut) external;
    
    function calculateTokensOut(address token, uint256 ethIn) external view returns (uint256);
    
    function calculateEthOut(address token, uint256 tokensIn) external view returns (uint256);
    
    function shouldGraduate(address token) external view returns (bool);
    
    function getMarketCap(address token) external view returns (uint256);
    
    function markAsGraduated(address token, address lpToken) external;
    
    function claimCreatorFees(address token) external;
    
    function claimPlatformFees() external;
    
    function getReserves(address token) external view returns (
        uint256 virtualEthReserve,
        uint256 virtualTokenReserve,
        uint256 realEthReserve,
        uint256 realTokenReserve
    );
    
    function getDexReserve(address token) external view returns (uint256);
}