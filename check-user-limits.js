const fetch = require('node-fetch');

async function checkUserLimits() {
  const rpcUrl = 'https://sepolia.base.org';
  const contractAddress = '0xbf8759fb6b543a518cd16cdc627269e17317b65e';
  const userAddress = '0x0aee085f3a1ff088b018c5e91ffe1b93e96e31fa'; // Your address
  
  // Function selectors
  const userTokenCountSelector = '0x55e94e8f'; // userTokenCount(address)
  const userLastCreationSelector = '0x95bb996f'; // userLastCreation(address)
  const totalPlatformFeesSelector = '0xe09ba2f5'; // totalPlatformFees()
  
  // Encode address parameter (padded to 32 bytes)
  const encodedAddress = userAddress.toLowerCase().replace('0x', '').padStart(64, '0');
  
  // Check userTokenCount
  const tokenCountReq = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: contractAddress,
        data: userTokenCountSelector + encodedAddress
      }, 'latest'],
      id: 1
    })
  });
  const tokenCountRes = await tokenCountReq.json();
  
  if (tokenCountRes.result) {
    const tokenCount = parseInt(tokenCountRes.result, 16);
    console.log('User token count:', tokenCount);
    console.log('Max tokens per user: 3');
    console.log('Can create more tokens:', tokenCount < 3 ? 'YES' : 'NO (limit reached)');
  }
  
  // Check userLastCreation
  const lastCreationReq = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: contractAddress,
        data: userLastCreationSelector + encodedAddress
      }, 'latest'],
      id: 2
    })
  });
  const lastCreationRes = await lastCreationReq.json();
  
  if (lastCreationRes.result) {
    const lastCreationTimestamp = parseInt(lastCreationRes.result, 16);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeSinceLastCreation = currentTime - lastCreationTimestamp;
    
    console.log('\nLast creation timestamp:', lastCreationTimestamp);
    console.log('Current timestamp:', currentTime);
    console.log('Time since last creation:', timeSinceLastCreation, 'seconds');
    console.log('Cooldown period: 60 seconds');
    console.log('Cooldown active:', timeSinceLastCreation < 60 ? 'YES' : 'NO');
  }
  
  // Check totalPlatformFees to see if limit is unlocked
  const feesReq = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: contractAddress,
        data: totalPlatformFeesSelector
      }, 'latest'],
      id: 3
    })
  });
  const feesRes = await feesReq.json();
  
  if (feesRes.result) {
    const fees = BigInt(feesRes.result);
    const oneEth = BigInt('1000000000000000000');
    console.log('\nTotal platform fees:', (fees / BigInt(10**18)).toString() + '.' + (fees % BigInt(10**18)).toString().padStart(18, '0').replace(/0+$/, ''), 'ETH');
    console.log('Limit unlocked at: 1 ETH');
    console.log('Limit unlocked:', fees >= oneEth ? 'YES (unlimited tokens)' : 'NO');
  }
  
  console.log('\n--- SOLUTION ---');
  console.log('The user has likely hit the 3 token per user limit.');
  console.log('To create more tokens, either:');
  console.log('1. Wait for platform to earn 1 ETH in fees (unlocks unlimited)');
  console.log('2. Use a different wallet address');
  console.log('3. Trade existing tokens to generate fees');
}

checkUserLimits().catch(console.error);