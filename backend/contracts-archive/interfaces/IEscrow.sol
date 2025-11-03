// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEscrow {
    struct Milestone {
        uint256 amount;
        uint256 releaseDate;
        bool released;
        bool verified;
        mapping(address => bool) verifierApprovals;
    }

    event MilestoneReleased(uint256 indexed milestoneId, uint256 amount, uint256 timestamp);
    event MilestoneVerified(uint256 indexed milestoneId, address indexed verifier);
    event PaymentClaimed(address indexed kol, uint256 amount);
    event DisputeRaised(address indexed raiser, string reason);
    event DisputeResolved(address indexed resolver, bool inFavorOfKOL);
    event EmergencyClawback(address indexed admin, uint256 amount);

    error NotProjectOwner();
    error NotKOL();
    error NotVerifier();
    error NotAdmin();
    error NotAuthorized();
    error MilestoneNotReady();
    error MilestoneAlreadyReleased();
    error MilestoneNotVerified();
    error InsufficientClaimableAmount();
    error DisputeActive();
    error InvalidMilestoneId();
    error TransferFailed();
    error ZeroAddress();
    error InvalidAmount();
    error InvalidReleaseDate();

    function initialize(
        address _project,
        address _kol,
        address _token,
        uint256 _totalAmount,
        uint256[] memory _milestoneAmounts,
        uint256[] memory _releaseDates,
        address[] memory _verifiers,
        uint8 _verificationThreshold
    ) external;

    function release(uint256 milestoneId) external;
    function verifyMilestone(uint256 milestoneId) external;
    function claim() external;
    function clawback() external;
    function raiseDispute(string calldata reason) external;
    function resolveDispute(bool inFavorOfKOL) external;

    function getMilestone(uint256 milestoneId) external view returns (
        uint256 amount,
        uint256 releaseDate,
        bool released,
        bool verified
    );
    
    function getClaimableAmount() external view returns (uint256);
    function isVerifier(address account) external view returns (bool);
    function releasedAmount() external view returns (uint256);
}