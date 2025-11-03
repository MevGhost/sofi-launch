// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AdminEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Milestone {
        string title;
        string description;
        uint256 amount;
        bool delivered;
        bool reviewed;
        bool approved;
        string deliveryProof;
    }

    address public immutable admin;
    address public immutable project;
    address public immutable kol;
    IERC20 public immutable token;
    uint256 public immutable totalAmount;
    
    Milestone[] public milestones;
    uint256 public refundedAmount;
    
    event MilestoneDelivered(uint256 indexed milestoneId, string proof);
    event MilestoneReviewed(uint256 indexed milestoneId, bool approved, uint256 amount);
    event FundsTransferred(address indexed recipient, uint256 amount);
    event FundsRefunded(address indexed project, uint256 amount);
    
    error NotAdmin();
    error NotKOL();
    error NotProject();
    error InvalidMilestone();
    error AlreadyDelivered();
    error AlreadyReviewed();
    error NotDelivered();
    error TransferFailed();
    
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }
    
    modifier onlyKOL() {
        if (msg.sender != kol) revert NotKOL();
        _;
    }
    
    modifier onlyProject() {
        if (msg.sender != project) revert NotProject();
        _;
    }

    constructor(
        address _admin,
        address _project,
        address _kol,
        address _token,
        uint256 _totalAmount,
        string[] memory _titles,
        string[] memory _descriptions,
        uint256[] memory _amounts
    ) {
        admin = _admin;
        project = _project;
        kol = _kol;
        token = IERC20(_token);
        totalAmount = _totalAmount;
        
        require(_titles.length == _descriptions.length && _titles.length == _amounts.length, "Array length mismatch");
        
        uint256 sum = 0;
        for (uint256 i = 0; i < _titles.length; i++) {
            milestones.push(Milestone({
                title: _titles[i],
                description: _descriptions[i],
                amount: _amounts[i],
                delivered: false,
                reviewed: false,
                approved: false,
                deliveryProof: ""
            }));
            sum += _amounts[i];
        }
        
        require(sum == _totalAmount, "Amounts don't match total");
        
        // Transfer tokens to this contract
        token.safeTransferFrom(_project, address(this), _totalAmount);
    }
    
    // KOL delivers on a milestone
    function deliver(uint256 milestoneId, string memory proof) external onlyKOL {
        if (milestoneId >= milestones.length) revert InvalidMilestone();
        Milestone storage milestone = milestones[milestoneId];
        
        if (milestone.delivered) revert AlreadyDelivered();
        
        milestone.delivered = true;
        milestone.deliveryProof = proof;
        
        emit MilestoneDelivered(milestoneId, proof);
    }
    
    // Admin reviews and approves/denies delivery
    function review(uint256 milestoneId, bool approve) external onlyAdmin nonReentrant {
        if (milestoneId >= milestones.length) revert InvalidMilestone();
        Milestone storage milestone = milestones[milestoneId];
        
        if (!milestone.delivered) revert NotDelivered();
        if (milestone.reviewed) revert AlreadyReviewed();
        
        milestone.reviewed = true;
        milestone.approved = approve;
        
        if (approve) {
            // Send funds directly to KOL
            token.safeTransfer(kol, milestone.amount);
            emit FundsTransferred(kol, milestone.amount);
        } else {
            // Track refunded amount
            refundedAmount += milestone.amount;
        }
        
        emit MilestoneReviewed(milestoneId, approve, milestone.amount);
    }
    
    // Project owner can withdraw denied/undelivered milestone funds
    function withdrawRefunds() external onlyProject nonReentrant {
        uint256 refundable = 0;
        
        // Calculate total refundable amount (denied + undelivered milestones)
        for (uint256 i = 0; i < milestones.length; i++) {
            Milestone memory milestone = milestones[i];
            if (!milestone.delivered || (milestone.reviewed && !milestone.approved)) {
                refundable += milestone.amount;
            }
        }
        
        refundable -= refundedAmount; // Subtract already refunded
        
        require(refundable > 0, "No refunds available");
        
        refundedAmount += refundable;
        token.safeTransfer(project, refundable);
        
        emit FundsRefunded(project, refundable);
    }
    
    // View functions
    function getMilestoneCount() external view returns (uint256) {
        return milestones.length;
    }
    
    function getMilestone(uint256 milestoneId) external view returns (
        string memory title,
        string memory description,
        uint256 amount,
        bool delivered,
        bool reviewed,
        bool approved,
        string memory deliveryProof
    ) {
        if (milestoneId >= milestones.length) revert InvalidMilestone();
        Milestone memory m = milestones[milestoneId];
        return (m.title, m.description, m.amount, m.delivered, m.reviewed, m.approved, m.deliveryProof);
    }
    
    function getBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}