const { PrismaClient } = require('@prisma/client');
const ethers = require('ethers');

async function addToken() {
  const prisma = new PrismaClient();
  
  const tokenAddress = '0x927eb6d44537ce02be945940a74a21c6c0e24036';
  const creatorAddress = '0x33742d3feede42eeb82e65a0155bd46b693a69f5';
  
  try {
    // First, ensure the creator user exists
    let user = await prisma.user.findUnique({
      where: { address: creatorAddress }
    });
    
    if (!user) {
      console.log('Creating user for creator...');
      user = await prisma.user.create({
        data: {
          address: creatorAddress,
          username: `user_${creatorAddress.slice(2, 8)}`,
          isVerified: false
        }
      });
    }
    
    // Check if token already exists
    const existingToken = await prisma.token.findUnique({
      where: { address: tokenAddress }
    });
    
    if (existingToken) {
      console.log('Token already exists in database');
      return;
    }
    
    // Add token with minimal required fields
    const dbToken = await prisma.token.create({
      data: {
        address: tokenAddress,
        name: 'f',
        symbol: 'AFA',
        description: 'f',
        imageUrl: '',
        totalSupply: '1000000000',
        bondingCurveAddress: '0xd120242c95b2334981b45e230900cac115ef3f49',
        creatorId: user.id,
        deploymentTx: '0x8af2d2a5c385a8bf5849bafa9c21e4afcca2f16c9195c781da7e082f6b0ec745',
        chainId: '84532', // Base Sepolia
        marketCap: '1.274163545',
        liquidity: '0.01',
        bondingProgress: 0.00184,
        volume24h: '0.01',
        status: 'ACTIVE'
      }
    });
    
    console.log('Token added successfully!');
    console.log('Token ID:', dbToken.id);
    console.log('Token Address:', dbToken.address);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

addToken();