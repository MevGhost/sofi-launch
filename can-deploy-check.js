const fetch = require('node-fetch');

async function canUserDeploy(userAddress) {
  const rpcUrl = 'https://sepolia.base.org';
  const contractAddress = '0xbf8759fb6b543a518cd16cdc627269e17317b65e';
  
  // Function selectors (obtained from contract ABI)
  const selectors = {
    userTokenCount: '0x55e94e8f',
    userLastCreation: '0x95bb996f', 
    totalPlatformFees: '0xe09ba2f5'
  };
  
  // Constants from contract
  const MAX_TOKENS_PER_USER = 3;
  const COOLDOWN_PERIOD = 60; // seconds
  const ONE_ETH = BigInt('1000000000000000000');
  
  // Encode address parameter
  const encodedAddress = userAddress.toLowerCase().replace('0x', '').padStart(64, '0');
  
  // Get user token count
  const tokenCountReq = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: contractAddress,
        data: selectors.userTokenCount + encodedAddress
      }, 'latest'],
      id: 1
    })
  });
  const tokenCountRes = await tokenCountReq.json();
  const tokenCount = parseInt(tokenCountRes.result || '0x0', 16);
  
  // Get last creation time
  const lastCreationReq = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: contractAddress,
        data: selectors.userLastCreation + encodedAddress
      }, 'latest'],
      id: 2
    })
  });
  const lastCreationRes = await lastCreationReq.json();
  const lastCreationTimestamp = parseInt(lastCreationRes.result || '0x0', 16);
  
  // Get platform fees
  const feesReq = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: contractAddress,
        data: selectors.totalPlatformFees
      }, 'latest'],
      id: 3
    })
  });
  const feesRes = await feesReq.json();
  const platformFees = BigInt(feesRes.result || '0x0');
  
  // Calculate conditions
  const currentTime = Math.floor(Date.now() / 1000);
  const timeSinceLastCreation = currentTime - lastCreationTimestamp;
  const isUnlimited = platformFees >= ONE_ETH;
  const hasReachedLimit = tokenCount >= MAX_TOKENS_PER_USER && !isUnlimited;
  const cooldownActive = lastCreationTimestamp > 0 && timeSinceLastCreation < COOLDOWN_PERIOD;
  const cooldownRemaining = cooldownActive ? COOLDOWN_PERIOD - timeSinceLastCreation : 0;
  
  console.log('=== Can User Deploy Check ===');
  console.log('User:', userAddress);
  console.log('');
  console.log('Token Count:', tokenCount, '/', isUnlimited ? 'unlimited' : MAX_TOKENS_PER_USER);
  console.log('Platform Fees:', (platformFees / BigInt(10**15)).toString() + 'e-3 ETH');
  console.log('Unlimited Unlocked:', isUnlimited ? 'YES' : 'NO (needs 1 ETH in fees)');
  console.log('');
  
  if (lastCreationTimestamp > 0) {
    console.log('Last Creation:', new Date(lastCreationTimestamp * 1000).toLocaleString());
    console.log('Time Since:', timeSinceLastCreation, 'seconds');
    console.log('Cooldown Active:', cooldownActive ? `YES (${cooldownRemaining}s remaining)` : 'NO');
  } else {
    console.log('Last Creation: Never');
    console.log('Cooldown Active: NO');
  }
  
  console.log('');
  console.log('=== RESULT ===');
  
  const canDeploy = !hasReachedLimit && !cooldownActive;
  
  if (canDeploy) {
    console.log('✅ User CAN deploy a new token');
  } else {
    console.log('❌ User CANNOT deploy a new token');
    console.log('');
    console.log('Reasons:');
    if (hasReachedLimit) {
      console.log('  • Token limit reached (3 per wallet)');
      console.log('    Solutions:');
      console.log('      - Use a different wallet');
      console.log('      - Wait for platform to earn 1 ETH in fees');
      console.log('      - Trade existing tokens to generate fees');
    }
    if (cooldownActive) {
      console.log(`  • Cooldown active (${cooldownRemaining} seconds remaining)`);
      console.log('    Solution: Wait for cooldown to expire');
    }
  }
  
  return canDeploy;
}

// Check for the user's address
const userAddress = '0x0aee085f3a1ff088b018c5e91ffe1b93e96e31fa';
canUserDeploy(userAddress).catch(console.error);