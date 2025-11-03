// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISecureBondingCurve {
    function buyTokens(address token, uint256 minTokensOut) external payable;
    function sellTokens(address token, uint256 tokenAmount, uint256 minEthOut) external;
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// Malicious token contract that tries reentrancy on transfer
contract MaliciousToken {
    mapping(address => uint256) private _balances;
    ISecureBondingCurve public bondingCurve;
    address public targetToken;
    bool public hasAttacked;
    
    function setBondingCurve(address _bondingCurve, address _targetToken) external {
        bondingCurve = ISecureBondingCurve(_bondingCurve);
        targetToken = _targetToken;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        _balances[to] += amount;
        
        // Try reentrancy when tokens are being transferred to attacker
        if (!hasAttacked && address(this).balance >= 0.001 ether) {
            hasAttacked = true;
            bondingCurve.buyTokens{value: 0.001 ether}(targetToken, 0);
        }
        
        return true;
    }
    
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }
    
    receive() external payable {}
}

contract ReentrancyAttacker {
    ISecureBondingCurve public bondingCurve;
    address public targetToken;
    uint256 public callCount;
    bool public reentrancyAttempted;
    
    constructor(address _bondingCurve) {
        bondingCurve = ISecureBondingCurve(_bondingCurve);
    }
    
    function attack(address token) external payable {
        targetToken = token;
        callCount = 0;
        reentrancyAttempted = false;
        bondingCurve.buyTokens{value: msg.value}(token, 0);
    }
    
    function sellAttack(address token, uint256 tokenAmount, uint256 minEthOut) external {
        targetToken = token;
        callCount = 0;
        reentrancyAttempted = false;
        // This will call sellTokens and trigger receive() when ETH is sent back
        bondingCurve.sellTokens(token, tokenAmount, minEthOut);
    }
    
    // This will be called when sellTokens sends ETH back
    receive() external payable {
        callCount++;
        if (!reentrancyAttempted && callCount == 1) {
            reentrancyAttempted = true;
            // Try to reenter - this should fail with ReentrancyGuardReentrantCall
            bondingCurve.buyTokens{value: 0.001 ether}(targetToken, 0);
        }
    }
    
    // Fallback for any unexpected calls
    fallback() external payable {
        callCount++;
        if (!reentrancyAttempted && callCount == 1) {
            reentrancyAttempted = true;
            bondingCurve.sellTokens(targetToken, 1000, 0); // Try to sell some tokens
        }
    }
}