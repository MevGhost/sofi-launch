// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITimelockController {
    // Events
    event TransactionQueued(bytes32 indexed txHash, address indexed target, uint256 value, bytes data, uint256 executeTime);
    event TransactionExecuted(bytes32 indexed txHash, address indexed target, uint256 value, bytes data);
    event TransactionCancelled(bytes32 indexed txHash);
    event DelayUpdated(uint256 oldDelay, uint256 newDelay);

    // Functions
    function queueTransaction(address target, uint256 value, bytes calldata data) external returns (bytes32);
    function executeTransaction(address target, uint256 value, bytes calldata data) external returns (bytes memory);
    function cancelTransaction(address target, uint256 value, bytes calldata data) external;
    function getTransactionHash(address target, uint256 value, bytes calldata data) external pure returns (bytes32);
    function isTransactionQueued(bytes32 txHash) external view returns (bool);
    function getDelay() external view returns (uint256);
}