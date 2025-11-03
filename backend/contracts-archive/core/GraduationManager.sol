// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "../interfaces/INonfungiblePositionManager.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IGraduationManager.sol";
import "../interfaces/IBondingCurve.sol";
import "../interfaces/ITokenFactory.sol";
import "./ConstantProductCurve.sol";

contract GraduationManager is IGraduationManager, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct GraduationInfo {
        bool graduated;
        address lpToken;
        uint256 graduatedAt;
        uint256 ethLiquidity;
        uint256 tokenLiquidity;
        uint256 tokenId;
        uint128 liquidity;
    }

    IUniswapV3Factory public immutable uniswapV3Factory;
    INonfungiblePositionManager public immutable positionManager;
    address public immutable WETH;
    uint24 public constant POOL_FEE = 3000;
    int24 public constant MIN_TICK = -887220;
    int24 public constant MAX_TICK = 887220;
    int24 public constant TICK_SPACING = 60;

    address public tokenFactory;
    address public bondingCurve;
    
    mapping(address => GraduationInfo) public graduationInfo;

    event TokenGraduated(
        address indexed token,
        address indexed pool,
        uint256 tokenId,
        uint256 ethLiquidity,
        uint256 tokenLiquidity,
        uint128 liquidity
    );

    event FactoryUpdated(address indexed oldFactory, address indexed newFactory);
    event BondingCurveUpdated(address indexed oldCurve, address indexed newCurve);

    modifier onlyBondingCurve() {
        require(msg.sender == bondingCurve, "Only bonding curve");
        _;
    }

    modifier onlyValidToken(address token) {
        require(ITokenFactory(tokenFactory).isValidToken(token), "Invalid token");
        _;
    }

    constructor(
        address _uniswapV3Factory,
        address _positionManager,
        address _weth
    ) {
        require(_uniswapV3Factory != address(0), "Invalid factory");
        require(_positionManager != address(0), "Invalid position manager");
        require(_weth != address(0), "Invalid WETH");
        
        uniswapV3Factory = IUniswapV3Factory(_uniswapV3Factory);
        positionManager = INonfungiblePositionManager(_positionManager);
        WETH = _weth;
    }

    function setTokenFactory(address _tokenFactory) external onlyOwner {
        require(_tokenFactory != address(0), "Invalid token factory");
        address oldFactory = tokenFactory;
        tokenFactory = _tokenFactory;
        emit FactoryUpdated(oldFactory, _tokenFactory);
    }

    function setBondingCurve(address _bondingCurve) external onlyOwner {
        require(_bondingCurve != address(0), "Invalid bonding curve");
        address oldCurve = bondingCurve;
        bondingCurve = _bondingCurve;
        emit BondingCurveUpdated(oldCurve, _bondingCurve);
    }

    function graduateToken(
        address token
    ) external override onlyBondingCurve onlyValidToken(token) nonReentrant returns (address pool) {
        require(!graduationInfo[token].graduated, "Already graduated");
        require(IBondingCurve(bondingCurve).shouldGraduate(token), "Not ready to graduate");

        (
            ,
            ,
            uint256 realEthReserve,
            
        ) = IBondingCurve(bondingCurve).getReserves(token);
        
        uint256 tokenLiquidity = IBondingCurve(bondingCurve).getDexReserve(token);
        
        require(realEthReserve > 0, "No ETH liquidity");
        require(tokenLiquidity > 0, "No token liquidity");

        address token0 = token < WETH ? token : WETH;
        address token1 = token < WETH ? WETH : token;
        
        pool = uniswapV3Factory.getPool(token0, token1, POOL_FEE);
        if (pool == address(0)) {
            pool = uniswapV3Factory.createPool(token0, token1, POOL_FEE);
            IUniswapV3Pool(pool).initialize(encodePriceSqrt(realEthReserve, tokenLiquidity));
        }

        IERC20(token).safeTransferFrom(bondingCurve, address(this), tokenLiquidity);
        
        IERC20(token).safeApprove(address(positionManager), tokenLiquidity);
        IERC20(WETH).safeApprove(address(positionManager), realEthReserve);

        (address tokenA, address tokenB) = token < WETH ? (token, WETH) : (WETH, token);
        (uint256 amount0Desired, uint256 amount1Desired) = tokenA == token ? 
            (tokenLiquidity, realEthReserve) : (realEthReserve, tokenLiquidity);

        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0: tokenA,
            token1: tokenB,
            fee: POOL_FEE,
            tickLower: MIN_TICK,
            tickUpper: MAX_TICK,
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: 0,
            amount1Min: 0,
            recipient: address(this),
            deadline: block.timestamp
        });

        (uint256 tokenId, uint128 liquidity, , ) = positionManager.mint{value: realEthReserve}(params);

        positionManager.burn(tokenId);

        graduationInfo[token] = GraduationInfo({
            graduated: true,
            lpToken: pool,
            graduatedAt: block.timestamp,
            ethLiquidity: realEthReserve,
            tokenLiquidity: tokenLiquidity,
            tokenId: tokenId,
            liquidity: liquidity
        });

        IBondingCurve(bondingCurve).markAsGraduated(token, pool);

        emit TokenGraduated(token, pool, tokenId, realEthReserve, tokenLiquidity, liquidity);
        
        return pool;
    }

    function isGraduated(address token) external view override returns (bool) {
        return graduationInfo[token].graduated;
    }

    function getGraduationInfo(
        address token
    ) external view override returns (
        bool graduated,
        address lpToken,
        uint256 graduatedAt,
        uint256 ethLiquidity,
        uint256 tokenLiquidity
    ) {
        GraduationInfo memory info = graduationInfo[token];
        return (
            info.graduated,
            info.lpToken,
            info.graduatedAt,
            info.ethLiquidity,
            info.tokenLiquidity
        );
    }

    function encodePriceSqrt(
        uint256 reserve0,
        uint256 reserve1
    ) private pure returns (uint160) {
        return uint160(sqrt((reserve1 * 2**192) / reserve0));
    }

    function sqrt(uint256 x) private pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    receive() external payable {}
}