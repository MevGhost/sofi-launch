# Security Features Documentation

## Overview

The SecureBondingCurve implementation includes comprehensive security measures to ensure fair launches and protect against common attacks in DeFi.

## 1. ReentrancyGuard Protection

### Implementation
- All external functions use OpenZeppelin's `ReentrancyGuard`
- `nonReentrant` modifier on:
  - `buyTokens()`
  - `sellTokens()`
  - `commitTrade()`
  - `revealTrade()`
  - `claimCreatorFees()`
  - `claimPlatformFees()`

### Protection Against
- Reentrancy attacks during ETH transfers
- Cross-function reentrancy
- Read-only reentrancy

## 2. Progressive Transaction Limits

### Phase 1: Blocks 0-10
- **Limit**: 1% of curve supply per transaction
- **Purpose**: Prevent whales from dominating early
- **Example**: If 100 ETH in pool, max 1 ETH per tx

### Phase 2: Blocks 11-60
- **Limit**: 2.5% of curve supply
- **Purpose**: Gradual opening for larger traders
- **Example**: If 100 ETH in pool, max 2.5 ETH per tx

### Phase 3: After Block 60
- **Limit**: 5% of curve supply
- **Purpose**: Anti-whale protection continues
- **Example**: If 100 ETH in pool, max 5 ETH per tx

```solidity
function _getTransactionLimitBps(address token) private view returns (uint256) {
    uint256 blocksSinceCreation = block.number - (tokenInfo[token].createdAt / 12);
    
    if (blocksSinceCreation <= PHASE1_BLOCKS) {
        return PHASE1_LIMIT_BPS; // 1%
    } else if (blocksSinceCreation <= PHASE1_BLOCKS + PHASE2_BLOCKS) {
        return PHASE2_LIMIT_BPS; // 2.5%
    } else {
        return PHASE3_LIMIT_BPS; // 5%
    }
}
```

## 3. Fee Security

### Hardcoded Maximum
- **Total Fee Cap**: 3% maximum (non-changeable)
- **Distribution**: Platform (1.5%) + Creator (1.5%)
- **No Changes**: Fees cannot be modified after token creation

### Progressive Fee Reduction
- **Start**: 3% total fees
- **Duration**: First hour after trading enabled
- **End**: 2% total fees (1% platform + 1% creator)
- **Formula**: Linear decrease over 3600 seconds

### Automated Swapback
- **Threshold**: 0.5 ETH accumulated fees
- **Process**: Automatic conversion to ETH
- **Purpose**: Prevent large fee accumulation
- **Gas**: Paid by transaction triggering swapback

## 4. Anti-MEV Features

### Same-Block Sandwich Protection
```solidity
modifier preventSandwich(address token) {
    require(
        securityInfo[token].lastTradedBlock[msg.sender] < block.number,
        "No same-block trading"
    );
    _;
    securityInfo[token].lastTradedBlock[msg.sender] = block.number;
}
```

### Commit-Reveal for Large Trades
- **Threshold**: $10,000 USD value
- **Process**:
  1. Commit: Hash(user, token, isBuy, amount, nonce)
  2. Wait: 1+ blocks
  3. Reveal: Execute trade with original parameters
  4. Expiry: 10 blocks to reveal

### Maximum Slippage Enforcement
- **Default**: 5% maximum slippage
- **Check**: Both user-specified and protocol maximum
- **Formula**: `tokensOut >= minTokensOut * 0.95`

## 5. Fair Launch Mechanics

### Random Start Time
```solidity
uint256 randomDelay = uint256(keccak256(abi.encodePacked(
    block.timestamp,
    block.difficulty,
    token
))) % RANDOM_DELAY_WINDOW;
```
- **Window**: 0-5 minutes random delay
- **Purpose**: Prevent bot preparation
- **Fairness**: Equal opportunity for all users

### No First-Block Trading
- **Creation Block**: No trades allowed
- **Next Block**: Must wait for timestamp AND new block
- **Purpose**: Prevent miner/validator manipulation

### Progressive Launch
1. **Random Delay**: 0-5 minutes
2. **High Fees**: Start at 3%
3. **Low Limits**: 1% max transaction
4. **Gradual Opening**: Fees and limits normalize over time

## 6. Multisig Pause Control

### 2-of-3 Requirement
```solidity
function proposePause(bool shouldPause) external onlyRole(PAUSER_ROLE) {
    // Creates proposal
}

function votePause(uint256 proposalId) external onlyRole(PAUSER_ROLE) {
    // Requires 2 votes to execute
}
```

### Security Benefits
- No single point of failure
- Distributed control
- Time for response to issues
- Transparent on-chain voting

## 7. Additional Security Measures

### Access Control
- Role-based permissions (OpenZeppelin)
- DEFAULT_ADMIN_ROLE: Owner functions
- PAUSER_ROLE: Emergency pause
- OPERATOR_ROLE: Operational functions

### Input Validation
- All amounts checked for zero
- Address validation
- Overflow protection (Solidity 0.8+)
- Reserve consistency checks

### Emergency Functions
- **Pause**: Stop all trading
- **Token Recovery**: After 30 days or graduation
- **ETH Recovery**: Via multisig only

## 8. Security Checklist

### Before Launch
- [ ] Deploy with correct price feed address
- [ ] Set up 3 pausers for multisig
- [ ] Verify all constants are correct
- [ ] Test on testnet first

### During Operation
- [ ] Monitor for unusual activity
- [ ] Check swapback execution
- [ ] Verify fee accumulation
- [ ] Watch for security alerts

### Emergency Response
1. **Detect Issue**: Monitoring or user report
2. **Pause Trading**: 2-of-3 multisig
3. **Investigate**: Analyze on-chain data
4. **Fix/Migrate**: Deploy fix or migrate users
5. **Resume**: 2-of-3 multisig unpause

## 9. Known Limitations

### Cannot Prevent
- High gas price attacks
- Network congestion
- Oracle manipulation (use Chainlink)
- Social engineering

### Trade-offs
- Higher gas costs for security
- Complexity for users
- Delayed trading start
- Transaction limits may frustrate large traders

## 10. Audit Recommendations

### Focus Areas
1. Reentrancy paths
2. Integer overflow/underflow
3. Access control logic
4. Commit-reveal implementation
5. Fee calculation accuracy

### Testing Required
- Fuzz testing all inputs
- Invariant testing
- Gas optimization
- Stress testing limits
- MEV simulation

## Best Practices for Users

1. **Wait for Trading**: Don't try to trade immediately
2. **Check Limits**: Verify transaction limits before trading
3. **Use Commit-Reveal**: For trades over $10k
4. **Monitor Fees**: Fees decrease over first hour
5. **Avoid Sandwiches**: Don't trade multiple times per block