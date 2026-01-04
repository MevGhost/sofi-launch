# CLAUDE.md - Base Launchpad Development Context

## Project Overview
We are building a decentralized meme coin launchpad on Base (Ethereum L2) that competes with pump.fun, letsbonk.fun, and Toshi Mart. The platform will use on-chain bonding curves with automatic liquidity pool mechanisms to enable fair token launches.

## Reference Implementation: Toshi Mart
Toshi Mart (toshimart.xyz) is Base's premier memecoin launchpad with proven success:
- **Market Position**: ~$300M market cap, $60M+ TVL
- **Architecture**: Virtual reserves bonding curve, auto-graduation at $69k market cap
- **Token Distribution**: 80% to bonding curve, 20% reserved for DEX liquidity
- **Integration**: Automatic Uniswap V3 pool creation with LP burn
- **Security**: Halborn audited contracts, 3% max fee hardcap
- **Ecosystem Tools**: Liquidity lockers, token vesting, multisender, traditional launchpad

## Technical Architecture Goals

### Core Requirements
- **Fully on-chain**: All logic executed via smart contracts on Base
- **Bonding curve mechanism**: Start with constant product (x*y=k) like Toshi, with modular design for future curve types
- **Automatic liquidity**: Tokens automatically graduate to Uniswap V3 at threshold
- **Fair launch**: No presales, team allocations, or preferential access
- **Verifiable**: All transactions and state changes transparent on-chain
- **Gas Optimized**: Target <150k gas for buys, <120k for sells (Toshi uses 200 optimizer runs)

### Key Components

#### 1. Smart Contracts (Solidity 0.8.20+)
- **Factory Contract**: Deploys new token contracts and bonding curves using CREATE2 for deterministic addresses
- **Bonding Curve Contract**: Handles buy/sell logic with virtual reserves (modular design for swappable curves)
- **Token Contract**: ERC-20 implementation with 18 decimals (OpenZeppelin base)
- **Migration Contract**: Handles graduation to Uniswap V3 pools with LP burn
- **Tools Contracts**: Liquidity locker, token vesting, multisender (following Toshi model)

#### 2. Bonding Curve Parameters (Toshi-Proven Model)
```
Initial Virtual ETH Reserve: 1 ETH
Initial Virtual Token Reserve: 1,000,000 tokens  
Total Supply: 1,000,000,000 tokens
Bonding Curve Supply: 800,000,000 tokens (80%)
DEX Reserve: 200,000,000 tokens (20%)
Graduation Threshold: $69,000 market cap
Platform Fee: 1% on all swaps
Creator Fee: 1% to token creator (like letsbonk)
```

#### 3. Graduation Mechanism (Toshi-Style)
When a token reaches the market cap threshold:
1. Create Uniswap V3 pool (0.3% fee tier) with accumulated ETH
2. Add initial liquidity (ETH + 20% token reserve)
3. Burn LP NFT to prevent rug pulls
4. Mark token as graduated in contract state
5. Redirect all future trades to Uniswap

## Development Phases

### Phase 1: Core Smart Contracts (Current Focus)
- [ ] Implement bonding curve mathematics
- [ ] Create factory pattern for token deployment
- [ ] Build buy/sell functions with slippage protection
- [ ] Add reentrancy guards and security measures

### Phase 2: Backend Infrastructure
- [ ] Event indexing system for all on-chain events
- [ ] PostgreSQL database for token metadata
- [ ] WebSocket server for real-time updates
- [ ] Price calculation engine

### Phase 3: Frontend & Integration
- [ ] React frontend with RainbowKit wallet connection
- [ ] Real-time price charts
- [ ] Social features and comments
- [ ] Mobile-responsive design

## Technical Specifications

### Smart Contract Functions
```solidity
// Core functions needed (following Toshi architecture)
createToken(string name, string symbol, string imageUrl, string description, address creator)
buyTokens(address token, uint256 minTokensOut) payable
sellTokens(address token, uint256 tokenAmount, uint256 minEthOut)
graduateToken(address token) // Automatic when threshold reached
claimCreatorFees(address token) // Creator claims accumulated 1% fees

// Additional Toshi-inspired functions
lockLiquidity(address token, uint256 duration)
createVestingSchedule(address token, address[] recipients, uint256[] amounts, uint256[] unlockTimes)
multisend(address token, address[] recipients, uint256[] amounts)
```

### Security Considerations (Toshi-Proven Patterns)
- Reentrancy protection on all state-changing functions (OpenZeppelin ReentrancyGuard)
- Overflow/underflow protection (Solidity 0.8+ built-in)
- Maximum fee hardcap at 3% to prevent rug pulls
- Automated swapback for fee distribution
- Anti-MEV: Max transaction limits proportional to reserves
- Emergency pause mechanism for critical issues (2-of-3 multisig)
- Professional audit required before mainnet (target Halborn like Toshi)

### Gas Optimization Priorities
1. Minimize storage operations
2. Use events for data that doesn't need on-chain storage
3. Batch operations where possible
4. Optimize bonding curve calculations

## Integration with Base Ecosystem

### Base-Specific Considerations
- Lower gas costs than mainnet (~$0.01-0.05 per transaction)
- 2-second block times
- Integration with Base's growing DeFi ecosystem
- Potential partnership with alienbase DEX

### Uniswap V3 Integration
- Use 0.3% fee tier for most pairs
- Concentrated liquidity position around current price
- Consider using Uniswap V3 Periphery contracts

## Success Metrics
- Graduation rate > 2% (vs pump.fun's 1.41%)
- Average daily launches: 5,000+ tokens
- Transaction response time < 100ms
- Smart contract gas usage < 200,000 per swap

## Current Development Status
Starting from scratch with focus on:
1. Smart contract development (Solidity)
2. Local testing with Hardhat/Foundry
3. Base testnet deployment
4. Progressive decentralization

## Key Differentiators to Implement
1. **Better graduation rates**: Quality scoring system for tokens
2. **Anti-bot measures**: Time-weighted average pricing or commit-reveal
3. **Creator incentives**: 1% of fees go to token creators
4. **Community features**: On-chain comments and social signals
5. **Multi-token launches**: Bundle multiple tokens in themed collections

## Resources and References
- Base Documentation: https://docs.base.org
- Uniswap V3 Docs: https://docs.uniswap.org
- OpenZeppelin Contracts: For secure ERC-20 implementation
- Chainlink Price Feeds: For USD pricing references

## Development Environment
- **Blockchain**: Base (Ethereum L2)
- **Smart Contracts**: Solidity 0.8.20+
- **Testing**: Hardhat or Foundry
- **Backend**: Node.js with ethers.js/viem
- **Database**: PostgreSQL
- **Caching**: Redis
- **Real-time**: WebSockets

## Important Notes for Claude Code
1. We're building on Base, not Solana - use Ethereum/EVM patterns
2. Focus on gas efficiency - Base is cheaper but optimization still matters
3. Security is paramount - this handles real money
4. Start with MVP features, iterate based on testing
5. All core logic must be on-chain and verifiable
