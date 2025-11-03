// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimpleToken
 * @dev Basic ERC20 token for testing
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
 * @title SimpleTokenFactory
 * @dev Simplified token factory for testing
 */
contract SimpleTokenFactory is ReentrancyGuard {
    uint256 public constant CREATION_FEE = 0.02 ether;
    uint256 public constant INITIAL_SUPPLY = 1000000000 * 10**18; // 1 billion tokens
    
    address[] public allTokens;
    mapping(address => bool) public isToken;
    
    event TokenCreated(address indexed token, address indexed creator, string name, string symbol);
    
    function getCreationFee() external pure returns (uint256) {
        return CREATION_FEE;
    }
    
    function createToken(
        string memory _name,
        string memory _symbol,
        string memory _description,
        string memory _imageUrl,
        string memory, // twitter - unused
        string memory, // telegram - unused
        string memory, // website - unused
        string memory  // category - unused
    ) external payable nonReentrant returns (address) {
        require(msg.value >= CREATION_FEE, "Insufficient fee");
        
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
        
        emit TokenCreated(tokenAddress, msg.sender, _name, _symbol);
        
        // Refund excess ETH
        if (msg.value > CREATION_FEE) {
            payable(msg.sender).transfer(msg.value - CREATION_FEE);
        }
        
        return tokenAddress;
    }
    
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }
}