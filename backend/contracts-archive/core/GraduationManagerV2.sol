// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "../interfaces/INonfungiblePositionManager.sol";
import "../interfaces/ISwapRouter.sol";
import "../interfaces/IBondingCurveV2.sol";
import "../interfaces/ITokenFactoryV2.sol";
import "../interfaces/AggregatorV3Interface.sol";
import "../libraries/TickMath.sol";

/**
 * @title GraduationManagerV2
 * @notice Handles the critical transition from bonding curve to Uniswap V3
 * @dev Automatically triggered at $69,000 market cap with comprehensive safety mechanisms
 */
contract GraduationManagerV2 is Ownable, ReentrancyGuard, Pausable, IERC721Receiver {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant GRADUATION_THRESHOLD = 69_000 * 10**18; // $69k in USD (18 decimals)
    uint256 public constant MIN_LIQUIDITY_USD = 50_000 * 10**18; // $50k minimum
    uint256 public constant DEX_RESERVE_AMOUNT = 200_000_000 * 10**18; // 200M tokens
    uint24 public constant POOL_FEE = 3000; // 0.3% fee tier
    int24 public constant TICK_SPACING = 60; // For 0.3% pools
    uint256 public constant PRICE_RANGE_PERCENTAGE = 50; // ±50% from current price
    uint256 public constant SQRT_PRICE_PRECISION = 2**96;
    
    // State variables
    IUniswapV3Factory public immutable uniswapFactory;
    INonfungiblePositionManager public immutable positionManager;
    ISwapRouter public immutable swapRouter;
    address public immutable WETH;
    
    address public bondingCurve;
    address public tokenFactory;
    address public ethUsdPriceFeed;
    
    // Graduation tracking
    struct GraduationInfo {
        address pool;
        uint256 tokenId;
        uint128 liquidity;
        uint256 ethAmount;
        uint256 tokenAmount;
        uint256 graduatedAt;
        uint160 sqrtPriceX96;
        int24 tickLower;
        int24 tickUpper;
        bool lpBurned;
    }
    
    mapping(address => GraduationInfo) public graduationInfo;
    mapping(address => bool) public isGraduated;
    
    // Events
    event GraduationInitiated(
        address indexed token,
        uint256 marketCap,
        uint256 ethReserve,
        uint256 tokenReserve
    );
    
    event PoolCreated(
        address indexed token,
        address indexed pool,
        uint160 sqrtPriceX96,
        int24 currentTick
    );
    
    event LiquidityAdded(
        address indexed token,
        uint256 tokenId,
        uint128 liquidity,
        uint256 ethAmount,
        uint256 tokenAmount,
        int24 tickLower,
        int24 tickUpper
    );
    
    event LPTokenBurned(
        address indexed token,
        uint256 tokenId,
        uint128 liquidity
    );
    
    event GraduationCompleted(
        address indexed token,
        address indexed pool,
        uint256 finalMarketCap
    );
    
    event GraduationFailed(
        address indexed token,
        string reason
    );
    
    event EmergencyWithdraw(
        address indexed token,
        uint256 ethAmount,
        uint256 tokenAmount
    );

    // Modifiers
    modifier onlyBondingCurve() {
        require(msg.sender == bondingCurve, "Only bonding curve");
        _;
    }
    
    modifier notGraduated(address token) {
        require(!isGraduated[token], "Already graduated");
        _;
    }

    constructor(
        address _uniswapFactory,
        address _positionManager,
        address _swapRouter,
        address _weth,
        address _ethUsdPriceFeed
    ) {
        require(_uniswapFactory != address(0), "Invalid factory");
        require(_positionManager != address(0), "Invalid position manager");
        require(_swapRouter != address(0), "Invalid swap router");
        require(_weth != address(0), "Invalid WETH");
        require(_ethUsdPriceFeed != address(0), "Invalid price feed");
        
        uniswapFactory = IUniswapV3Factory(_uniswapFactory);
        positionManager = INonfungiblePositionManager(_positionManager);
        swapRouter = ISwapRouter(_swapRouter);
        WETH = _weth;
        ethUsdPriceFeed = _ethUsdPriceFeed;
    }

    /**
     * @notice Graduate a token from bonding curve to Uniswap V3
     * @param token The token to graduate
     * @return pool The created Uniswap V3 pool address
     */
    function graduateToken(
        address token
    ) external nonReentrant whenNotPaused onlyBondingCurve notGraduated(token) returns (address pool) {
        // Verify graduation threshold
        uint256 marketCapUSD = IBondingCurveV2(bondingCurve).getMarketCap(token);
        require(marketCapUSD >= GRADUATION_THRESHOLD, "Below graduation threshold");
        
        emit GraduationInitiated(token, marketCapUSD, address(this).balance, DEX_RESERVE_AMOUNT);
        
        try this._executeGraduation(token) returns (address _pool) {
            pool = _pool;
            emit GraduationCompleted(token, pool, marketCapUSD);
        } catch Error(string memory reason) {
            emit GraduationFailed(token, reason);
            revert(reason);
        } catch {
            emit GraduationFailed(token, "Unknown error");
            revert("Graduation failed");
        }
        
        return pool;
    }

    /**
     * @notice Execute the graduation process (external for try/catch)
     * @param token The token to graduate
     * @return pool The created pool address
     */
    function _executeGraduation(address token) external returns (address pool) {
        require(msg.sender == address(this), "Internal only");
        
        // Get reserves from bonding curve
        IBondingCurveV2.TokenInfo memory tokenInfo = IBondingCurveV2(bondingCurve).tokenInfo(token);
        uint256 ethAmount = tokenInfo.realEthReserve;
        
        // Verify minimum liquidity
        uint256 ethPrice = getEthPriceUSD();
        uint256 liquidityValueUSD = (ethAmount * ethPrice) / 10**8; // Chainlink decimals
        require(liquidityValueUSD >= MIN_LIQUIDITY_USD, "Insufficient liquidity");
        
        // Transfer ETH from bonding curve
        IBondingCurveV2(bondingCurve).withdrawGraduationLiquidity(token);
        require(address(this).balance >= ethAmount, "ETH transfer failed");
        
        // Transfer DEX reserve tokens
        IERC20(token).safeTransferFrom(bondingCurve, address(this), DEX_RESERVE_AMOUNT);
        
        // Create or get pool
        pool = _createOrGetPool(token, ethAmount, DEX_RESERVE_AMOUNT);
        
        // Calculate optimal price range
        (int24 tickLower, int24 tickUpper, uint160 currentSqrtPrice) = _calculateOptimalRange(
            token,
            ethAmount,
            DEX_RESERVE_AMOUNT
        );
        
        // Add liquidity
        uint256 tokenId = _addLiquidity(
            token,
            pool,
            ethAmount,
            DEX_RESERVE_AMOUNT,
            tickLower,
            tickUpper
        );
        
        // Burn LP NFT
        _burnLPToken(tokenId);
        
        // Update graduation info
        graduationInfo[token] = GraduationInfo({
            pool: pool,
            tokenId: tokenId,
            liquidity: 0, // Will be set after minting
            ethAmount: ethAmount,
            tokenAmount: DEX_RESERVE_AMOUNT,
            graduatedAt: block.timestamp,
            sqrtPriceX96: currentSqrtPrice,
            tickLower: tickLower,
            tickUpper: tickUpper,
            lpBurned: true
        });
        
        isGraduated[token] = true;
        
        // Update bonding curve and factory
        IBondingCurveV2(bondingCurve).markAsGraduated(token, pool);
        ITokenFactoryV2(tokenFactory).updateTokenCategory(
            token,
            ITokenFactoryV2.TokenCategory.GRADUATED
        );
        
        return pool;
    }

    /**
     * @notice Create or get existing Uniswap V3 pool
     * @param token The token address
     * @param ethAmount ETH amount for price calculation
     * @param tokenAmount Token amount for price calculation
     * @return pool The pool address
     */
    function _createOrGetPool(
        address token,
        uint256 ethAmount,
        uint256 tokenAmount
    ) private returns (address pool) {
        // Order tokens
        address token0 = token < WETH ? token : WETH;
        address token1 = token < WETH ? WETH : token;
        
        // Check if pool exists
        pool = uniswapFactory.getPool(token0, token1, POOL_FEE);
        
        if (pool == address(0)) {
            // Calculate initial sqrt price
            uint160 sqrtPriceX96 = _calculateSqrtPriceX96(
                token,
                ethAmount,
                tokenAmount
            );
            
            // Create pool
            pool = uniswapFactory.createPool(token0, token1, POOL_FEE);
            IUniswapV3Pool(pool).initialize(sqrtPriceX96);
            
            (, int24 tick, , , , , ) = IUniswapV3Pool(pool).slot0();
            emit PoolCreated(token, pool, sqrtPriceX96, tick);
        }
        
        return pool;
    }

    /**
     * @notice Calculate optimal price range for liquidity
     * @param token The token address
     * @param ethAmount ETH amount
     * @param tokenAmount Token amount
     * @return tickLower Lower tick
     * @return tickUpper Upper tick
     * @return currentSqrtPrice Current sqrt price
     */
    function _calculateOptimalRange(
        address token,
        uint256 ethAmount,
        uint256 tokenAmount
    ) private view returns (int24 tickLower, int24 tickUpper, uint160 currentSqrtPrice) {
        // Calculate current price
        uint256 price = (ethAmount * 10**18) / tokenAmount;
        currentSqrtPrice = _calculateSqrtPriceX96(token, ethAmount, tokenAmount);
        
        // Calculate price range (±50%)
        uint256 lowerPrice = (price * (100 - PRICE_RANGE_PERCENTAGE)) / 100;
        uint256 upperPrice = (price * (100 + PRICE_RANGE_PERCENTAGE)) / 100;
        
        // Convert to ticks
        int24 currentTick = _priceToTick(currentSqrtPrice);
        int24 lowerTick = _priceToTick(_priceToSqrtPriceX96(lowerPrice, token < WETH));
        int24 upperTick = _priceToTick(_priceToSqrtPriceX96(upperPrice, token < WETH));
        
        // Round to tick spacing
        tickLower = (lowerTick / TICK_SPACING) * TICK_SPACING;
        tickUpper = (upperTick / TICK_SPACING) * TICK_SPACING;
        
        // Ensure valid range
        if (tickLower >= tickUpper) {
            tickLower = currentTick - TICK_SPACING * 100;
            tickUpper = currentTick + TICK_SPACING * 100;
        }
        
        return (tickLower, tickUpper, currentSqrtPrice);
    }

    /**
     * @notice Add liquidity to Uniswap V3 pool
     * @param token The token address
     * @param pool The pool address
     * @param ethAmount ETH amount to add
     * @param tokenAmount Token amount to add
     * @param tickLower Lower tick
     * @param tickUpper Upper tick
     * @return tokenId The minted position NFT ID
     */
    function _addLiquidity(
        address token,
        address pool,
        uint256 ethAmount,
        uint256 tokenAmount,
        int24 tickLower,
        int24 tickUpper
    ) private returns (uint256 tokenId) {
        // Wrap ETH
        (bool success, ) = WETH.call{value: ethAmount}("");
        require(success, "WETH wrap failed");
        
        // Approve position manager
        IERC20(WETH).safeApprove(address(positionManager), ethAmount);
        IERC20(token).safeApprove(address(positionManager), tokenAmount);
        
        // Order tokens
        address token0 = token < WETH ? token : WETH;
        address token1 = token < WETH ? WETH : token;
        uint256 amount0 = token0 == token ? tokenAmount : ethAmount;
        uint256 amount1 = token0 == token ? ethAmount : tokenAmount;
        
        // Mint position
        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0: token0,
            token1: token1,
            fee: POOL_FEE,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: amount0,
            amount1Desired: amount1,
            amount0Min: (amount0 * 95) / 100, // 5% slippage
            amount1Min: (amount1 * 95) / 100, // 5% slippage
            recipient: address(this),
            deadline: block.timestamp
        });
        
        uint256 lpTokenId;
        uint128 liquidity;
        uint256 amount0Used;
        uint256 amount1Used;
        (lpTokenId, liquidity, amount0Used, amount1Used) = positionManager.mint(params);
        
        // Update graduation info
        graduationInfo[token].liquidity = liquidity;
        
        emit LiquidityAdded(
            token,
            lpTokenId,
            liquidity,
            token0 == WETH ? amount0Used : amount1Used,
            token0 == token ? amount0Used : amount1Used,
            tickLower,
            tickUpper
        );
        
        // Refund unused tokens
        if (amount0 > amount0Used) {
            IERC20(token0).safeTransfer(bondingCurve, amount0 - amount0Used);
        }
        if (amount1 > amount1Used) {
            IERC20(token1).safeTransfer(bondingCurve, amount1 - amount1Used);
        }
        
        return lpTokenId;
    }

    /**
     * @notice Burn the LP NFT to prevent rug pulls
     * @param tokenId The NFT token ID to burn
     */
    function _burnLPToken(uint256 tokenId) private {
        // Burn the NFT
        positionManager.burn(tokenId);
        emit LPTokenBurned(address(0), tokenId, 0);
    }

    /**
     * @notice Calculate sqrt price for Uniswap V3
     * @param token The token address
     * @param ethAmount ETH amount
     * @param tokenAmount Token amount
     * @return sqrtPriceX96 The sqrt price in X96 format
     */
    function _calculateSqrtPriceX96(
        address token,
        uint256 ethAmount,
        uint256 tokenAmount
    ) private view returns (uint160) {
        // Price = ethAmount / tokenAmount
        // For Uniswap V3: sqrtPrice = sqrt(price) * 2^96
        
        if (token < WETH) {
            // token is token0
            // price = amount1 / amount0 = ethAmount / tokenAmount
            uint256 price = (ethAmount * 10**18) / tokenAmount;
            return uint160(_sqrt(price) * SQRT_PRICE_PRECISION / 10**9);
        } else {
            // WETH is token0
            // price = amount1 / amount0 = tokenAmount / ethAmount
            uint256 price = (tokenAmount * 10**18) / ethAmount;
            return uint160(_sqrt(price) * SQRT_PRICE_PRECISION / 10**9);
        }
    }

    /**
     * @notice Convert price to sqrt price X96
     * @param price The price with 18 decimals
     * @param isToken0 Whether token is token0
     * @return sqrtPriceX96 The sqrt price
     */
    function _priceToSqrtPriceX96(uint256 price, bool isToken0) private pure returns (uint160) {
        if (!isToken0) {
            // Invert price for token1
            price = (10**36) / price;
        }
        return uint160(_sqrt(price) * SQRT_PRICE_PRECISION / 10**9);
    }

    /**
     * @notice Convert sqrt price to tick
     * @param sqrtPriceX96 The sqrt price
     * @return tick The tick value
     */
    function _priceToTick(uint160 sqrtPriceX96) private pure returns (int24) {
        return TickMath.getTickAtSqrtRatio(sqrtPriceX96);
    }

    /**
     * @notice Calculate square root using Babylonian method
     * @param x The input value
     * @return The square root
     */
    function _sqrt(uint256 x) private pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    /**
     * @notice Calculate log2
     * @param x The input value
     * @return The log2 value
     */
    function _log2(uint256 x) private pure returns (uint256) {
        uint256 result = 0;
        while (x > 1) {
            x >>= 1;
            result++;
        }
        return result;
    }

    /**
     * @notice Route buy calls to Uniswap after graduation
     * @param token The token to buy
     * @param minAmountOut Minimum tokens to receive
     * @return amountOut Tokens received
     */
    function buyOnUniswap(
        address token,
        uint256 minAmountOut
    ) external payable nonReentrant returns (uint256 amountOut) {
        require(isGraduated[token], "Not graduated");
        require(msg.value > 0, "No ETH sent");
        
        // Wrap ETH
        (bool success, ) = WETH.call{value: msg.value}("");
        require(success, "WETH wrap failed");
        
        // Approve router
        IERC20(WETH).safeApprove(address(swapRouter), msg.value);
        
        // Swap parameters
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: WETH,
            tokenOut: token,
            fee: POOL_FEE,
            recipient: msg.sender,
            deadline: block.timestamp,
            amountIn: msg.value,
            amountOutMinimum: minAmountOut,
            sqrtPriceLimitX96: 0
        });
        
        amountOut = swapRouter.exactInputSingle(params);
        return amountOut;
    }

    /**
     * @notice Route sell calls to Uniswap after graduation
     * @param token The token to sell
     * @param amountIn Tokens to sell
     * @param minEthOut Minimum ETH to receive
     * @return amountOut ETH received
     */
    function sellOnUniswap(
        address token,
        uint256 amountIn,
        uint256 minEthOut
    ) external nonReentrant returns (uint256 amountOut) {
        require(isGraduated[token], "Not graduated");
        require(amountIn > 0, "No tokens to sell");
        
        // Transfer tokens from user
        IERC20(token).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Approve router
        IERC20(token).safeApprove(address(swapRouter), amountIn);
        
        // Swap parameters
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: token,
            tokenOut: WETH,
            fee: POOL_FEE,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: minEthOut,
            sqrtPriceLimitX96: 0
        });
        
        amountOut = swapRouter.exactInputSingle(params);
        
        // Unwrap WETH
        IERC20(WETH).safeTransfer(address(this), amountOut);
        (bool success, ) = address(this).call("");
        require(success, "WETH unwrap failed");
        
        // Send ETH to user
        (success, ) = msg.sender.call{value: amountOut}("");
        require(success, "ETH transfer failed");
        
        return amountOut;
    }

    /**
     * @notice Get ETH price in USD from Chainlink
     * @return price ETH price with 8 decimals
     */
    function getEthPriceUSD() public view returns (uint256) {
        (, int256 price, , , ) = AggregatorV3Interface(ethUsdPriceFeed).latestRoundData();
        require(price > 0, "Invalid price");
        return uint256(price);
    }

    /**
     * @notice Get graduation info for a token
     * @param token The token address
     * @return info The graduation information
     */
    function getGraduationInfo(address token) external view returns (GraduationInfo memory) {
        return graduationInfo[token];
    }

    // Admin functions
    
    /**
     * @notice Set bonding curve address
     * @param _bondingCurve The bonding curve address
     */
    function setBondingCurve(address _bondingCurve) external onlyOwner {
        require(_bondingCurve != address(0), "Invalid address");
        bondingCurve = _bondingCurve;
    }

    /**
     * @notice Set token factory address
     * @param _tokenFactory The token factory address
     */
    function setTokenFactory(address _tokenFactory) external onlyOwner {
        require(_tokenFactory != address(0), "Invalid address");
        tokenFactory = _tokenFactory;
    }

    /**
     * @notice Set ETH/USD price feed
     * @param _priceFeed The price feed address
     */
    function setPriceFeed(address _priceFeed) external onlyOwner {
        require(_priceFeed != address(0), "Invalid address");
        ethUsdPriceFeed = _priceFeed;
    }

    /**
     * @notice Emergency withdraw if graduation fails
     * @param token The token to withdraw
     */
    function emergencyWithdraw(address token) external onlyOwner {
        uint256 ethBalance = address(this).balance;
        uint256 tokenBalance = IERC20(token).balanceOf(address(this));
        
        if (ethBalance > 0) {
            (bool success, ) = bondingCurve.call{value: ethBalance}("");
            require(success, "ETH transfer failed");
        }
        
        if (tokenBalance > 0) {
            IERC20(token).safeTransfer(bondingCurve, tokenBalance);
        }
        
        emit EmergencyWithdraw(token, ethBalance, tokenBalance);
    }

    /**
     * @notice Pause graduations
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause graduations
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Handle NFT receipt
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    receive() external payable {}
}