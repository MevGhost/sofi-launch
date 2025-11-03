const { PrismaClient } = require('@prisma/client');
const { ethers } = require('ethers');

const prisma = new PrismaClient();

async function manualImport() {
  const tokenAddress = '0x8d6edc8edbaeb7bf0d09cd2e8bd07a196239680f';
  const factoryAddress = '0x46eCf02772C4Bc9a5cd440FB93022d6e268355c8';
  
  try {
    // Check if token exists
    const existing = await prisma.token.findUnique({
      where: { address: tokenAddress.toLowerCase() }
    });
    
    if (existing) {
      console.log('Token already exists:', existing.symbol);
      return;
    }
    
    // Create/find creator user
    let creator = await prisma.user.findUnique({
      where: { address: '0x33742d3feede42eeb82e65a0155bd46b693a69f5' }
    });
    
    if (!creator) {
      creator = await prisma.user.create({
        data: {
          address: '0x33742d3feede42eeb82e65a0155bd46b693a69f5',
          name: 'GUM Creator'
        }
      });
    }
    
    // Create token
    const token = await prisma.token.create({
      data: {
        address: tokenAddress.toLowerCase(),
        name: 'constantly chewing gum',
        symbol: 'GUM',
        description: '',
        imageUrl: '',
        twitter: '',
        telegram: '',
        website: '',
        totalSupply: '1000000000',
        bondingCurveType: 'constant',
        bondingCurveAddress: factoryAddress,
        status: 'ACTIVE',
        marketCap: '3820', // ~1.27 ETH * $3000
        liquidity: '30', // 0.01 ETH * $3000  
        bondingProgress: 5.5, // $3820 / $69000
        holdersCount: 1,
        volume24h: '30',
        change24h: 0,
        creatorId: creator.id,
        deploymentTx: '0xb89fcbc7603d1e3f9189b82b80f2d74d096972eaee4408a0fe335e0ed2504d85',
        chainId: '84532',
        createdAt: new Date()
      }
    });
    
    console.log('Token imported successfully:', token.symbol);
    
    // Create holder record for creator
    await prisma.tokenHolder.create({
      data: {
        userId: creator.id,
        tokenId: token.id,
        tokenAddress: tokenAddress.toLowerCase(),
        balance: '7930693.069306930693069307',
        percentOwned: 0.79,
        firstBuyAt: new Date(),
        totalBought: '30',
        totalSold: '0'
      }
    });
    
    console.log('Holder record created');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

manualImport();