// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "../tokens/LaunchpadToken.sol";
import "../interfaces/IBondingCurve.sol";
import "../interfaces/ITokenFactory.sol";

contract TokenFactory is ITokenFactory, Ownable {
    using Clones for address;

    address public immutable tokenImplementation;
    address public bondingCurve;
    address public graduationManager;
    
    mapping(address => bool) public isValidToken;
    mapping(address => TokenMetadata) public tokenMetadata;
    mapping(string => address) public symbolToToken;
    mapping(address => address[]) public creatorTokens;
    
    address[] public allTokens;
    
    uint256 public constant MIN_NAME_LENGTH = 2;
    uint256 public constant MAX_NAME_LENGTH = 32;
    uint256 public constant MIN_SYMBOL_LENGTH = 2;
    uint256 public constant MAX_SYMBOL_LENGTH = 8;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 256;
    uint256 public constant MAX_IMAGE_URL_LENGTH = 256;

    struct TokenMetadata {
        string name;
        string symbol;
        string description;
        string imageUrl;
        address creator;
        uint256 createdAt;
    }

    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 timestamp
    );

    event BondingCurveUpdated(address indexed oldCurve, address indexed newCurve);
    event GraduationManagerUpdated(address indexed oldManager, address indexed newManager);

    modifier onlyValidBondingCurve() {
        require(bondingCurve != address(0), "Bonding curve not set");
        _;
    }

    constructor() {
        tokenImplementation = address(new LaunchpadToken());
    }

    function setBondingCurve(address _bondingCurve) external onlyOwner {
        require(_bondingCurve != address(0), "Invalid bonding curve");
        address oldCurve = bondingCurve;
        bondingCurve = _bondingCurve;
        emit BondingCurveUpdated(oldCurve, _bondingCurve);
    }

    function setGraduationManager(address _graduationManager) external onlyOwner {
        require(_graduationManager != address(0), "Invalid graduation manager");
        address oldManager = graduationManager;
        graduationManager = _graduationManager;
        emit GraduationManagerUpdated(oldManager, _graduationManager);
    }

    function createToken(
        string calldata name,
        string calldata symbol,
        string calldata description,
        string calldata imageUrl
    ) external onlyValidBondingCurve returns (address token) {
        _validateTokenParams(name, symbol, description, imageUrl);
        require(symbolToToken[symbol] == address(0), "Symbol already exists");

        bytes32 salt = keccak256(abi.encodePacked(
            msg.sender,
            name,
            symbol,
            block.timestamp,
            block.number
        ));

        token = Clones.cloneDeterministic(tokenImplementation, salt);
        
        LaunchpadToken(token).initialize(
            name,
            symbol,
            address(this),
            bondingCurve
        );

        isValidToken[token] = true;
        
        tokenMetadata[token] = TokenMetadata({
            name: name,
            symbol: symbol,
            description: description,
            imageUrl: imageUrl,
            creator: msg.sender,
            createdAt: block.timestamp
        });

        symbolToToken[symbol] = token;
        creatorTokens[msg.sender].push(token);
        allTokens.push(token);

        IBondingCurve(bondingCurve).initializeToken(token, msg.sender);

        emit TokenCreated(token, msg.sender, name, symbol, block.timestamp);
    }

    function predictTokenAddress(
        address creator,
        string calldata name,
        string calldata symbol
    ) external view returns (address) {
        bytes32 salt = keccak256(abi.encodePacked(
            creator,
            name,
            symbol,
            block.timestamp,
            block.number
        ));

        return Clones.predictDeterministicAddress(
            tokenImplementation,
            salt,
            address(this)
        );
    }

    function _validateTokenParams(
        string calldata name,
        string calldata symbol,
        string calldata description,
        string calldata imageUrl
    ) private pure {
        require(bytes(name).length >= MIN_NAME_LENGTH, "Name too short");
        require(bytes(name).length <= MAX_NAME_LENGTH, "Name too long");
        require(bytes(symbol).length >= MIN_SYMBOL_LENGTH, "Symbol too short");
        require(bytes(symbol).length <= MAX_SYMBOL_LENGTH, "Symbol too long");
        require(bytes(description).length <= MAX_DESCRIPTION_LENGTH, "Description too long");
        require(bytes(imageUrl).length <= MAX_IMAGE_URL_LENGTH, "Image URL too long");
        
        _validateAlphanumeric(symbol);
    }

    function _validateAlphanumeric(string calldata str) private pure {
        bytes memory b = bytes(str);
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 char = b[i];
            bool isValid = (char >= 0x30 && char <= 0x39) || 
                          (char >= 0x41 && char <= 0x5A) || 
                          (char >= 0x61 && char <= 0x7A);
            require(isValid, "Symbol must be alphanumeric");
        }
    }

    function getTokenCount() external view returns (uint256) {
        return allTokens.length;
    }

    function getTokensPaginated(
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory tokens) {
        uint256 totalTokens = allTokens.length;
        if (offset >= totalTokens) {
            return new address[](0);
        }

        uint256 end = offset + limit;
        if (end > totalTokens) {
            end = totalTokens;
        }

        tokens = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            tokens[i - offset] = allTokens[i];
        }
    }

    function getCreatorTokens(address creator) external view returns (address[] memory) {
        return creatorTokens[creator];
    }

    function getTokenMetadata(address token) external view returns (
        string memory name,
        string memory symbol,
        string memory description,
        string memory imageUrl,
        address creator,
        uint256 createdAt
    ) {
        TokenMetadata memory metadata = tokenMetadata[token];
        return (
            metadata.name,
            metadata.symbol,
            metadata.description,
            metadata.imageUrl,
            metadata.creator,
            metadata.createdAt
        );
    }

    function getTokenBySymbol(string calldata symbol) external view returns (address) {
        return symbolToToken[symbol];
    }

    function computeCreate2Address(
        bytes32 salt
    ) public view returns (address) {
        return Clones.predictDeterministicAddress(
            tokenImplementation,
            salt,
            address(this)
        );
    }
}