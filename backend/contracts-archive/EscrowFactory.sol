// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IEscrowFactory.sol";
import "./interfaces/IEscrow.sol";

contract EscrowFactory is IEscrowFactory, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Clones for address;

    address public implementation;
    address public admin;
    uint256 public feePercentage; // Basis points (100 = 1%)
    uint256 public constant MAX_FEE = 1000; // 10%
    uint256 public collectedFees;

    mapping(address => bool) public isEscrow;
    mapping(address => address[]) public projectEscrows;
    mapping(address => address[]) public kolEscrows;
    address[] public allEscrows;

    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }

    constructor(address _implementation) {
        if (_implementation == address(0)) revert ZeroAddress();
        implementation = _implementation;
        admin = msg.sender;
        feePercentage = 250; // 2.5%
    }

    function createEscrow(
        address kol,
        address token,
        uint256 totalAmount,
        uint256[] calldata milestoneAmounts,
        uint256[] calldata releaseDates,
        address[] calldata verifiers,
        uint8 verificationThreshold
    ) external virtual nonReentrant returns (address escrow) {
        if (kol == address(0) || token == address(0)) revert ZeroAddress();
        if (totalAmount == 0) revert InvalidParameters();
        if (milestoneAmounts.length == 0 || milestoneAmounts.length != releaseDates.length) {
            revert InvalidParameters();
        }
        if (verifiers.length > 0 && verificationThreshold == 0) {
            revert InvalidParameters();
        }
        if (verificationThreshold > verifiers.length) {
            revert InvalidParameters();
        }

        uint256 sum = 0;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            if (milestoneAmounts[i] == 0) revert InvalidParameters();
            if (i > 0 && releaseDates[i] <= releaseDates[i - 1]) {
                revert InvalidParameters();
            }
            sum += milestoneAmounts[i];
        }
        if (sum != totalAmount) revert InvalidParameters();

        uint256 platformFee = (totalAmount * feePercentage) / 10000;
        uint256 totalRequired = totalAmount + platformFee;

        IERC20 tokenContract = IERC20(token);
        uint256 allowance = tokenContract.allowance(msg.sender, address(this));
        if (allowance < totalRequired) revert InsufficientAllowance();

        escrow = implementation.clone();
        
        IEscrow(escrow).initialize(
            msg.sender,
            kol,
            token,
            totalAmount,
            milestoneAmounts,
            releaseDates,
            verifiers,
            verificationThreshold
        );

        tokenContract.safeTransferFrom(msg.sender, escrow, totalAmount);
        
        if (platformFee > 0) {
            tokenContract.safeTransferFrom(msg.sender, address(this), platformFee);
            collectedFees += platformFee;
        }

        isEscrow[escrow] = true;
        projectEscrows[msg.sender].push(escrow);
        kolEscrows[kol].push(escrow);
        allEscrows.push(escrow);

        emit EscrowCreated(escrow, msg.sender, kol, token, totalAmount);
    }

    function updateImplementation(address newImplementation) external virtual onlyAdmin {
        if (newImplementation == address(0)) revert InvalidImplementation();
        if (newImplementation == implementation) revert InvalidImplementation();
        
        address oldImpl = implementation;
        implementation = newImplementation;
        
        emit ImplementationUpdated(oldImpl, newImplementation);
    }

    function updateAdmin(address newAdmin) external virtual onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        
        address oldAdmin = admin;
        admin = newAdmin;
        
        emit AdminChanged(oldAdmin, newAdmin);
    }

    function updateFee(uint256 newFeePercentage) external onlyAdmin {
        if (newFeePercentage > MAX_FEE) revert InvalidFeePercentage();
        
        uint256 oldFee = feePercentage;
        feePercentage = newFeePercentage;
        
        emit FeeUpdated(oldFee, newFeePercentage);
    }

    function collectFees() external onlyAdmin nonReentrant {
        uint256 amount = collectedFees;
        if (amount == 0) revert InvalidParameters();
        
        collectedFees = 0;
        
        (bool success, ) = admin.call{value: amount}("");
        if (!success) revert TransferFailed();
        
        emit FeesCollected(admin, amount);
    }

    function adminReleaseMilestone(address escrowAddress, uint256 milestoneId) external onlyAdmin {
        if (!isEscrow[escrowAddress]) revert InvalidParameters();
        IEscrow(escrowAddress).release(milestoneId);
    }

    function getEscrowsByProject(address project) external view returns (address[] memory) {
        return projectEscrows[project];
    }

    function getEscrowsByKOL(address kol) external view returns (address[] memory) {
        return kolEscrows[kol];
    }

    function getAllEscrows() external view returns (address[] memory) {
        return allEscrows;
    }

    function getEscrowCount() external view returns (uint256) {
        return allEscrows.length;
    }
}