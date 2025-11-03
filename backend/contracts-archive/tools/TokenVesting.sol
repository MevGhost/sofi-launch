// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TokenVesting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct VestingSchedule {
        address beneficiary;
        address token;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 vestingDuration;
        bool revocable;
        bool revoked;
    }

    uint256 public vestingScheduleCount;
    mapping(uint256 => VestingSchedule) public vestingSchedules;
    mapping(address => uint256[]) public beneficiarySchedules;
    mapping(address => mapping(address => uint256)) public totalVestedAmount;
    
    uint256 public constant MIN_VESTING_DURATION = 1 days;
    uint256 public constant MAX_VESTING_DURATION = 1095 days;

    event VestingScheduleCreated(
        uint256 indexed scheduleId,
        address indexed beneficiary,
        address indexed token,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool revocable
    );

    event TokensReleased(
        uint256 indexed scheduleId,
        address indexed beneficiary,
        address indexed token,
        uint256 amount
    );

    event VestingRevoked(
        uint256 indexed scheduleId,
        address indexed beneficiary,
        address indexed token,
        uint256 refundAmount
    );

    modifier onlyBeneficiary(uint256 scheduleId) {
        require(
            msg.sender == vestingSchedules[scheduleId].beneficiary,
            "Not beneficiary"
        );
        _;
    }

    modifier scheduleExists(uint256 scheduleId) {
        require(
            vestingSchedules[scheduleId].beneficiary != address(0),
            "Schedule does not exist"
        );
        _;
    }

    constructor() {}

    function createVestingSchedule(
        address beneficiary,
        address token,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool revocable
    ) external nonReentrant returns (uint256 scheduleId) {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(token != address(0), "Invalid token");
        require(totalAmount > 0, "Amount must be greater than 0");
        require(vestingDuration >= MIN_VESTING_DURATION, "Vesting duration too short");
        require(vestingDuration <= MAX_VESTING_DURATION, "Vesting duration too long");
        require(cliffDuration <= vestingDuration, "Cliff longer than vesting");
        
        if (startTime == 0) {
            startTime = block.timestamp;
        } else {
            require(startTime >= block.timestamp, "Start time in the past");
        }

        scheduleId = ++vestingScheduleCount;

        vestingSchedules[scheduleId] = VestingSchedule({
            beneficiary: beneficiary,
            token: token,
            totalAmount: totalAmount,
            releasedAmount: 0,
            startTime: startTime,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            revocable: revocable,
            revoked: false
        });

        beneficiarySchedules[beneficiary].push(scheduleId);
        totalVestedAmount[beneficiary][token] += totalAmount;

        IERC20(token).safeTransferFrom(msg.sender, address(this), totalAmount);

        emit VestingScheduleCreated(
            scheduleId,
            beneficiary,
            token,
            totalAmount,
            startTime,
            cliffDuration,
            vestingDuration,
            revocable
        );
    }

    function release(uint256 scheduleId) 
        external 
        nonReentrant 
        scheduleExists(scheduleId) 
        onlyBeneficiary(scheduleId) 
    {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        require(!schedule.revoked, "Vesting revoked");

        uint256 releasableAmount = getReleasableAmount(scheduleId);
        require(releasableAmount > 0, "No tokens to release");

        schedule.releasedAmount += releasableAmount;
        totalVestedAmount[schedule.beneficiary][schedule.token] -= releasableAmount;

        IERC20(schedule.token).safeTransfer(schedule.beneficiary, releasableAmount);

        emit TokensReleased(
            scheduleId,
            schedule.beneficiary,
            schedule.token,
            releasableAmount
        );
    }

    function revoke(uint256 scheduleId) 
        external 
        onlyOwner 
        nonReentrant 
        scheduleExists(scheduleId) 
    {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        require(schedule.revocable, "Vesting not revocable");
        require(!schedule.revoked, "Already revoked");

        uint256 vestedAmount = getVestedAmount(scheduleId);
        uint256 releasableAmount = vestedAmount - schedule.releasedAmount;
        uint256 refundAmount = schedule.totalAmount - vestedAmount;

        schedule.revoked = true;

        if (releasableAmount > 0) {
            schedule.releasedAmount += releasableAmount;
            totalVestedAmount[schedule.beneficiary][schedule.token] -= releasableAmount;
            IERC20(schedule.token).safeTransfer(schedule.beneficiary, releasableAmount);
        }

        if (refundAmount > 0) {
            totalVestedAmount[schedule.beneficiary][schedule.token] -= refundAmount;
            IERC20(schedule.token).safeTransfer(owner(), refundAmount);
        }

        emit VestingRevoked(
            scheduleId,
            schedule.beneficiary,
            schedule.token,
            refundAmount
        );
    }

    function getVestedAmount(uint256 scheduleId) public view scheduleExists(scheduleId) returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[scheduleId];
        
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return 0;
        }

        if (block.timestamp >= schedule.startTime + schedule.vestingDuration || schedule.revoked) {
            return schedule.totalAmount;
        }

        uint256 timeElapsed = block.timestamp - schedule.startTime;
        return (schedule.totalAmount * timeElapsed) / schedule.vestingDuration;
    }

    function getReleasableAmount(uint256 scheduleId) public view scheduleExists(scheduleId) returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[scheduleId];
        
        if (schedule.revoked) {
            return 0;
        }

        return getVestedAmount(scheduleId) - schedule.releasedAmount;
    }

    function getBeneficiarySchedules(address beneficiary) external view returns (uint256[] memory) {
        return beneficiarySchedules[beneficiary];
    }

    function getScheduleInfo(uint256 scheduleId) external view scheduleExists(scheduleId) returns (
        address beneficiary,
        address token,
        uint256 totalAmount,
        uint256 releasedAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool revocable,
        bool revoked
    ) {
        VestingSchedule memory schedule = vestingSchedules[scheduleId];
        return (
            schedule.beneficiary,
            schedule.token,
            schedule.totalAmount,
            schedule.releasedAmount,
            schedule.startTime,
            schedule.cliffDuration,
            schedule.vestingDuration,
            schedule.revocable,
            schedule.revoked
        );
    }

    function createMultipleVestingSchedules(
        address[] calldata beneficiaries,
        address token,
        uint256[] calldata amounts,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool revocable
    ) external nonReentrant returns (uint256[] memory scheduleIds) {
        require(beneficiaries.length == amounts.length, "Arrays length mismatch");
        require(beneficiaries.length > 0, "Empty arrays");

        scheduleIds = new uint256[](beneficiaries.length);
        uint256 totalAmount;

        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        IERC20(token).safeTransferFrom(msg.sender, address(this), totalAmount);

        for (uint256 i = 0; i < beneficiaries.length; i++) {
            scheduleIds[i] = _createVestingScheduleInternal(
                beneficiaries[i],
                token,
                amounts[i],
                startTime,
                cliffDuration,
                vestingDuration,
                revocable
            );
        }
    }

    function _createVestingScheduleInternal(
        address beneficiary,
        address token,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool revocable
    ) private returns (uint256 scheduleId) {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(totalAmount > 0, "Amount must be greater than 0");

        if (startTime == 0) {
            startTime = block.timestamp;
        }

        scheduleId = ++vestingScheduleCount;

        vestingSchedules[scheduleId] = VestingSchedule({
            beneficiary: beneficiary,
            token: token,
            totalAmount: totalAmount,
            releasedAmount: 0,
            startTime: startTime,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            revocable: revocable,
            revoked: false
        });

        beneficiarySchedules[beneficiary].push(scheduleId);
        totalVestedAmount[beneficiary][token] += totalAmount;

        emit VestingScheduleCreated(
            scheduleId,
            beneficiary,
            token,
            totalAmount,
            startTime,
            cliffDuration,
            vestingDuration,
            revocable
        );
    }
}