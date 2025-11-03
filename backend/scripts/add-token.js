const { PrismaClient } = require('@prisma/client');
const ethers = require('ethers');

async function addToken() {
  const prisma = new PrismaClient();
  const provider = new ethers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/XK8ZLRP2DVEi2di5M9Yz0');
  
  const tokenAddress = '0x927eb6d44537ce02be945940a74a21c6c0e24036';
  const factoryAddress = '0xD120242C95B2334981B45e230900Cac115eF3f49';
  
  try {
    // Get token info
    const DevBondingCurveABI = require('../abis/DevBondingCurve.json');
    const factory = new ethers.Contract(factoryAddress, DevBondingCurveABI, provider);
    
    const tokenInfo = await factory.tokenInfo(tokenAddress);
    
    // Get token details
    const ERC20ABI = [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function totalSupply() view returns (uint256)',
      'function imageUrl() view returns (string)',
      'function description() view returns (string)'
    ];
    
    const token = new ethers.Contract(tokenAddress, ERC20ABI, provider);
    
    const name = await token.name();
    const symbol = await token.symbol();
    const totalSupply = await token.totalSupply();
    
    // Try to get additional metadata
    let imageUrl = '';
    let description = '';
    
    try {
      imageUrl = await token.imageUrl();
    } catch (e) {}
    
    try {
      description = await token.description();
    } catch (e) {}
    
    // Calculate price and market cap
    const price = await factory.getTokenPrice(tokenAddress);
    const marketCap = await factory.calculateMarketCap(tokenAddress);
    
    console.log('Adding token to database...');
    console.log('Name:', name);
    console.log('Symbol:', symbol);
    console.log('Address:', tokenAddress);
    console.log('Creator:', tokenInfo.creator);
    
    // Check if token already exists
    const existingToken = await prisma.token.findUnique({
      where: { address: tokenAddress.toLowerCase() }
    });
    
    if (existingToken) {
      console.log('Token already exists in database, updating...');
      
      const dbToken = await prisma.token.update({
        where: { address: tokenAddress.toLowerCase() },
        data: {
          price: ethers.formatEther(price),
          marketCap: ethers.formatEther(marketCap),
          liquidity: ethers.formatEther(tokenInfo.realEthReserve),
          virtualEthReserve: ethers.formatEther(tokenInfo.virtualEthReserve),
          virtualTokenReserve: ethers.formatEther(tokenInfo.virtualTokenReserve),
          realEthReserve: ethers.formatEther(tokenInfo.realEthReserve),
          realTokenReserve: ethers.formatEther(tokenInfo.realTokenReserve),
          updatedAt: new Date()
        }
      });
      
      console.log('\nToken updated successfully!');
    } else {
      // Add to database
      const dbToken = await prisma.token.create({
        data: {
          address: tokenAddress.toLowerCase(),
          name: name || 'Unknown',
          symbol: symbol || 'UNKNOWN',
          description: description || '',
          imageUrl: imageUrl || '',
          creator: tokenInfo.creator.toLowerCase(),
          price: ethers.formatEther(price),
          marketCap: ethers.formatEther(marketCap),
          liquidity: ethers.formatEther(tokenInfo.realEthReserve),
          volume24h: '0',
          priceChange24h: 0,
          holders: '[]',
          holdersCount: 0,
          status: tokenInfo.graduated ? 'graduated' : 'active',
          virtualEthReserve: ethers.formatEther(tokenInfo.virtualEthReserve),
          virtualTokenReserve: ethers.formatEther(tokenInfo.virtualTokenReserve),
          realEthReserve: ethers.formatEther(tokenInfo.realEthReserve),
          realTokenReserve: ethers.formatEther(tokenInfo.realTokenReserve),
          totalSupply: ethers.formatEther(totalSupply),
          bondingCurveAddress: factoryAddress.toLowerCase(),
          transactionHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
          createdAt: new Date(Number(tokenInfo.createdAt) * 1000),
          updatedAt: new Date()
        }
      });
      
      console.log('\nToken added successfully!');
      console.log('Database ID:', dbToken.id);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addToken();