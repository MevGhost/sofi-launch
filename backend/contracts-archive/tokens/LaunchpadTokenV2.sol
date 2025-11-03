// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "../interfaces/ILaunchpadToken.sol";

/**
 * @title LaunchpadTokenV2
 * @notice Optimized ERC20 implementation for minimal proxy pattern
 * @dev Designed for CREATE2 deployment with minimal storage usage
 */
contract LaunchpadTokenV2 is ILaunchpadToken, ERC20, ERC20Burnable {
    // Constants
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;
    uint8 public constant DECIMALS = 18;
    
    // State variables (minimize storage slots)
    address public factory;
    address public bondingCurve;
    bool public isInitialized;
    
    // Store name and symbol efficiently
    string private _tokenName;
    string private _tokenSymbol;
    
    // Modifiers
    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }

    modifier onlyBondingCurve() {
        require(msg.sender == bondingCurve, "Only bonding curve");
        _;
    }

    modifier notInitialized() {
        require(!isInitialized, "Already initialized");
        _;
    }

    /**
     * @dev Constructor sets placeholder values for implementation contract
     */
    constructor() ERC20("IMPLEMENTATION", "IMPL") {
        // Implementation contract - not meant to be used directly
        isInitialized = true;
    }

    /**
     * @notice Initialize token for proxy deployment
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _factory Factory address
     * @param _bondingCurve Bonding curve address
     */
    function initialize(
        string memory _name,
        string memory _symbol,
        address _factory,
        address _bondingCurve
    ) external override notInitialized {
        require(_factory != address(0), "Invalid factory");
        require(_bondingCurve != address(0), "Invalid bonding curve");
        require(bytes(_name).length > 0, "Invalid name");
        require(bytes(_symbol).length > 0, "Invalid symbol");
        
        // Set state variables
        _tokenName = _name;
        _tokenSymbol = _symbol;
        factory = _factory;
        bondingCurve = _bondingCurve;
        isInitialized = true;
        
        // Mint total supply to factory
        // Factory will distribute to bonding curve
        _mint(_factory, TOTAL_SUPPLY);
    }

    /**
     * @notice Get token name
     * @return Token name
     */
    function name() public view override returns (string memory) {
        return isInitialized ? _tokenName : super.name();
    }

    /**
     * @notice Get token symbol
     * @return Token symbol
     */
    function symbol() public view override returns (string memory) {
        return isInitialized ? _tokenSymbol : super.symbol();
    }

    /**
     * @notice Get token decimals
     * @return Always 18
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @notice Mint function disabled after initialization
     * @dev All tokens minted during initialization
     */
    function mint(address, uint256) external pure override {
        revert("Minting disabled");
    }

    /**
     * @notice Burn tokens
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public override(ERC20Burnable, ILaunchpadToken) {
        super.burn(amount);
    }

    /**
     * @notice Transfer tokens with additional validation
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return Success status
     */
    function transfer(address to, uint256 amount) public override(ERC20, IERC20) returns (bool) {
        require(to != address(0), "Invalid recipient");
        return super.transfer(to, amount);
    }

    /**
     * @notice Transfer from with additional validation
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return Success status
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override(ERC20, IERC20) returns (bool) {
        require(to != address(0), "Invalid recipient");
        return super.transferFrom(from, to, amount);
    }

    /**
     * @notice Check if token can be transferred
     * @dev Hook for future trading restrictions if needed
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._beforeTokenTransfer(from, to, amount);
        
        // Future: Add trading restrictions here if needed
        // e.g., block transfers until bonding curve is active
    }
}