// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract LiquidityLocker is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct LockInfo {
        address owner;
        address token;
        uint256 amount;
        uint256 lockTime;
        uint256 unlockTime;
        bool isLPToken;
        bool withdrawn;
    }

    struct NFTLockInfo {
        address owner;
        address nftContract;
        uint256 tokenId;
        uint256 lockTime;
        uint256 unlockTime;
        bool withdrawn;
    }

    uint256 public lockIdCounter;
    uint256 public nftLockIdCounter;
    uint256 public constant MIN_LOCK_DURATION = 7 days;
    uint256 public constant MAX_LOCK_DURATION = 1095 days;
    uint256 public lockFee = 0.001 ether;
    
    mapping(uint256 => LockInfo) public locks;
    mapping(uint256 => NFTLockInfo) public nftLocks;
    mapping(address => uint256[]) public userLocks;
    mapping(address => uint256[]) public userNFTLocks;
    mapping(address => uint256) public totalLocked;

    event TokensLocked(
        uint256 indexed lockId,
        address indexed owner,
        address indexed token,
        uint256 amount,
        uint256 unlockTime
    );

    event NFTLocked(
        uint256 indexed lockId,
        address indexed owner,
        address indexed nftContract,
        uint256 tokenId,
        uint256 unlockTime
    );

    event TokensUnlocked(
        uint256 indexed lockId,
        address indexed owner,
        address indexed token,
        uint256 amount
    );

    event NFTUnlocked(
        uint256 indexed lockId,
        address indexed owner,
        address indexed nftContract,
        uint256 tokenId
    );

    event LockExtended(
        uint256 indexed lockId,
        uint256 newUnlockTime
    );

    event FeeUpdated(
        uint256 oldFee,
        uint256 newFee
    );

    modifier validLockDuration(uint256 duration) {
        require(duration >= MIN_LOCK_DURATION, "Lock duration too short");
        require(duration <= MAX_LOCK_DURATION, "Lock duration too long");
        _;
    }

    constructor() {}

    function lockTokens(
        address token,
        uint256 amount,
        uint256 duration,
        bool isLPToken
    ) external payable nonReentrant validLockDuration(duration) returns (uint256 lockId) {
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");
        require(msg.value >= lockFee, "Insufficient fee");

        lockId = ++lockIdCounter;
        
        locks[lockId] = LockInfo({
            owner: msg.sender,
            token: token,
            amount: amount,
            lockTime: block.timestamp,
            unlockTime: block.timestamp + duration,
            isLPToken: isLPToken,
            withdrawn: false
        });

        userLocks[msg.sender].push(lockId);
        totalLocked[token] += amount;

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        if (msg.value > lockFee) {
            (bool success, ) = msg.sender.call{value: msg.value - lockFee}("");
            require(success, "ETH refund failed");
        }

        emit TokensLocked(lockId, msg.sender, token, amount, locks[lockId].unlockTime);
    }

    function lockNFT(
        address nftContract,
        uint256 tokenId,
        uint256 duration
    ) external payable nonReentrant validLockDuration(duration) returns (uint256 lockId) {
        require(nftContract != address(0), "Invalid NFT contract");
        require(msg.value >= lockFee, "Insufficient fee");

        lockId = ++nftLockIdCounter;
        
        nftLocks[lockId] = NFTLockInfo({
            owner: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            lockTime: block.timestamp,
            unlockTime: block.timestamp + duration,
            withdrawn: false
        });

        userNFTLocks[msg.sender].push(lockId);

        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        if (msg.value > lockFee) {
            (bool success, ) = msg.sender.call{value: msg.value - lockFee}("");
            require(success, "ETH refund failed");
        }

        emit NFTLocked(lockId, msg.sender, nftContract, tokenId, nftLocks[lockId].unlockTime);
    }

    function unlockTokens(uint256 lockId) external nonReentrant {
        LockInfo storage lock = locks[lockId];
        require(lock.owner == msg.sender, "Not lock owner");
        require(!lock.withdrawn, "Already withdrawn");
        require(block.timestamp >= lock.unlockTime, "Lock period not ended");

        lock.withdrawn = true;
        totalLocked[lock.token] -= lock.amount;

        IERC20(lock.token).safeTransfer(msg.sender, lock.amount);

        emit TokensUnlocked(lockId, msg.sender, lock.token, lock.amount);
    }

    function unlockNFT(uint256 lockId) external nonReentrant {
        NFTLockInfo storage lock = nftLocks[lockId];
        require(lock.owner == msg.sender, "Not lock owner");
        require(!lock.withdrawn, "Already withdrawn");
        require(block.timestamp >= lock.unlockTime, "Lock period not ended");

        lock.withdrawn = true;

        IERC721(lock.nftContract).transferFrom(address(this), msg.sender, lock.tokenId);

        emit NFTUnlocked(lockId, msg.sender, lock.nftContract, lock.tokenId);
    }

    function extendLock(uint256 lockId, uint256 additionalDuration) external nonReentrant {
        LockInfo storage lock = locks[lockId];
        require(lock.owner == msg.sender, "Not lock owner");
        require(!lock.withdrawn, "Already withdrawn");
        require(additionalDuration > 0, "Invalid duration");
        
        uint256 newUnlockTime = lock.unlockTime + additionalDuration;
        uint256 totalDuration = newUnlockTime - lock.lockTime;
        
        require(totalDuration <= MAX_LOCK_DURATION, "Total duration exceeds maximum");
        
        lock.unlockTime = newUnlockTime;

        emit LockExtended(lockId, newUnlockTime);
    }

    function getUserLocks(address user) external view returns (uint256[] memory) {
        return userLocks[user];
    }

    function getUserNFTLocks(address user) external view returns (uint256[] memory) {
        return userNFTLocks[user];
    }

    function getLockInfo(uint256 lockId) external view returns (
        address owner,
        address token,
        uint256 amount,
        uint256 lockTime,
        uint256 unlockTime,
        bool isLPToken,
        bool withdrawn
    ) {
        LockInfo memory lock = locks[lockId];
        return (
            lock.owner,
            lock.token,
            lock.amount,
            lock.lockTime,
            lock.unlockTime,
            lock.isLPToken,
            lock.withdrawn
        );
    }

    function getNFTLockInfo(uint256 lockId) external view returns (
        address owner,
        address nftContract,
        uint256 tokenId,
        uint256 lockTime,
        uint256 unlockTime,
        bool withdrawn
    ) {
        NFTLockInfo memory lock = nftLocks[lockId];
        return (
            lock.owner,
            lock.nftContract,
            lock.tokenId,
            lock.lockTime,
            lock.unlockTime,
            lock.withdrawn
        );
    }

    function setLockFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = lockFee;
        lockFee = newFee;
        emit FeeUpdated(oldFee, newFee);
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Fee withdrawal failed");
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    receive() external payable {}
}