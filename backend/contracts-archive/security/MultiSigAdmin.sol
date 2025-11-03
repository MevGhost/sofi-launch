// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MultiSigAdmin {
    // Events
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event TransactionSubmitted(uint256 indexed txIndex, address indexed submitter);
    event TransactionApproved(uint256 indexed txIndex, address indexed approver);
    event TransactionRevoked(uint256 indexed txIndex, address indexed revoker);
    event TransactionExecuted(uint256 indexed txIndex, address indexed executor);

    // State variables
    address[] public admins;
    mapping(address => bool) public isAdmin;
    uint256 public threshold;
    uint256 public transactionCount;

    struct Transaction {
        address target;
        uint256 value;
        bytes data;
        bool executed;
        uint256 approvalCount;
        mapping(address => bool) approved;
    }

    mapping(uint256 => Transaction) public transactions;

    // Modifiers
    modifier onlyAdmin() {
        require(isAdmin[msg.sender], "MultiSigAdmin: caller is not admin");
        _;
    }

    modifier onlyMultiSig() {
        require(msg.sender == address(this), "MultiSigAdmin: caller is not multisig");
        _;
    }

    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactionCount, "MultiSigAdmin: transaction does not exist");
        _;
    }

    modifier notExecuted(uint256 _txIndex) {
        require(!transactions[_txIndex].executed, "MultiSigAdmin: transaction already executed");
        _;
    }

    constructor(address[] memory _admins, uint256 _threshold) {
        require(_admins.length >= _threshold, "MultiSigAdmin: invalid threshold");
        require(_threshold > 0, "MultiSigAdmin: threshold must be greater than 0");

        for (uint256 i = 0; i < _admins.length; i++) {
            address admin = _admins[i];
            require(admin != address(0), "MultiSigAdmin: invalid admin");
            require(!isAdmin[admin], "MultiSigAdmin: duplicate admin");

            isAdmin[admin] = true;
            admins.push(admin);
            emit AdminAdded(admin);
        }

        threshold = _threshold;
    }

    function submitTransaction(
        address _target,
        uint256 _value,
        bytes calldata _data
    ) external onlyAdmin returns (uint256) {
        uint256 txIndex = transactionCount;
        
        transactions[txIndex].target = _target;
        transactions[txIndex].value = _value;
        transactions[txIndex].data = _data;
        transactions[txIndex].executed = false;
        transactions[txIndex].approvalCount = 1;
        transactions[txIndex].approved[msg.sender] = true;

        transactionCount++;

        emit TransactionSubmitted(txIndex, msg.sender);
        emit TransactionApproved(txIndex, msg.sender);

        // Auto-execute if threshold is 1
        if (threshold == 1) {
            _executeTransaction(txIndex);
        }

        return txIndex;
    }

    function approveTransaction(uint256 _txIndex) 
        external 
        onlyAdmin 
        txExists(_txIndex) 
        notExecuted(_txIndex) 
    {
        Transaction storage transaction = transactions[_txIndex];
        require(!transaction.approved[msg.sender], "MultiSigAdmin: transaction already approved");

        transaction.approved[msg.sender] = true;
        transaction.approvalCount++;

        emit TransactionApproved(_txIndex, msg.sender);

        if (transaction.approvalCount >= threshold) {
            _executeTransaction(_txIndex);
        }
    }

    function revokeApproval(uint256 _txIndex) 
        external 
        onlyAdmin 
        txExists(_txIndex) 
        notExecuted(_txIndex) 
    {
        Transaction storage transaction = transactions[_txIndex];
        require(transaction.approved[msg.sender], "MultiSigAdmin: transaction not approved");

        transaction.approved[msg.sender] = false;
        transaction.approvalCount--;

        emit TransactionRevoked(_txIndex, msg.sender);
    }

    function _executeTransaction(uint256 _txIndex) private {
        Transaction storage transaction = transactions[_txIndex];
        
        transaction.executed = true;

        (bool success, ) = transaction.target.call{value: transaction.value}(transaction.data);
        require(success, "MultiSigAdmin: transaction execution failed");

        emit TransactionExecuted(_txIndex, msg.sender);
    }

    function addAdmin(address _admin) external onlyMultiSig {
        require(!isAdmin[_admin], "MultiSigAdmin: already admin");
        require(_admin != address(0), "MultiSigAdmin: invalid admin");

        isAdmin[_admin] = true;
        admins.push(_admin);

        emit AdminAdded(_admin);
    }

    function removeAdmin(address _admin) external onlyMultiSig {
        require(isAdmin[_admin], "MultiSigAdmin: not admin");
        require(admins.length - 1 >= threshold, "MultiSigAdmin: cannot go below threshold");

        isAdmin[_admin] = false;

        // Remove from array
        for (uint256 i = 0; i < admins.length; i++) {
            if (admins[i] == _admin) {
                admins[i] = admins[admins.length - 1];
                admins.pop();
                break;
            }
        }

        emit AdminRemoved(_admin);
    }

    function updateThreshold(uint256 _threshold) external onlyMultiSig {
        require(_threshold > 0 && _threshold <= admins.length, "MultiSigAdmin: invalid threshold");
        
        uint256 oldThreshold = threshold;
        threshold = _threshold;
        
        emit ThresholdUpdated(oldThreshold, _threshold);
    }

    function getAdmins() external view returns (address[] memory) {
        return admins;
    }

    function getTransactionInfo(uint256 _txIndex) 
        external 
        view 
        returns (
            address target,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 approvalCount
        ) 
    {
        Transaction storage transaction = transactions[_txIndex];
        return (
            transaction.target,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.approvalCount
        );
    }

    function isApproved(uint256 _txIndex, address _admin) external view returns (bool) {
        return transactions[_txIndex].approved[_admin];
    }

    receive() external payable {}
}