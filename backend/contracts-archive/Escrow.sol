// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./interfaces/IEscrow.sol";

contract Escrow is IEscrow, Initializable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public projectAddress;
    address public kolAddress;
    address public token;
    uint256 public totalAmount;
    uint256 public releasedAmount;
    uint256 public claimedAmount;
    
    address[] public verifiers;
    uint8 public verificationThreshold;
    mapping(address => bool) public isVerifier;
    
    Milestone[] public milestones;
    
    bool public disputeActive;
    address public disputeRaiser;
    string public disputeReason;
    
    address public admin;
    address public oracleAddress;
    uint256 public priceThreshold;
    
    modifier onlyProjectOrAdmin() {
        if (msg.sender != projectAddress && msg.sender != admin) revert NotAuthorized();
        _;
    }
    
    modifier onlyKOL() {
        if (msg.sender != kolAddress) revert NotKOL();
        _;
    }
    
    modifier onlyVerifier() {
        if (!isVerifier[msg.sender]) revert NotVerifier();
        _;
    }
    
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }
    
    modifier noActiveDispute() {
        if (disputeActive) revert DisputeActive();
        _;
    }

    function initialize(
        address _project,
        address _kol,
        address _token,
        uint256 _totalAmount,
        uint256[] memory _milestoneAmounts,
        uint256[] memory _releaseDates,
        address[] memory _verifiers,
        uint8 _verificationThreshold
    ) external initializer {
        if (_project == address(0) || _kol == address(0) || _token == address(0)) {
            revert ZeroAddress();
        }
        if (_totalAmount == 0) revert InvalidAmount();
        if (_milestoneAmounts.length == 0) revert InvalidAmount();
        
        projectAddress = _project;
        kolAddress = _kol;
        token = _token;
        totalAmount = _totalAmount;
        admin = msg.sender;
        
        for (uint256 i = 0; i < _verifiers.length; i++) {
            if (_verifiers[i] == address(0)) revert ZeroAddress();
            verifiers.push(_verifiers[i]);
            isVerifier[_verifiers[i]] = true;
        }
        
        verificationThreshold = _verificationThreshold;
        
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            if (_milestoneAmounts[i] == 0) revert InvalidAmount();
            // REMOVED DATE VALIDATION - Dates are now optional/ignored
            // if (_releaseDates[i] <= block.timestamp) revert InvalidReleaseDate();
            
            Milestone storage milestone = milestones.push();
            milestone.amount = _milestoneAmounts[i];
            milestone.releaseDate = _releaseDates[i]; // Keep for compatibility but ignore
            milestone.released = false;
            milestone.verified = false;
        }
    }

    function release(uint256 milestoneId) external onlyProjectOrAdmin noActiveDispute nonReentrant {
        if (milestoneId >= milestones.length) revert InvalidMilestoneId();
        
        Milestone storage milestone = milestones[milestoneId];
        
        if (milestone.released) revert MilestoneAlreadyReleased();
        
        // REMOVED DATE CHECK - Now relies only on admin/project approval
        // if (block.timestamp < milestone.releaseDate) revert MilestoneNotReady();
        
        if (verifiers.length > 0 && !milestone.verified) {
            revert MilestoneNotVerified();
        }
        
        if (oracleAddress != address(0) && !checkOracleCondition()) {
            revert MilestoneNotReady();
        }
        
        milestone.released = true;
        releasedAmount += milestone.amount;
        
        // Automatically transfer funds to KOL
        IERC20(token).safeTransfer(kolAddress, milestone.amount);
        claimedAmount += milestone.amount;
        
        emit MilestoneReleased(milestoneId, milestone.amount, block.timestamp);
        emit PaymentClaimed(kolAddress, milestone.amount);
    }

    function verifyMilestone(uint256 milestoneId) external onlyVerifier {
        if (milestoneId >= milestones.length) revert InvalidMilestoneId();
        
        Milestone storage milestone = milestones[milestoneId];
        
        if (milestone.released) revert MilestoneAlreadyReleased();
        if (milestone.verifierApprovals[msg.sender]) revert InvalidMilestoneId();
        
        milestone.verifierApprovals[msg.sender] = true;
        
        uint256 approvalCount = 0;
        for (uint256 i = 0; i < verifiers.length; i++) {
            if (milestone.verifierApprovals[verifiers[i]]) {
                approvalCount++;
            }
        }
        
        if (approvalCount >= verificationThreshold) {
            milestone.verified = true;
        }
        
        emit MilestoneVerified(milestoneId, msg.sender);
    }

    // DEPRECATED: Claim is no longer needed - funds are automatically transferred on release
    function claim() external onlyKOL noActiveDispute nonReentrant {
        // This function is kept for backwards compatibility but will always revert
        // since funds are now automatically transferred on release
        revert InsufficientClaimableAmount();
    }

    function clawback() external onlyAdmin nonReentrant {
        uint256 remainingAmount = IERC20(token).balanceOf(address(this));
        if (remainingAmount == 0) revert InvalidAmount();
        
        // Admin can clawback unreleased funds at any time
        for (uint256 i = 0; i < milestones.length; i++) {
            if (!milestones[i].released) {
                milestones[i].released = true;
            }
        }
        
        uint256 unreleasedAmount = totalAmount - releasedAmount;
        if (unreleasedAmount > remainingAmount) {
            unreleasedAmount = remainingAmount;
        }
        
        if (unreleasedAmount > 0) {
            IERC20(token).safeTransfer(projectAddress, unreleasedAmount);
            emit EmergencyClawback(admin, unreleasedAmount);
        }
    }

    function raiseDispute(string calldata reason) external {
        if (msg.sender != projectAddress && msg.sender != kolAddress) {
            revert NotProjectOwner();
        }
        if (disputeActive) revert DisputeActive();
        if (bytes(reason).length == 0) revert InvalidAmount();
        
        disputeActive = true;
        disputeRaiser = msg.sender;
        disputeReason = reason;
        
        emit DisputeRaised(msg.sender, reason);
    }

    function resolveDispute(bool inFavorOfKOL) external onlyAdmin {
        if (!disputeActive) revert InvalidMilestoneId();
        
        disputeActive = false;
        
        if (inFavorOfKOL) {
            for (uint256 i = 0; i < milestones.length; i++) {
                if (!milestones[i].released && block.timestamp >= milestones[i].releaseDate) {
                    milestones[i].released = true;
                    milestones[i].verified = true;
                    releasedAmount += milestones[i].amount;
                }
            }
        } else {
            uint256 remainingAmount = IERC20(token).balanceOf(address(this));
            if (remainingAmount > 0) {
                IERC20(token).safeTransfer(projectAddress, remainingAmount);
            }
        }
        
        emit DisputeResolved(admin, inFavorOfKOL);
    }

    function setOracle(address _oracle, uint256 _threshold) external onlyAdmin {
        oracleAddress = _oracle;
        priceThreshold = _threshold;
    }

    function checkOracleCondition() internal view returns (bool) {
        if (oracleAddress == address(0)) return true;
        
        try AggregatorV3Interface(oracleAddress).latestRoundData() returns (
            uint80,
            int256 price,
            uint256,
            uint256,
            uint80
        ) {
            return uint256(price) >= priceThreshold;
        } catch {
            return false;
        }
    }

    function getMilestone(uint256 milestoneId) external view returns (
        uint256 amount,
        uint256 releaseDate,
        bool released,
        bool verified
    ) {
        if (milestoneId >= milestones.length) revert InvalidMilestoneId();
        
        Milestone storage milestone = milestones[milestoneId];
        return (
            milestone.amount,
            milestone.releaseDate,
            milestone.released,
            milestone.verified
        );
    }

    function getClaimableAmount() public view returns (uint256) {
        // Always return 0 since funds are automatically transferred on release
        return 0;
    }

    function getMilestoneCount() external view returns (uint256) {
        return milestones.length;
    }

    function getVerifierApproval(uint256 milestoneId, address verifier) external view returns (bool) {
        if (milestoneId >= milestones.length) revert InvalidMilestoneId();
        return milestones[milestoneId].verifierApprovals[verifier];
    }

    function getVerifierCount() external view returns (uint256) {
        return verifiers.length;
    }
}