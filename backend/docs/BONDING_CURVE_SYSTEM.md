# Modular Bonding Curve System Documentation

## Overview

The modular bonding curve system implements a gas-optimized, feature-rich trading mechanism for the Base launchpad. It follows the proven Toshi model with enhancements for better gas efficiency and extensibility.

## Architecture

### Core Components

1. **BondingCurveBaseV2.sol** - Abstract base contract with optimized storage layout
2. **ConstantProductCurveV2.sol** - Implements x*y=k formula (Uniswap V2 style)
3. **IBondingCurveV2.sol** - Interface for external interactions

### Key Features

- **Packed Structs**: TokenInfo uses only 5 storage slots instead of 14
- **Unchecked Math**: Safe overflow protection where applicable
- **Minimal Storage Operations**: Batch updates in single SSTORE
- **Chainlink Integration**: Real-time USD market cap calculation

## Mathematical Foundation

### Constant Product Formula (x * y = k)

The bonding curve uses the same formula as Uniswap V2:

```
When buying tokens:
- Formula: Δy = (y * Δx) / (x + Δx)
- Where: x = ETH reserve, y = token reserve, Δx = ETH input, Δy = tokens output

When selling tokens:
- Formula: Δx = (x * Δy) / (y + Δy)
- Where: Δy = tokens input, Δx = ETH output
```

### Price Calculation

```
Spot Price = ETH Reserve / Token Reserve
Market Cap = Spot Price * Total Supply * ETH/USD Price
```

### Virtual Reserves

- Initial Virtual ETH: 1 ETH
- Initial Virtual Tokens: 1,000,000
- These create initial liquidity and price discovery

## Fee Structure

- **Platform Fee**: 1% (100 basis points)
- **Creator Fee**: 1% (100 basis points)
- **Maximum Total**: 3% hardcap for security

Fees are calculated on the input amount for buys and output amount for sells.

## Gas Optimizations

### Storage Layout

```solidity
struct TokenInfo {
    // Slot 1: 256 bits
    uint128 virtualEthReserve;    // 128 bits
    uint128 virtualTokenReserve;  // 128 bits
    
    // Slot 2: 256 bits
    uint128 realEthReserve;       // 128 bits
    uint128 realTokenReserve;     // 128 bits
    
    // Slot 3: 201 bits (packed)
    address creator;              // 160 bits
    uint32 createdAt;            // 32 bits
    uint32 graduatedAt;          // 32 bits
    bool graduated;              // 8 bits
    
    // Slot 4: 256 bits
    uint128 creatorFees;         // 128 bits
    uint128 platformFees;        // 128 bits
    
    // Slot 5: 256 bits
    uint64 tradeCount;           // 64 bits
    uint192 totalVolumeETH;      // 192 bits
}
```

### Optimization Techniques

1. **Unchecked Blocks**: Used where overflow is impossible
2. **Batch Updates**: All state changes in single transaction
3. **Memory Caching**: Load struct once, update in memory
4. **Minimal External Calls**: Reduce CALL opcodes

## Trading Metrics

The system tracks:
- Trade count per token
- Total volume in ETH
- Current reserves (virtual and real)
- Market cap in USD
- Price impact calculations

## Graduation System

Tokens automatically graduate at $69,000 market cap:
1. Market cap checked after each buy
2. Graduation manager called if threshold met
3. Liquidity migrated to Uniswap V3
4. LP tokens burned for security

## Security Features

1. **Reentrancy Guards**: On all state-changing functions
2. **Pausable**: Emergency pause mechanism
3. **Slippage Protection**: minTokensOut/minEthOut parameters
4. **Fee Hardcap**: Maximum 3% total fees
5. **Rounding Protection**: 0.1% buffer on calculations

## Usage Examples

### Buying Tokens
```solidity
// User sends 0.1 ETH to buy tokens
bondingCurve.buyTokens{value: 0.1 ether}(
    tokenAddress,
    minTokensExpected // Slippage protection
);
```

### Selling Tokens
```solidity
// User sells 1000 tokens
token.approve(bondingCurve, 1000e18);
bondingCurve.sellTokens(
    tokenAddress,
    1000e18,
    minEthExpected // Slippage protection
);
```

### Querying Price
```solidity
uint256 currentPrice = bondingCurve.getCurrentPrice(tokenAddress);
uint256 marketCap = bondingCurve.getMarketCap(tokenAddress);
```

## Integration with Base

### Chainlink Price Feed
- Base Mainnet ETH/USD: `0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70`
- Updates every ~3600 seconds
- 8 decimal precision

### Gas Costs (Estimated)
- Token Creation: ~150,000 gas
- Buy Transaction: ~120,000 gas
- Sell Transaction: ~100,000 gas
- Claim Fees: ~50,000 gas

## Future Curve Types

The modular design allows easy addition of new curve types:
- Linear curves
- Exponential curves
- Sigmoid curves
- Custom formulas

Simply extend `BondingCurveBaseV2` and implement:
- `calculateTokensOut()`
- `calculateEthOut()`

## Best Practices

1. Always use slippage protection
2. Check price impact before large trades
3. Monitor gas prices on Base
4. Verify token graduation status
5. Claim fees regularly to reduce contract balance