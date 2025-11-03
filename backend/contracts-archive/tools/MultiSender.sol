// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MultiSender is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_BATCH_SIZE = 500;
    uint256 public baseFee = 0.001 ether;
    uint256 public tokenFeePerRecipient = 0.00001 ether;
    uint256 public ethFeePerRecipient = 0.00001 ether;
    
    mapping(address => bool) public vipList;
    uint256 public vipDiscount = 50;

    event TokensSent(
        address indexed token,
        address indexed sender,
        uint256 totalAmount,
        uint256 recipientCount
    );

    event EthSent(
        address indexed sender,
        uint256 totalAmount,
        uint256 recipientCount
    );

    event FeeUpdated(
        string feeType,
        uint256 oldFee,
        uint256 newFee
    );

    event VIPStatusUpdated(
        address indexed account,
        bool status
    );

    event VIPDiscountUpdated(
        uint256 oldDiscount,
        uint256 newDiscount
    );

    constructor() {}

    function sendToken(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external payable nonReentrant {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length > 0, "Empty arrays");
        require(recipients.length <= MAX_BATCH_SIZE, "Batch size too large");
        require(token != address(0), "Invalid token address");

        uint256 fee = calculateFee(recipients.length, true);
        require(msg.value >= fee, "Insufficient fee");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            require(amounts[i] > 0, "Invalid amount");
            totalAmount += amounts[i];
        }

        IERC20(token).safeTransferFrom(msg.sender, address(this), totalAmount);

        for (uint256 i = 0; i < recipients.length; i++) {
            IERC20(token).safeTransfer(recipients[i], amounts[i]);
        }

        if (msg.value > fee) {
            (bool success, ) = msg.sender.call{value: msg.value - fee}("");
            require(success, "ETH refund failed");
        }

        emit TokensSent(token, msg.sender, totalAmount, recipients.length);
    }

    function sendTokenSameAmount(
        address token,
        address[] calldata recipients,
        uint256 amount
    ) external payable nonReentrant {
        require(recipients.length > 0, "Empty array");
        require(recipients.length <= MAX_BATCH_SIZE, "Batch size too large");
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Invalid amount");

        uint256 fee = calculateFee(recipients.length, true);
        require(msg.value >= fee, "Insufficient fee");

        uint256 totalAmount = amount * recipients.length;

        IERC20(token).safeTransferFrom(msg.sender, address(this), totalAmount);

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            IERC20(token).safeTransfer(recipients[i], amount);
        }

        if (msg.value > fee) {
            (bool success, ) = msg.sender.call{value: msg.value - fee}("");
            require(success, "ETH refund failed");
        }

        emit TokensSent(token, msg.sender, totalAmount, recipients.length);
    }

    function sendEth(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external payable nonReentrant {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length > 0, "Empty arrays");
        require(recipients.length <= MAX_BATCH_SIZE, "Batch size too large");

        uint256 fee = calculateFee(recipients.length, false);
        uint256 totalAmount = 0;

        for (uint256 i = 0; i < amounts.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            require(amounts[i] > 0, "Invalid amount");
            totalAmount += amounts[i];
        }

        require(msg.value >= totalAmount + fee, "Insufficient ETH");

        for (uint256 i = 0; i < recipients.length; i++) {
            (bool success, ) = recipients[i].call{value: amounts[i]}("");
            require(success, "ETH transfer failed");
        }

        uint256 refund = msg.value - totalAmount - fee;
        if (refund > 0) {
            (bool success, ) = msg.sender.call{value: refund}("");
            require(success, "ETH refund failed");
        }

        emit EthSent(msg.sender, totalAmount, recipients.length);
    }

    function sendEthSameAmount(
        address[] calldata recipients,
        uint256 amount
    ) external payable nonReentrant {
        require(recipients.length > 0, "Empty array");
        require(recipients.length <= MAX_BATCH_SIZE, "Batch size too large");
        require(amount > 0, "Invalid amount");

        uint256 fee = calculateFee(recipients.length, false);
        uint256 totalAmount = amount * recipients.length;

        require(msg.value >= totalAmount + fee, "Insufficient ETH");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            (bool success, ) = recipients[i].call{value: amount}("");
            require(success, "ETH transfer failed");
        }

        uint256 refund = msg.value - totalAmount - fee;
        if (refund > 0) {
            (bool success, ) = msg.sender.call{value: refund}("");
            require(success, "ETH refund failed");
        }

        emit EthSent(msg.sender, totalAmount, recipients.length);
    }

    function calculateFee(uint256 recipientCount, bool isToken) public view returns (uint256) {
        uint256 perRecipientFee = isToken ? tokenFeePerRecipient : ethFeePerRecipient;
        uint256 totalFee = baseFee + (perRecipientFee * recipientCount);
        
        if (vipList[msg.sender]) {
            totalFee = (totalFee * (100 - vipDiscount)) / 100;
        }
        
        return totalFee;
    }

    function setBaseFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = baseFee;
        baseFee = newFee;
        emit FeeUpdated("base", oldFee, newFee);
    }

    function setTokenFeePerRecipient(uint256 newFee) external onlyOwner {
        uint256 oldFee = tokenFeePerRecipient;
        tokenFeePerRecipient = newFee;
        emit FeeUpdated("tokenPerRecipient", oldFee, newFee);
    }

    function setEthFeePerRecipient(uint256 newFee) external onlyOwner {
        uint256 oldFee = ethFeePerRecipient;
        ethFeePerRecipient = newFee;
        emit FeeUpdated("ethPerRecipient", oldFee, newFee);
    }

    function setVIPStatus(address account, bool status) external onlyOwner {
        vipList[account] = status;
        emit VIPStatusUpdated(account, status);
    }

    function setVIPDiscount(uint256 newDiscount) external onlyOwner {
        require(newDiscount <= 100, "Invalid discount");
        uint256 oldDiscount = vipDiscount;
        vipDiscount = newDiscount;
        emit VIPDiscountUpdated(oldDiscount, newDiscount);
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Fee withdrawal failed");
    }

    function emergencyTokenWithdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        
        IERC20(token).safeTransfer(owner(), balance);
    }

    receive() external payable {}
}