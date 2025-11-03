// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ILaunchpadToken is IERC20 {
    function initialize(
        string memory name,
        string memory symbol,
        address factory,
        address bondingCurve
    ) external;
    
    function mint(address to, uint256 amount) external;
    
    function burn(uint256 amount) external;
    
    function factory() external view returns (address);
    
    function bondingCurve() external view returns (address);
    
    function isInitialized() external view returns (bool);
}