# Trading Flow Test Checklist

## Prerequisites
- [ ] Frontend running on http://localhost:3000
- [ ] Backend API running on http://localhost:5001
- [ ] MetaMask connected to Base Sepolia
- [ ] Test ETH available in wallet

## Token to Test With
- Address: `0x927eb6d44537ce02be945940a74a21c6c0e24036`
- Page: http://localhost:3000/token/0x927eb6d44537ce02be945940a74a21c6c0e24036

## Test Steps

### 1. Buy Flow Test
1. Navigate to token page
2. Click "Buy" button
3. Enter amount (e.g., 0.001 ETH)
4. Review slippage settings (default 1%)
5. Click "Buy Tokens"
6. Expected: Authentication prompt (if not logged in)
7. Sign message in MetaMask
8. Expected: Transaction confirmation prompt
9. Confirm transaction in MetaMask
10. Expected: Success toast message
11. Verify: Token balance updates
12. Verify: Trade recorded in backend (check logs)

### 2. Sell Flow Test (after successful buy)
1. Click "Sell" button
2. Enter token amount to sell
3. Review slippage settings
4. Click "Sell Tokens"
5. Expected: Approval transaction first
6. Confirm approval in MetaMask
7. Expected: Sell transaction next
8. Confirm sell in MetaMask
9. Expected: Success toast message
10. Verify: Token balance decreases
11. Verify: ETH balance increases
12. Verify: Trade recorded in backend

## Error Scenarios to Test
- [ ] Trading without wallet connected
- [ ] Trading with insufficient ETH balance
- [ ] Selling more tokens than owned
- [ ] Disconnecting wallet mid-transaction
- [ ] Backend API down during trade

## What's Fixed
1. **Object Disposed Error**: Added proper lifecycle management with `mountedRef` to prevent accessing disposed wallet clients
2. **Authentication Flow**: Auto-login before trades if not authenticated
3. **Error Handling**: Better error messages for wallet disconnection
4. **API Port**: Fixed from 4000 to 5001

## Backend Verification
Check backend logs for:
- JWT authentication success
- Trade recording in database
- WebSocket event emissions