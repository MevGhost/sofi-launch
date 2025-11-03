// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ITimelockController.sol";

contract TimelockController is ITimelockController {
    // Constants
    uint256 public constant MIN_DELAY = 2 days;
    uint256 public constant MAX_DELAY = 30 days;
    uint256 public constant GRACE_PERIOD = 14 days;

    // State variables
    address public admin;
    address public pendingAdmin;
    uint256 public delay;
    
    mapping(bytes32 => uint256) public queuedTransactions;

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "TimelockController: caller is not admin");
        _;
    }

    modifier onlyTimelock() {
        require(msg.sender == address(this), "TimelockController: caller is not timelock");
        _;
    }

    constructor(address _admin, uint256 _delay) {
        require(_delay >= MIN_DELAY && _delay <= MAX_DELAY, "TimelockController: invalid delay");
        admin = _admin;
        delay = _delay;
    }

    function queueTransaction(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyAdmin returns (bytes32) {
        bytes32 txHash = getTransactionHash(target, value, data);
        uint256 executeTime = block.timestamp + delay;
        
        queuedTransactions[txHash] = executeTime;
        
        emit TransactionQueued(txHash, target, value, data, executeTime);
        return txHash;
    }

    function executeTransaction(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyAdmin returns (bytes memory) {
        bytes32 txHash = getTransactionHash(target, value, data);
        uint256 executeTime = queuedTransactions[txHash];
        
        require(executeTime > 0, "TimelockController: transaction not queued");
        require(block.timestamp >= executeTime, "TimelockController: transaction not ready");
        require(block.timestamp <= executeTime + GRACE_PERIOD, "TimelockController: transaction expired");

        queuedTransactions[txHash] = 0;

        (bool success, bytes memory returnData) = target.call{value: value}(data);
        require(success, "TimelockController: transaction execution failed");

        emit TransactionExecuted(txHash, target, value, data);

        return returnData;
    }

    function cancelTransaction(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyAdmin {
        bytes32 txHash = getTransactionHash(target, value, data);
        require(queuedTransactions[txHash] > 0, "TimelockController: transaction not queued");
        
        queuedTransactions[txHash] = 0;
        
        emit TransactionCancelled(txHash);
    }

    function getTransactionHash(
        address target,
        uint256 value,
        bytes calldata data
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(target, value, data));
    }

    function isTransactionQueued(bytes32 txHash) external view returns (bool) {
        return queuedTransactions[txHash] > 0;
    }

    function getDelay() external view returns (uint256) {
        return delay;
    }

    function setDelay(uint256 _delay) external onlyTimelock {
        require(_delay >= MIN_DELAY && _delay <= MAX_DELAY, "TimelockController: invalid delay");
        uint256 oldDelay = delay;
        delay = _delay;
        emit DelayUpdated(oldDelay, _delay);
    }

    function acceptAdmin() external {
        require(msg.sender == pendingAdmin, "TimelockController: caller is not pending admin");
        admin = pendingAdmin;
        pendingAdmin = address(0);
    }

    function setPendingAdmin(address _pendingAdmin) external onlyTimelock {
        pendingAdmin = _pendingAdmin;
    }

    receive() external payable {}
}