import { ethers } from 'ethers';

const DevBondingCurveABI = [
  'function tokenInfo(address) view returns (address creator, uint256 ethReserve, uint256 tokenReserve, uint256 realEthReserve, uint256 realTokenReserve, uint256 totalEthTraded, uint256 totalTokensTraded, uint256 createdAt, bool graduated)',
  'function getTokenPrice(address) view returns (uint256)',
  'function calculateSellReturn(address token, uint256 tokenAmount) view returns (uint256)',
  'function VIRTUAL_ETH_RESERVE() view returns (uint256)',
  'function VIRTUAL_TOKEN_RESERVE() view returns (uint256)',
];

async function checkTokenReserves() {
  const tokenAddress = '0xd0baa5311a034bba41bfb0e1a7acd490d7638b5b';
  const factoryAddress = '0xD120242C95B2334981B45e230900Cac115eF3f49';
  
  const provider = new ethers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/XK8ZLRP2DVEi2di5M9Yz0');
  const contract = new ethers.Contract(factoryAddress, DevBondingCurveABI, provider);
  
  try {
    // Get token info
    const tokenInfo = await contract.tokenInfo(tokenAddress);
    const virtualEth = await contract.VIRTUAL_ETH_RESERVE();
    const virtualToken = await contract.VIRTUAL_TOKEN_RESERVE();
    
    console.log('Token Address:', tokenAddress);
    console.log('\n=== Reserves ===');
    console.log('ETH Reserve (with virtual):', ethers.formatEther(tokenInfo.ethReserve), 'ETH');
    console.log('Token Reserve (with virtual):', ethers.formatEther(tokenInfo.tokenReserve), 'tokens');
    console.log('Real ETH Reserve:', ethers.formatEther(tokenInfo.realEthReserve), 'ETH');
    console.log('Real Token Reserve:', ethers.formatEther(tokenInfo.realTokenReserve), 'tokens');
    
    console.log('\n=== Virtual Reserves ===');
    console.log('Virtual ETH:', ethers.formatEther(virtualEth), 'ETH');
    console.log('Virtual Token:', ethers.formatEther(virtualToken), 'tokens');
    
    console.log('\n=== Trading History ===');
    console.log('Total ETH Traded:', ethers.formatEther(tokenInfo.totalEthTraded), 'ETH');
    console.log('Total Tokens Traded:', ethers.formatEther(tokenInfo.totalTokensTraded), 'tokens');
    
    // Calculate what would happen if you tried to sell
    const tokenAmount = ethers.parseEther('8323107'); // Your balance
    try {
      const sellReturn = await contract.calculateSellReturn(tokenAddress, tokenAmount);
      console.log('\n=== Sell Calculation ===');
      console.log('Selling:', ethers.formatEther(tokenAmount), 'tokens');
      console.log('Would receive:', ethers.formatEther(sellReturn), 'ETH');
    } catch (error) {
      console.log('\n=== Sell Calculation ===');
      console.log('Cannot sell - insufficient liquidity');
      console.log('Error:', error.message);
    }
    
    // Calculate current price
    const price = await contract.getTokenPrice(tokenAddress);
    console.log('\n=== Current Price ===');
    console.log('Price per token:', ethers.formatEther(price), 'ETH');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTokenReserves();