// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/ILaunchpadToken.sol";

contract LaunchpadToken is ILaunchpadToken, ERC20, ERC20Burnable {
    address public factory;
    address public bondingCurve;
    bool public isInitialized;
    
    string private _tokenName;
    string private _tokenSymbol;

    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;
    uint256 public constant BONDING_CURVE_SUPPLY = 800_000_000 * 10**18;
    uint256 public constant DEX_SUPPLY = 200_000_000 * 10**18;

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }

    modifier onlyBondingCurve() {
        require(msg.sender == bondingCurve, "Only bonding curve");
        _;
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == factory || msg.sender == bondingCurve,
            "Unauthorized"
        );
        _;
    }

    constructor() ERC20("IMPLEMENTATION", "IMPL") {}

    function initialize(
        string memory _name,
        string memory _symbol,
        address _factory,
        address _bondingCurve
    ) external override {
        require(!isInitialized, "Already initialized");
        require(_factory != address(0), "Invalid factory");
        require(_bondingCurve != address(0), "Invalid bonding curve");

        _tokenName = _name;
        _tokenSymbol = _symbol;
        factory = _factory;
        bondingCurve = _bondingCurve;
        isInitialized = true;

        _mint(_bondingCurve, BONDING_CURVE_SUPPLY);
        _mint(_bondingCurve, DEX_SUPPLY);
    }

    function name() public view override returns (string memory) {
        return isInitialized ? _tokenName : super.name();
    }

    function symbol() public view override returns (string memory) {
        return isInitialized ? _tokenSymbol : super.symbol();
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function mint(address to, uint256 amount) external override onlyAuthorized {
        revert("Minting disabled");
    }

    function burn(uint256 amount) public override(ERC20Burnable, ILaunchpadToken) {
        super.burn(amount);
    }

    function transfer(address to, uint256 amount) public override(ERC20, IERC20) returns (bool) {
        return super.transfer(to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override(ERC20, IERC20) returns (bool) {
        return super.transferFrom(from, to, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._beforeTokenTransfer(from, to, amount);
    }
}