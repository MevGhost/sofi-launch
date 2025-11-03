# GraduationManager V2 Documentation

## Overview

The GraduationManager handles the critical transition of tokens from the bonding curve to Uniswap V3 when they reach a $69,000 market cap. This process is fully automated and includes comprehensive safety mechanisms to ensure a smooth transition.

## Key Features

### 1. Automatic Graduation
- **Trigger**: $69,000 USD market cap (calculated via Chainlink)
- **Minimum Liquidity**: $50,000 USD required
- **Process**: Fully automated with no manual intervention

### 2. Uniswap V3 Pool Creation
- **Fee Tier**: 0.3% (3000)
- **Price Range**: Current price ± 50%
- **Liquidity**: Full ETH reserves + 200M reserved tokens
- **LP Token**: Immediately burned to prevent rug pulls

### 3. Safety Mechanisms
- **Slippage Protection**: 5% during liquidity addition
- **Minimum Liquidity Check**: Prevents graduation with insufficient funds
- **Emergency Pause**: Owner can pause graduations
- **Try/Catch**: Graceful error handling

### 4. Post-Graduation Trading
- Buy/sell routing to Uniswap V3
- Automatic WETH wrapping/unwrapping
- Slippage protection on all trades

## Technical Architecture

### Graduation Process Flow

```
1. Market Cap Check
   └─> Verify >= $69,000 USD via Chainlink

2. Liquidity Verification
   └─> Ensure >= $50,000 USD value

3. Asset Transfer
   ├─> Withdraw ETH from bonding curve
   └─> Transfer 200M tokens (DEX reserve)

4. Pool Creation/Initialization
   ├─> Calculate initial sqrt price
   ├─> Create pool if not exists
   └─> Initialize with current price

5. Price Range Calculation
   ├─> Current tick from price
   ├─> Lower tick: -50% from current
   ├─> Upper tick: +50% from current
   └─> Round to tick spacing (60)

6. Liquidity Addition
   ├─> Wrap ETH to WETH
   ├─> Approve position manager
   ├─> Mint position NFT
   └─> Handle unused tokens

7. LP Token Burning
   └─> Burn NFT immediately

8. State Updates
   ├─> Mark as graduated in bonding curve
   ├─> Update token category to GRADUATED
   └─> Store graduation info
```

### Price Calculations

#### Sqrt Price X96 Formula
```solidity
// For token < WETH (token is token0):
sqrtPriceX96 = sqrt(ethAmount / tokenAmount) * 2^96

// For token > WETH (WETH is token0):
sqrtPriceX96 = sqrt(tokenAmount / ethAmount) * 2^96
```

#### Tick Calculation
```solidity
// Using TickMath library for precise calculations
tick = TickMath.getTickAtSqrtRatio(sqrtPriceX96)

// Round to tick spacing
tickLower = (rawTickLower / 60) * 60
tickUpper = (rawTickUpper / 60) * 60
```

### Key Constants

```solidity
GRADUATION_THRESHOLD = $69,000 USD
MIN_LIQUIDITY_USD = $50,000 USD
DEX_RESERVE_AMOUNT = 200,000,000 tokens
POOL_FEE = 0.3% (3000)
TICK_SPACING = 60
PRICE_RANGE_PERCENTAGE = 50%
```

## Safety Features

### 1. Manipulation Prevention
- Market cap calculated using Chainlink oracle
- Minimum liquidity prevents small pool attacks
- LP burning prevents rug pulls

### 2. Error Handling
- Try/catch blocks for graceful failures
- Emergency withdrawal function
- Pausable in case of issues

### 3. Slippage Protection
- 5% slippage tolerance during liquidity addition
- Refunds for unused tokens
- Min output amounts on swaps

## Post-Graduation Trading

### Buy Flow
```solidity
1. User sends ETH
2. Contract wraps to WETH
3. Swaps WETH for tokens on Uniswap V3
4. Sends tokens to user
```

### Sell Flow
```solidity
1. User approves tokens
2. Contract takes tokens
3. Swaps tokens for WETH on Uniswap V3
4. Unwraps WETH to ETH
5. Sends ETH to user
```

## Integration Points

### With Bonding Curve
- `withdrawGraduationLiquidity()`: Transfer ETH
- `markAsGraduated()`: Update status
- Token transfer for DEX reserve

### With Token Factory
- `updateTokenCategory()`: Set to GRADUATED
- Category tracking for UI

### With Uniswap V3
- Factory: Pool creation
- Position Manager: Liquidity addition
- Swap Router: Post-graduation trades

## Events

### GraduationInitiated
```solidity
event GraduationInitiated(
    address indexed token,
    uint256 marketCap,
    uint256 ethReserve,
    uint256 tokenReserve
);
```

### PoolCreated
```solidity
event PoolCreated(
    address indexed token,
    address indexed pool,
    uint160 sqrtPriceX96,
    int24 currentTick
);
```

### LiquidityAdded
```solidity
event LiquidityAdded(
    address indexed token,
    uint256 tokenId,
    uint128 liquidity,
    uint256 ethAmount,
    uint256 tokenAmount,
    int24 tickLower,
    int24 tickUpper
);
```

### GraduationCompleted
```solidity
event GraduationCompleted(
    address indexed token,
    address indexed pool,
    uint256 finalMarketCap
);
```

## Emergency Procedures

### Pause Graduations
```bash
# If issues detected
graduationManager.pause()

# Resume when fixed
graduationManager.unpause()
```

### Emergency Withdrawal
```bash
# Recover stuck funds
graduationManager.emergencyWithdraw(tokenAddress)
```

## Gas Costs (Estimated)

- Pool Creation: ~500,000 gas
- Liquidity Addition: ~400,000 gas
- LP Burning: ~50,000 gas
- Total Graduation: ~1,000,000 gas

At 2 gwei on Base: ~0.002 ETH ($4 at $2000/ETH)

## Best Practices

1. **Monitor Gas Prices**: Graduation is gas-intensive
2. **Check Liquidity**: Ensure sufficient ETH before threshold
3. **Verify Oracle**: Chainlink feed must be active
4. **Test on Testnet**: Complex process requires testing
5. **Monitor Events**: Track graduation success/failure

## Common Issues

### Graduation Fails
- Below $69k market cap
- Insufficient liquidity (<$50k)
- Contract paused
- Oracle failure

### Pool Already Exists
- Contract handles existing pools gracefully
- Will add liquidity to existing pool

### Slippage Too High
- Large price movement during graduation
- Retry with higher gas price
- Check for MEV attacks