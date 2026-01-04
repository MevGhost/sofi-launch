const { ethers } = require('ethers');
const DevBondingCurveV2 = require('../abis/DevBondingCurveV2.json');
const DevBondingCurveV2ABI = DevBondingCurveV2.abi;

async function testSync() {
  const tokenAddress = '0x8d6edc8edbaeb7bf0d09cd2e8bd07a196239680f';
  const factoryAddress = '0x46eCf02772C4Bc9a5cd440FB93022d6e268355c8';
  
  const provider = new ethers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/XK8ZLRP2DVEi2di5M9Yz0');
  const contract = new ethers.Contract(factoryAddress, DevBondingCurveV2ABI, provider);
  
  try {
    console.log('Testing token:', tokenAddress);
    console.log('Factory:', factoryAddress);
    
    // Check if token is valid
    const isValid = await contract.isValidToken(tokenAddress);
    console.log('\nToken is valid:', isValid);
    
    // Get full token info
    const fullInfo = await contract.getFullTokenInfo(tokenAddress);
    console.log('\nFull Token Info:');
    console.log('Creator:', fullInfo[0]);
    console.log('Virtual ETH Reserve:', ethers.formatEther(fullInfo[1]));
    console.log('Virtual Token Reserve:', ethers.formatEther(fullInfo[2]));
    console.log('Real ETH Reserve:', ethers.formatEther(fullInfo[3]));
    console.log('Real Token Reserve:', ethers.formatEther(fullInfo[4]));
    console.log('k:', fullInfo[5].toString());
    console.log('Graduated:', fullInfo[6]);
    
    // Get regular token info
    const tokenInfo = await contract.tokenInfo(tokenAddress);
    console.log('\nToken Info Struct:');
    console.log('Token Address:', tokenInfo[0]);
    console.log('Creator:', tokenInfo[1]);
    console.log('Real ETH Reserve:', ethers.formatEther(tokenInfo[2]));
    console.log('Real Token Reserve:', ethers.formatEther(tokenInfo[3]));
    console.log('k:', tokenInfo[4].toString());
    
    // Get price and market cap
    const price = await contract.getTokenPrice(tokenAddress);
    console.log('\nPrice:', ethers.formatEther(price), 'ETH');
    
    const marketCap = await contract.calculateMarketCap(tokenAddress);
    console.log('Market Cap:', ethers.formatEther(marketCap), 'ETH');
    
    const bondingProgress = await contract.bondingProgress(tokenAddress);
    console.log('Bonding Progress:', bondingProgress.toString(), '%');
    
    // Test token metadata
    const tokenContract = new ethers.Contract(
      tokenAddress,
      [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function creator() view returns (address)',
      ],
      provider
    );
    
    const [name, symbol, creator] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.creator(),
    ]);
    
    console.log('\nToken Metadata:');
    console.log('Name:', name);
    console.log('Symbol:', symbol);
    console.log('Creator:', creator);
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.data) {
      console.error('Error data:', error.data);
    }
  }
}

testSync();