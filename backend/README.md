# Base Launchpad - Toshi-Inspired Meme Coin Platform

A decentralized meme coin launchpad built on Base (Ethereum L2) featuring on-chain bonding curves and automatic liquidity graduation to Uniswap V3.

## Features

- **Bonding Curve Mechanism**: Constant product (x*y=k) with modular design for future curve types
- **Fair Launch**: No presales, team allocations, or preferential access
- **Automatic Graduation**: Tokens automatically graduate to Uniswap V3 at $69k market cap
- **Token Distribution**: 80% bonding curve, 20% DEX liquidity
- **Fee Structure**: 1% platform fee + 1% creator fee
- **Gas Optimized**: Using CREATE2 for deterministic addresses and minimal proxy pattern
- **Additional Tools**: Liquidity locker, token vesting, and multi-sender contracts

## Contract Architecture

### Core Contracts

- **BondingCurveBase.sol**: Abstract contract with core bonding curve logic
- **ConstantProductCurve.sol**: Implementation of x*y=k bonding curve
- **TokenFactory.sol**: Factory for gas-efficient token deployment using CREATE2
- **GraduationManager.sol**: Handles automatic graduation to Uniswap V3

### Token Contracts

- **LaunchpadToken.sol**: Minimal proxy implementation for launched tokens

### Utility Contracts

- **LiquidityLocker.sol**: Lock liquidity tokens with time-based unlocking
- **TokenVesting.sol**: Create vesting schedules for token distribution
- **MultiSender.sol**: Batch send tokens or ETH to multiple recipients

## Deployment

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Base Sepolia
npx hardhat run scripts/deploy.js --network base-sepolia

# Deploy to Base Mainnet
npx hardhat run scripts/deploy.js --network base-mainnet
```

## Environment Variables

Create a `.env` file:

```
PRIVATE_KEY=your_private_key_here
BASESCAN_API_KEY=your_basescan_api_key_here
```

## Key Parameters

- Initial Virtual ETH Reserve: 1 ETH
- Initial Virtual Token Reserve: 1,000,000 tokens
- Total Supply: 1,000,000,000 tokens
- Bonding Curve Supply: 800,000,000 tokens (80%)
- DEX Reserve: 200,000,000 tokens (20%)
- Graduation Threshold: $69,000 market cap
- Platform Fee: 1%
- Creator Fee: 1%

## Security Features

- OpenZeppelin contracts for battle-tested implementations
- Reentrancy guards on all state-changing functions
- Overflow protection with Solidity 0.8+
- Maximum fee hardcap at 3%
- Pausable functionality for emergency situations

## Gas Optimization

- 200 optimization runs
- CREATE2 for deterministic addresses
- Minimal proxy pattern for token deployments
- Efficient storage patterns

## License

MIT