// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IGraduationManager {
    function graduateToken(address token) external returns (address lpToken);
    
    function isGraduated(address token) external view returns (bool);
    
    function getGraduationInfo(address token) external view returns (
        bool graduated,
        address lpToken,
        uint256 graduatedAt,
        uint256 ethLiquidity,
        uint256 tokenLiquidity
    );
}