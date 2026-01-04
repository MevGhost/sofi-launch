const { ethers } = require('ethers');
const DevBondingCurveV2ABI = require('../abis/DevBondingCurveV2ABI.json');

async function testTokenCreation() {
  const factoryAddress = '0x46eCf02772C4Bc9a5cd440FB93022d6e268355c8';
  
  // Connect to provider
  const provider = new ethers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/XK8ZLRP2DVEi2di5M9Yz0');
  
  // Test wallet with some testnet ETH
  const wallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
  console.log('Wallet address:', wallet.address);
  
  // Get contract instance
  const contract = new ethers.Contract(factoryAddress, DevBondingCurveV2ABI, wallet);
  
  try {
    console.log('\nDeploying test token through V2 factory...');
    
    // Create token with unique name
    const timestamp = Date.now();
    const tx = await contract.createToken(
      `Test Token ${timestamp}`,
      `TEST${timestamp.toString().slice(-4)}`,
      'Test token for auto-sync verification',
      'https://example.com/image.png',
      'https://twitter.com/test',
      'https://t.me/test',
      'https://test.com',
      'meme',
      0, // devBuyAmount = 0 for testing
      { value: ethers.parseEther('0.001') } // 0.001 ETH creation fee
    );
    
    console.log('Transaction hash:', tx.hash);
    console.log('Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('Transaction confirmed in block:', receipt.blockNumber);
    
    // Extract token address from events
    const tokenCreatedEvent = receipt.logs.find(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed && parsed.name === 'TokenCreated';
      } catch {
        return false;
      }
    });
    
    if (tokenCreatedEvent) {
      const parsed = contract.interface.parseLog(tokenCreatedEvent);
      const tokenAddress = parsed.args[0];
      console.log('\n✅ Token created at:', tokenAddress);
      
      // Wait a bit for auto-sync
      console.log('\nWaiting 5 seconds for auto-sync to process...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check if token was synced to database
      console.log('Checking if token was synced to database...');
      const response = await fetch(`http://localhost:5001/api/tokens/${tokenAddress}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        console.log('\n✅ AUTO-SYNC SUCCESS! Token found in database:');
        console.log('- Name:', result.data.name);
        console.log('- Symbol:', result.data.symbol);
        console.log('- Market Cap:', result.data.marketCap);
        console.log('- Status:', result.data.status);
      } else {
        console.log('\n❌ AUTO-SYNC FAILED: Token not found in database');
        console.log('Response:', result);
        
        // Try manual sync
        console.log('\nAttempting manual sync...');
        const syncResponse = await fetch(`http://localhost:5001/api/tokens/${tokenAddress}/sync`, {
          method: 'POST'
        });
        const syncResult = await syncResponse.json();
        console.log('Manual sync result:', syncResult);
      }
    } else {
      console.log('❌ Could not extract token address from transaction');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.data) {
      console.error('Error data:', error.data);
    }
  }
}

testTokenCreation();