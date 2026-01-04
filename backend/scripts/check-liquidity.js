const { ethers } = require('ethers');

const DevBondingCurveABI = require('../abis/DevBondingCurve.json');

async function checkLiquidity() {
  const tokenAddress = '0xd0baa5311a034bba41bfb0e1a7acd490d7638b5b';
  const factoryAddress = '0xD120242C95B2334981B45e230900Cac115eF3f49';
  
  const provider = new ethers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/XK8ZLRP2DVEi2di5M9Yz0');
  const contract = new ethers.Contract(factoryAddress, DevBondingCurveABI, provider);
  
  try {
    console.log('Checking token:', tokenAddress);
    
    // Get token info
    const tokenInfo = await contract.tokenInfo(tokenAddress);
    
    console.log('\n=== Token Info ===');
    console.log('Creator:', tokenInfo[0] || tokenInfo.creator);
    console.log('ETH Reserve:', ethers.formatEther(tokenInfo[1] || tokenInfo.ethReserve || 0), 'ETH');
    console.log('Token Reserve:', ethers.formatEther(tokenInfo[2] || tokenInfo.tokenReserve || 0), 'tokens');
    console.log('Real ETH Reserve:', ethers.formatEther(tokenInfo[3] || tokenInfo.realEthReserve || 0), 'ETH');
    console.log('Real Token Reserve:', ethers.formatEther(tokenInfo[4] || tokenInfo.realTokenReserve || 0), 'tokens');
    console.log('Graduated:', tokenInfo[8] || tokenInfo.graduated || false);
    
    // Check if token is valid
    const isValid = await contract.isValidToken(tokenAddress);
    console.log('\nToken is valid:', isValid);
    
    // Get current price
    const price = await contract.getTokenPrice(tokenAddress);
    console.log('\nCurrent price per token:', ethers.formatEther(price), 'ETH');
    
    // Calculate what happens when selling different amounts
    const amounts = ['100', '1000', '10000', '100000', '1000000'];
    console.log('\n=== Sell Simulations ===');
    
    for (const amount of amounts) {
      try {
        const tokenAmount = ethers.parseEther(amount);
        const ethReturn = await contract.calculateSellReturn(tokenAddress, tokenAmount);
        console.log(`Selling ${amount} tokens would return: ${ethers.formatEther(ethReturn)} ETH`);
      } catch (error) {
        console.log(`Cannot sell ${amount} tokens - ${error.reason || 'insufficient liquidity'}`);
      }
    }
    
    // Check the constant product
    const k = tokenInfo.ethReserve * tokenInfo.tokenReserve;
    console.log('\n=== AMM Math ===');
    console.log('k (constant product):', k.toString());
    console.log('Virtual ETH Reserve:', ethers.formatEther(ethers.parseEther('1')), 'ETH (hardcoded in contract)');
    console.log('Virtual Token Reserve:', ethers.formatEther(ethers.parseEther('1000000')), 'tokens (hardcoded in contract)');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkLiquidity();