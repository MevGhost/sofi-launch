import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateTestTokens() {
  try {
    console.log('Updating test tokens with realistic market data...');
    
    // Update DFSASDFA token
    await prisma.token.update({
      where: { address: '0xde7afc6fed884d4ce8a1fce4b6fb80b9caf98607' },
      data: {
        marketCap: '45000', // $45k market cap
        liquidity: '15000', // $15k liquidity
        bondingProgress: 65.2, // 65.2% to graduation
        currentPrice: '0.000045', // Price in ETH
        volume24h: '8500',
        holdersCount: 42,
      }
    });
    
    // Update QWERWQRE token
    await prisma.token.update({
      where: { address: '0x93a136983a836a75662593aae7ca7dc9cd0af4be' },
      data: {
        marketCap: '28000', // $28k market cap
        liquidity: '9000', // $9k liquidity
        bondingProgress: 40.5, // 40.5% to graduation
        currentPrice: '0.000028',
        volume24h: '5200',
        holdersCount: 23,
      }
    });
    
    // Update SDAFSADF token
    await prisma.token.update({
      where: { address: '0x24c8c47641468d860cb1e7876c23f3f3565cc446' },
      data: {
        marketCap: '12500', // $12.5k market cap
        liquidity: '4200', // $4.2k liquidity
        bondingProgress: 18.1, // 18.1% to graduation
        currentPrice: '0.000012',
        volume24h: '2100',
        holdersCount: 15,
      }
    });
    
    console.log('Test tokens updated successfully!');
  } catch (error) {
    console.error('Error updating test tokens:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTestTokens();