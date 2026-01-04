const { ethers } = require('ethers');

async function testOldContract() {
  const oldContract = '0xD120242C95B2334981B45e230900Cac115eF3f49';
  const provider = new ethers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/XK8ZLRP2DVEi2di5M9Yz0');
  
  const abi = [
    'function tokenInfo(address) view returns (address creator, uint256 ethReserve, uint256 tokenReserve, uint256 realEthReserve, uint256 realTokenReserve, uint256 totalEthTraded, uint256 totalTokensTraded, uint256 createdAt, bool graduated)',
    'function getAllTokens() view returns (address[])',
    'function INITIAL_VIRTUAL_ETH() view returns (uint256)',
    'function INITIAL_VIRTUAL_TOKENS() view returns (uint256)',
  ];
  
  const contract = new ethers.Contract(oldContract, abi, provider);
  
  try {
    // Get all tokens
    const tokens = await contract.getAllTokens();
    console.log(`Found ${tokens.length} tokens in old contract\n`);
    
    // Check virtual reserves
    const virtualEth = await contract.INITIAL_VIRTUAL_ETH();
    const virtualTokens = await contract.INITIAL_VIRTUAL_TOKENS();
    
    console.log('Virtual Reserves Configuration:');
    console.log('Virtual ETH:', ethers.formatEther(virtualEth));
    console.log('Virtual Tokens:', ethers.formatEther(virtualTokens));
    console.log('');
    
    // Check the problematic token
    const problemToken = '0xd0baa5311a034bba41bfb0e1a7acd490d7638b5b';
    if (tokens.map(t => t.toLowerCase()).includes(problemToken.toLowerCase())) {
      console.log('Checking problematic token:', problemToken);
      const info = await contract.tokenInfo(problemToken);
      
      // The struct returns indexed values
      console.log('Creator:', info[0]);
      console.log('ETH Reserve (virtual + real):', ethers.formatEther(info[1] || 0));
      console.log('Token Reserve (virtual + real):', ethers.formatEther(info[2] || 0));
      console.log('Real ETH Reserve:', ethers.formatEther(info[3] || 0));
      console.log('Real Token Reserve:', ethers.formatEther(info[4] || 0));
      console.log('Total ETH Traded:', ethers.formatEther(info[5] || 0));
      
      // Calculate what the reserves should be
      const virtualEthNum = parseFloat(ethers.formatEther(virtualEth));
      const virtualTokenNum = parseFloat(ethers.formatEther(virtualTokens));
      const realEth = parseFloat(ethers.formatEther(info[3] || 0));
      const realTokens = parseFloat(ethers.formatEther(info[4] || 0));
      
      console.log('\nCalculated totals:');
      console.log('Total ETH should be:', virtualEthNum + realEth);
      console.log('Total Tokens should be:', virtualTokenNum + realTokens);
      
      // Check if the stored values match
      const storedEth = parseFloat(ethers.formatEther(info[1] || 0));
      const storedTokens = parseFloat(ethers.formatEther(info[2] || 0));
      
      console.log('\nStored vs Calculated:');
      console.log('ETH Reserve matches?', Math.abs(storedEth - (virtualEthNum + realEth)) < 0.0001);
      console.log('Token Reserve matches?', Math.abs(storedTokens - (virtualTokenNum + realTokens)) < 1);
    }
    
    // Test with a working token if any
    if (tokens.length > 0) {
      console.log('\n\nChecking other tokens:');
      for (let i = 0; i < Math.min(3, tokens.length); i++) {
        const token = tokens[i];
        const info = await contract.tokenInfo(token);
        console.log(`\nToken ${i+1}: ${token}`);
        console.log('  Real ETH:', ethers.formatEther(info[3] || 0));
        console.log('  Real Tokens:', ethers.formatEther(info[4] || 0));
        console.log('  Total Volume:', ethers.formatEther(info[5] || 0));
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testOldContract();