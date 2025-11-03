import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

async function createTestToken() {
  try {
    console.log('🗑️  Deleting existing MOON tokens...');
    
    // First delete all trades related to MOON tokens
    const moonTokens = await prisma.token.findMany({
      where: { symbol: 'MOON' }
    });
    
    for (const token of moonTokens) {
      await prisma.trade.deleteMany({
        where: { tokenId: token.id }
      });
      
      await prisma.tokenHolder.deleteMany({
        where: { tokenId: token.id }
      });
    }
    
    // Delete MOON tokens
    await prisma.token.deleteMany({
      where: { symbol: 'MOON' }
    });
    
    console.log('✅ Deleted existing MOON tokens');
    
    // Create a test user if not exists
    const creatorAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7';
    const testUser = await prisma.user.upsert({
      where: { address: creatorAddress },
      update: {},
      create: {
        address: creatorAddress,
        name: 'Moon Dev',
        role: 'team',
        nonce: Math.floor(Math.random() * 1000000).toString(),
      }
    });
    
    console.log('✅ Test user ready:', testUser.name || testUser.address);
    
    // Generate a proper address for the new token
    const wallet = ethers.Wallet.createRandom();
    const tokenAddress = wallet.address.toLowerCase();
    const bondingCurveWallet = ethers.Wallet.createRandom();
    const bondingCurveAddress = bondingCurveWallet.address.toLowerCase();
    
    console.log('🚀 Creating new MOON token with address:', tokenAddress);
    
    // Create a comprehensive test token
    const newToken = await prisma.token.create({
      data: {
        address: tokenAddress,
        name: 'MoonShot Token',
        symbol: 'MOON',
        description: 'MoonShot is the next-gen meme token built on Base L2. With innovative bonding curve mechanics and automatic liquidity provision, MOON is designed to take the community to astronomical heights. Join us on this journey to the moon!',
        imageUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=MOON&backgroundColor=1e40af',
        totalSupply: '1000000000000000000000000000', // 1 billion * 10^18
        bondingCurveType: 'constant',
        bondingCurveAddress: bondingCurveAddress,
        status: 'ACTIVE',
        marketCap: '2000',
        liquidity: '1.5',
        bondingProgress: 2.89, // $2000 / $69000 * 100
        holdersCount: 15,
        volume24h: '5000',
        change24h: 15.5,
        creatorId: testUser.id,
        deploymentTx: '0x' + Math.random().toString(16).substring(2, 66),
        chainId: '84532', // Base Sepolia
        
        // Social links
        twitter: 'https://twitter.com/moonshot_base',
        telegram: 'https://t.me/moonshot_base',
        website: 'https://moonshot.base',
        
        // Timestamps
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      }
    });
    
    console.log('✅ Created new token:', newToken.address);
    
    // Create some holders
    const holderAddresses = [
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7', // Creator
      '0x5aAeb6053f3E94C9b9A09f33669435E7Ef1BeAed',
      '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359',
      '0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB',
      '0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb',
    ];
    
    console.log('👥 Creating holders...');
    
    for (let i = 0; i < holderAddresses.length; i++) {
      const balance = (100000000 * Math.pow(0.5, i)).toString(); // Decreasing balances
      const percentage = (parseFloat(balance) / 800000000) * 100;
      
      // Create user for each holder
      const holderUser = await prisma.user.upsert({
        where: { address: holderAddresses[i] },
        update: {},
        create: {
          address: holderAddresses[i],
          name: i === 0 ? 'Moon Dev' : `Holder ${i + 1}`,
          role: 'team',
          nonce: Math.floor(Math.random() * 1000000).toString(),
        }
      });
      
      await prisma.tokenHolder.create({
        data: {
          tokenId: newToken.id,
          tokenAddress: newToken.address,
          userId: holderUser.id,
          balance: balance,
          percentOwned: percentage,
          firstBuyAt: new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000),
          totalBought: balance,
        }
      });
    }
    
    console.log('✅ Created', holderAddresses.length, 'holders');
    
    // Create some recent trades
    console.log('📊 Creating trade history...');
    
    const tradeTypes = ['buy', 'sell', 'buy', 'buy', 'sell', 'buy', 'buy', 'buy', 'sell', 'buy'];
    const now = Date.now();
    
    for (let i = 0; i < tradeTypes.length; i++) {
      const tokenAmount = (Math.random() * 10000 + 1000).toFixed(0);
      const ethAmount = (Math.random() * 0.1 + 0.01).toFixed(6);
      const trade = await prisma.trade.create({
        data: {
          tokenId: newToken.id,
          type: tradeTypes[i] === 'buy' ? 'BUY' : 'SELL',
          trader: holderAddresses[i % holderAddresses.length],
          amount: tokenAmount,
          price: (0.000002 * (1 + Math.random() * 0.1 - 0.05)).toFixed(9),
          totalCost: tradeTypes[i] === 'buy' ? ethAmount : undefined,
          totalReceived: tradeTypes[i] === 'sell' ? ethAmount : undefined,
          transactionHash: '0x' + Math.random().toString(16).substring(2, 66),
          gasUsed: (150000 + Math.random() * 50000).toFixed(0),
          timestamp: new Date(now - (10 - i) * 60 * 60 * 1000), // Last 10 hours
        }
      });
    }
    
    console.log('✅ Created', tradeTypes.length, 'trades');
    
    // Output summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Test token created successfully!');
    console.log('='.repeat(50));
    console.log('Token Address:', tokenAddress);
    console.log('Token Symbol: MOON');
    console.log('Token Name: MoonShot Token');
    console.log('Market Cap: $2,000');
    console.log('Bonding Progress: 2.89%');
    console.log('Holders: 5');
    console.log('Trades: 10');
    console.log('='.repeat(50));
    console.log(`\n🔗 View token at: http://localhost:3000/token/${tokenAddress}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestToken();