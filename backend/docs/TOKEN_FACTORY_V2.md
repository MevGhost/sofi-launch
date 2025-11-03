# TokenFactoryV2 Documentation

## Overview

TokenFactoryV2 is a gas-optimized factory contract that uses CREATE2 and the minimal proxy pattern to deploy tokens with deterministic addresses. This approach saves approximately 90% in deployment gas costs compared to traditional token deployments.

## Key Features

### 1. Gas Optimization
- **Minimal Proxy Pattern**: Deploys lightweight proxy contracts (~45 bytes) instead of full token contracts
- **CREATE2**: Deterministic addresses allow address prediction before deployment
- **Batch Operations**: Registry supports efficient batch queries
- **Event-Based Storage**: Metadata stored in events to minimize storage costs

### 2. Token Parameters
- **Fixed Supply**: 1,000,000,000 tokens (immutable)
- **Distribution**: 
  - 800,000,000 (80%) to bonding curve
  - 200,000,000 (20%) reserved for DEX liquidity
- **Metadata**: Name, symbol, image URL, description
- **Creator Tracking**: For fee distribution

### 3. Anti-Spam Measures
- **Creation Fee**: Configurable fee (default 0.001 ETH)
- **Rate Limiting**: Max 3 tokens per block per address
- **Block-Level Deduplication**: Prevents duplicate names in same block
- **Free Creation**: Holders of 1M+ platform tokens create for free

### 4. Registry Features
- **Categories**: NEW, TRENDING, GRADUATING, GRADUATED
- **Search**: By creator, category, or index
- **Pagination**: Efficient querying of large datasets
- **Integration**: Direct bonding curve initialization

## Contract Architecture

### TokenFactoryV2
Main factory contract with:
- Token deployment logic
- Registry management
- Anti-spam enforcement
- Fee collection

### LaunchpadTokenV2
Lightweight token implementation with:
- ERC20 standard compliance
- Burnable functionality
- Initialization for proxy pattern
- Minimal storage usage

### TokenRegistry
Helper contract for:
- Batch token queries
- Trending calculations
- Detailed metrics aggregation
- Frontend optimization

## Gas Cost Analysis

### Traditional Deployment
```
Full ERC20 deployment: ~1,500,000 gas
At 20 gwei: ~0.03 ETH
```

### Optimized Deployment
```
Proxy deployment: ~150,000 gas
At 20 gwei: ~0.003 ETH
Savings: 90%
```

## Usage Examples

### Creating a Token
```javascript
// Predict address before creation
const predictedAddress = await factory.predictTokenAddress(
  creatorAddress,
  "My Token",
  "MTK"
);

// Create token
const tx = await factory.createToken(
  "My Token",
  "MTK",
  "https://example.com/logo.png",
  "Description of my token",
  { value: ethers.parseEther("0.001") } // Creation fee
);

// Token address matches prediction
const receipt = await tx.wait();
const tokenAddress = receipt.logs[0].args.token;
console.log(tokenAddress === predictedAddress); // true
```

### Free Creation for Holders
```javascript
// Check if user qualifies for free creation
const creationFee = await factory.getCreationFee(userAddress);
console.log("Creation fee:", creationFee); // 0 if holding 1M+ platform tokens
```

### Querying Tokens
```javascript
// Get tokens by category
const trendingTokens = await factory.getTokensByCategory(
  TokenCategory.TRENDING,
  0, // offset
  10 // limit
);

// Get tokens by creator
const creatorTokens = await factory.getTokensByCreator(creatorAddress);

// Get detailed info using TokenRegistry
const registry = await TokenRegistry.at(registryAddress);
const detailedInfo = await registry.getTokensInfo(
  [token1, token2, token3],
  userAddress // for balance queries
);
```

## Security Features

### Input Validation
- Name: 1-32 characters
- Symbol: 1-8 alphanumeric characters
- URLs: Max 256 characters
- Description: Max 256 characters

### Access Control
- Only factory can initialize tokens
- Only bonding curve/owner can update categories
- Admin functions protected by Ownable

### Anti-Manipulation
- Rate limiting prevents spam
- Block deduplication prevents frontrunning
- Deterministic addresses prevent MEV

## Events for Indexing

### TokenCreated
```solidity
event TokenCreated(
    address indexed token,
    address indexed creator,
    uint256 indexed tokenId,
    string name,
    string symbol,
    string imageUrl,
    string description,
    uint256 timestamp,
    bytes32 salt
);
```

### TokenCategorized
```solidity
event TokenCategorized(
    address indexed token,
    TokenCategory indexed oldCategory,
    TokenCategory indexed newCategory,
    uint256 timestamp
);
```

## Integration Guide

### 1. Deploy Contracts
```javascript
// Deploy in order:
1. LaunchpadTokenV2 (implementation)
2. TokenFactoryV2
3. BondingCurveV2
4. TokenRegistry (helper)
```

### 2. Configure Factory
```javascript
await factory.setBondingCurve(bondingCurveAddress);
await factory.setCreationFee(ethers.parseEther("0.001"));
await factory.setPlatformToken(platformTokenAddress); // Optional
```

### 3. Monitor Events
```javascript
// Listen for new tokens
factory.on("TokenCreated", (token, creator, tokenId, name, symbol) => {
  console.log(`New token: ${name} (${symbol}) at ${token}`);
});

// Track category changes
factory.on("TokenCategorized", (token, oldCategory, newCategory) => {
  console.log(`Token ${token} moved from ${oldCategory} to ${newCategory}`);
});
```

## Best Practices

1. **Always verify predicted addresses** before sending funds
2. **Use TokenRegistry** for batch queries to minimize RPC calls
3. **Monitor gas prices** and adjust creation fees accordingly
4. **Implement proper indexing** for efficient token discovery
5. **Cache token metadata** to reduce on-chain reads

## Future Enhancements

1. **Dynamic fee adjustment** based on network congestion
2. **Reputation system** for trusted creators
3. **Batch token creation** for collections
4. **Cross-chain deployment** predictions
5. **Advanced categorization** algorithms