// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

abstract contract BondingCurveBase is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    struct TokenInfo {
        uint256 virtualEthReserve;
        uint256 virtualTokenReserve;
        uint256 realEthReserve;
        uint256 realTokenReserve;
        uint256 totalSupply;
        uint256 bondingCurveSupply;
        uint256 dexReserve;
        address creator;
        uint256 creatorFees;
        uint256 platformFees;
        bool graduated;
        uint256 createdAt;
        uint256 graduatedAt;
        address lpToken;
    }

    uint256 public constant INITIAL_VIRTUAL_ETH_RESERVE = 1 ether;
    uint256 public constant INITIAL_VIRTUAL_TOKEN_RESERVE = 1_000_000 * 10**18;
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;
    uint256 public constant BONDING_CURVE_PERCENTAGE = 80;
    uint256 public constant DEX_PERCENTAGE = 20;
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 1;
    uint256 public constant CREATOR_FEE_PERCENTAGE = 1;
    uint256 public constant MAX_FEE_PERCENTAGE = 3;
    uint256 public constant GRADUATION_THRESHOLD = 69_000 * 10**18;
    uint256 public constant FEE_DENOMINATOR = 100;

    mapping(address => TokenInfo) public tokenInfo;
    mapping(address => mapping(address => uint256)) public userTokenBalances;

    address public graduationManager;
    address public feeRecipient;
    uint256 public totalPlatformFees;

    event TokenCreated(
        address indexed token,
        address indexed creator,
        uint256 bondingCurveSupply,
        uint256 dexReserve
    );

    event TokensBought(
        address indexed token,
        address indexed buyer,
        uint256 ethAmount,
        uint256 tokenAmount,
        uint256 platformFee,
        uint256 creatorFee
    );

    event TokensSold(
        address indexed token,
        address indexed seller,
        uint256 tokenAmount,
        uint256 ethAmount,
        uint256 platformFee,
        uint256 creatorFee
    );

    event TokenGraduated(
        address indexed token,
        address indexed lpToken,
        uint256 ethLiquidity,
        uint256 tokenLiquidity
    );

    event CreatorFeeClaimed(
        address indexed token,
        address indexed creator,
        uint256 amount
    );

    event PlatformFeeClaimed(
        address indexed recipient,
        uint256 amount
    );

    modifier onlyGraduationManager() {
        require(msg.sender == graduationManager, "Only graduation manager");
        _;
    }

    modifier tokenExists(address token) {
        require(tokenInfo[token].createdAt > 0, "Token does not exist");
        _;
    }

    modifier notGraduated(address token) {
        require(!tokenInfo[token].graduated, "Token already graduated");
        _;
    }

    constructor(address _feeRecipient) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    function setGraduationManager(address _graduationManager) external onlyOwner {
        require(_graduationManager != address(0), "Invalid graduation manager");
        graduationManager = _graduationManager;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    function initializeToken(
        address token,
        address creator
    ) external returns (bool) {
        require(tokenInfo[token].createdAt == 0, "Token already initialized");
        require(token != address(0), "Invalid token address");
        require(creator != address(0), "Invalid creator address");

        uint256 bondingCurveSupply = (TOTAL_SUPPLY * BONDING_CURVE_PERCENTAGE) / 100;
        uint256 dexReserve = (TOTAL_SUPPLY * DEX_PERCENTAGE) / 100;

        tokenInfo[token] = TokenInfo({
            virtualEthReserve: INITIAL_VIRTUAL_ETH_RESERVE,
            virtualTokenReserve: INITIAL_VIRTUAL_TOKEN_RESERVE,
            realEthReserve: 0,
            realTokenReserve: bondingCurveSupply,
            totalSupply: TOTAL_SUPPLY,
            bondingCurveSupply: bondingCurveSupply,
            dexReserve: dexReserve,
            creator: creator,
            creatorFees: 0,
            platformFees: 0,
            graduated: false,
            createdAt: block.timestamp,
            graduatedAt: 0,
            lpToken: address(0)
        });

        emit TokenCreated(token, creator, bondingCurveSupply, dexReserve);
        return true;
    }

    function buyTokens(
        address token,
        uint256 minTokensOut
    ) external payable nonReentrant whenNotPaused tokenExists(token) notGraduated(token) {
        require(msg.value > 0, "No ETH sent");

        uint256 platformFee = (msg.value * PLATFORM_FEE_PERCENTAGE) / FEE_DENOMINATOR;
        uint256 creatorFee = (msg.value * CREATOR_FEE_PERCENTAGE) / FEE_DENOMINATOR;
        uint256 ethAmountAfterFees = msg.value - platformFee - creatorFee;

        uint256 tokensOut = calculateTokensOut(token, ethAmountAfterFees);
        require(tokensOut >= minTokensOut, "Slippage exceeded");
        require(tokensOut <= tokenInfo[token].realTokenReserve, "Insufficient token reserve");

        tokenInfo[token].realEthReserve += ethAmountAfterFees;
        tokenInfo[token].realTokenReserve -= tokensOut;
        tokenInfo[token].virtualEthReserve += ethAmountAfterFees;
        tokenInfo[token].virtualTokenReserve -= tokensOut;
        tokenInfo[token].platformFees += platformFee;
        tokenInfo[token].creatorFees += creatorFee;
        totalPlatformFees += platformFee;

        userTokenBalances[token][msg.sender] += tokensOut;

        IERC20(token).safeTransfer(msg.sender, tokensOut);

        emit TokensBought(token, msg.sender, msg.value, tokensOut, platformFee, creatorFee);

        if (shouldGraduate(token)) {
            _triggerGraduation(token);
        }
    }

    function sellTokens(
        address token,
        uint256 tokenAmount,
        uint256 minEthOut
    ) external nonReentrant whenNotPaused tokenExists(token) notGraduated(token) {
        require(tokenAmount > 0, "Invalid token amount");
        require(userTokenBalances[token][msg.sender] >= tokenAmount, "Insufficient balance");

        uint256 ethOut = calculateEthOut(token, tokenAmount);
        uint256 platformFee = (ethOut * PLATFORM_FEE_PERCENTAGE) / FEE_DENOMINATOR;
        uint256 creatorFee = (ethOut * CREATOR_FEE_PERCENTAGE) / FEE_DENOMINATOR;
        uint256 ethAmountAfterFees = ethOut - platformFee - creatorFee;

        require(ethAmountAfterFees >= minEthOut, "Slippage exceeded");
        require(ethOut <= tokenInfo[token].realEthReserve, "Insufficient ETH reserve");

        tokenInfo[token].realEthReserve -= ethOut;
        tokenInfo[token].realTokenReserve += tokenAmount;
        tokenInfo[token].virtualEthReserve -= ethOut;
        tokenInfo[token].virtualTokenReserve += tokenAmount;
        tokenInfo[token].platformFees += platformFee;
        tokenInfo[token].creatorFees += creatorFee;
        totalPlatformFees += platformFee;

        userTokenBalances[token][msg.sender] -= tokenAmount;

        IERC20(token).safeTransferFrom(msg.sender, address(this), tokenAmount);

        (bool success, ) = msg.sender.call{value: ethAmountAfterFees}("");
        require(success, "ETH transfer failed");

        emit TokensSold(token, msg.sender, tokenAmount, ethOut, platformFee, creatorFee);
    }

    function claimCreatorFees(address token) external nonReentrant tokenExists(token) {
        require(msg.sender == tokenInfo[token].creator, "Not token creator");
        uint256 fees = tokenInfo[token].creatorFees;
        require(fees > 0, "No fees to claim");

        tokenInfo[token].creatorFees = 0;

        (bool success, ) = msg.sender.call{value: fees}("");
        require(success, "ETH transfer failed");

        emit CreatorFeeClaimed(token, msg.sender, fees);
    }

    function claimPlatformFees() external nonReentrant {
        require(msg.sender == feeRecipient, "Not fee recipient");
        uint256 fees = totalPlatformFees;
        require(fees > 0, "No fees to claim");

        totalPlatformFees = 0;

        (bool success, ) = feeRecipient.call{value: fees}("");
        require(success, "ETH transfer failed");

        emit PlatformFeeClaimed(feeRecipient, fees);
    }

    function shouldGraduate(address token) public view returns (bool) {
        uint256 marketCap = getMarketCap(token);
        return marketCap >= GRADUATION_THRESHOLD && !tokenInfo[token].graduated;
    }

    function getMarketCap(address token) public view returns (uint256) {
        if (tokenInfo[token].virtualTokenReserve == 0) return 0;
        
        uint256 pricePerToken = (tokenInfo[token].virtualEthReserve * 10**18) / 
                               tokenInfo[token].virtualTokenReserve;
        return (pricePerToken * TOTAL_SUPPLY) / 10**18;
    }

    function markAsGraduated(
        address token,
        address lpToken
    ) external onlyGraduationManager tokenExists(token) notGraduated(token) {
        tokenInfo[token].graduated = true;
        tokenInfo[token].graduatedAt = block.timestamp;
        tokenInfo[token].lpToken = lpToken;

        emit TokenGraduated(
            token,
            lpToken,
            tokenInfo[token].realEthReserve,
            tokenInfo[token].dexReserve
        );
    }

    function _triggerGraduation(address token) internal {
        if (graduationManager != address(0)) {
            (bool success, ) = graduationManager.call(
                abi.encodeWithSignature("graduateToken(address)", token)
            );
            if (!success) {
                revert("Graduation failed");
            }
        }
    }

    function calculateTokensOut(address token, uint256 ethIn) public view virtual returns (uint256);
    function calculateEthOut(address token, uint256 tokensIn) public view virtual returns (uint256);

    function getReserves(address token) public view virtual returns (
        uint256 virtualEthReserve,
        uint256 virtualTokenReserve,
        uint256 realEthReserve,
        uint256 realTokenReserve
    ) {
        TokenInfo memory info = tokenInfo[token];
        return (
            info.virtualEthReserve,
            info.virtualTokenReserve,
            info.realEthReserve,
            info.realTokenReserve
        );
    }

    function getDexReserve(address token) public view returns (uint256) {
        return tokenInfo[token].dexReserve;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    receive() external payable {}
}