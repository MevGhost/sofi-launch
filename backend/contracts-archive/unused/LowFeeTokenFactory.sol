// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimpleToken
 * @dev Basic ERC20 token for low-fee deployment
 */
contract SimpleToken is ERC20 {
    string public imageUrl;
    string public description;
    address public immutable creator;
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply,
        string memory _imageUrl,
        string memory _description,
        address _creator
    ) ERC20(_name, _symbol) {
        imageUrl = _imageUrl;
        description = _description;
        creator = _creator;
        
        // Mint total supply to creator
        _mint(_creator, _totalSupply);
    }
}

/**
 * @title LowFeeTokenFactory
 * @dev Token factory with minimal creation fee (0.001 ETH)
 */
contract LowFeeTokenFactory is Ownable, ReentrancyGuard {
    uint256 public constant CREATION_FEE = 0.001 ether; // Only 0.001 ETH!
    uint256 public constant INITIAL_SUPPLY = 1000000000 * 10**18; // 1 billion tokens
    
    address[] public allTokens;
    mapping(address => bool) public isToken;
    
    event TokenCreated(
        address indexed token, 
        address indexed creator, 
        string name, 
        string symbol,
        uint256 timestamp
    );
    
    constructor() Ownable(msg.sender) {}
    
    function getCreationFee() external pure returns (uint256) {
        return CREATION_FEE;
    }
    
    function createToken(
        string memory _name,
        string memory _symbol,
        string memory _description,
        string memory _imageUrl,
        string memory, // twitter - unused but kept for compatibility
        string memory, // telegram - unused but kept for compatibility
        string memory, // website - unused but kept for compatibility
        string memory  // category - unused but kept for compatibility
    ) external payable nonReentrant returns (address) {
        require(msg.value >= CREATION_FEE, "Insufficient fee: 0.001 ETH required");
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_symbol).length > 0, "Symbol required");
        require(bytes(_symbol).length <= 10, "Symbol too long");
        
        // Deploy new token
        SimpleToken token = new SimpleToken(
            _name,
            _symbol,
            INITIAL_SUPPLY,
            _imageUrl,
            _description,
            msg.sender
        );
        
        address tokenAddress = address(token);
        
        // Track token
        allTokens.push(tokenAddress);
        isToken[tokenAddress] = true;
        
        emit TokenCreated(tokenAddress, msg.sender, _name, _symbol, block.timestamp);
        
        // Refund excess ETH
        if (msg.value > CREATION_FEE) {
            payable(msg.sender).transfer(msg.value - CREATION_FEE);
        }
        
        return tokenAddress;
    }
    
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }
    
    function getTokenCount() external view returns (uint256) {
        return allTokens.length;
    }
    
    // Owner functions
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }
    
    function updateCreationFee(uint256 /* newFee */) external onlyOwner {
        revert("Fee is immutable at 0.001 ETH");
    }
}