// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEscrowFactory {
    event EscrowCreated(
        address indexed escrow,
        address indexed project,
        address indexed kol,
        address token,
        uint256 totalAmount
    );
    
    event ImplementationUpdated(address indexed oldImpl, address indexed newImpl);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event FeesCollected(address indexed collector, uint256 amount);

    error InvalidImplementation();
    error InvalidFeePercentage();
    error Unauthorized();
    error ZeroAddress();
    error InvalidParameters();
    error InsufficientAllowance();
    error TransferFailed();

    function createEscrow(
        address kol,
        address token,
        uint256 totalAmount,
        uint256[] calldata milestoneAmounts,
        uint256[] calldata releaseDates,
        address[] calldata verifiers,
        uint8 verificationThreshold
    ) external returns (address escrow);

    function updateImplementation(address newImplementation) external;
    function updateAdmin(address newAdmin) external;
    function updateFee(uint256 newFeePercentage) external;
    function collectFees() external;

    function getEscrowsByProject(address project) external view returns (address[] memory);
    function getEscrowsByKOL(address kol) external view returns (address[] memory);
    function isEscrow(address escrow) external view returns (bool);
}