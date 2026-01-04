import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function seedTestData() {
  console.log('🌱 Seeding test data...');

  try {
    // Test addresses (you can replace with your actual wallet address)
    const testUserAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7';
    const testKolAddress = '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4';
    const testTokenAddress = '0x' + Math.random().toString(16).substr(2, 40);
    const testEscrowAddress = '0x' + Math.random().toString(16).substr(2, 40);

    // Create or update test users
    const testUser = await prisma.user.upsert({
      where: { address: testUserAddress.toLowerCase() },
      update: {
        name: 'Alex Developer',
        bio: 'Building the future of Web3, one token at a time. Passionate about DeFi and community-driven projects. Twitter: @alexdev | Telegram: @alexdev_tg',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
        role: 'team',
        chainType: 'evm',
      },
      create: {
        address: testUserAddress.toLowerCase(),
        name: 'Alex Developer',
        bio: 'Building the future of Web3, one token at a time. Passionate about DeFi and community-driven projects. Twitter: @alexdev | Telegram: @alexdev_tg',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
        role: 'team',
        chainType: 'evm',
      },
    });

    const testKol = await prisma.user.upsert({
      where: { address: testKolAddress.toLowerCase() },
      update: {
        name: 'CryptoInfluencer',
        bio: 'Top crypto KOL with 500K+ followers. Specializing in token analysis and project promotion. Twitter: @cryptokol | Telegram: @cryptokol_official',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kol',
        role: 'team',
        chainType: 'evm',
      },
      create: {
        address: testKolAddress.toLowerCase(),
        name: 'CryptoInfluencer',
        bio: 'Top crypto KOL with 500K+ followers. Specializing in token analysis and project promotion. Twitter: @cryptokol | Telegram: @cryptokol_official',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kol',
        role: 'team',
        chainType: 'evm',
      },
    });

    console.log('✅ Users created/updated');

    // Create a detailed test token
    const testToken = await prisma.token.upsert({
      where: { address: testTokenAddress },
      update: {},
      create: {
        address: testTokenAddress,
        name: 'MoonShot Token',
        symbol: 'MOON',
        description: 'MoonShot is the next-generation DeFi token built on Base. Our innovative bonding curve mechanism ensures fair distribution and sustainable growth. Join our community of over 10,000 holders!',
        imageUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=moonshot',
        totalSupply: '1000000000', // 1 billion
        bondingCurveType: 'EXPONENTIAL',
        bondingCurveAddress: '0x' + Math.random().toString(16).substr(2, 40),
        bondingProgress: 75.5,
        marketCap: '2500000', // $2.5M
        liquidity: '500000', // $500K
        volume24h: '180000', // $180K
        change24h: 15.7,
        holdersCount: 1234,
        creatorId: testUser.id,
        deploymentTx: '0x' + Math.random().toString(16).substr(2, 64),
        chainId: '84532',
        twitter: 'moonshottoken',
        telegram: 'moonshotcommunity',
        website: 'https://moonshottoken.xyz',
        status: 'ACTIVE',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
    });

    console.log('✅ Token created:', testToken.address);

    // Create test trades for the token
    const trades = [];
    for (let i = 0; i < 10; i++) {
      const isYesterday = i < 5;
      const timestamp = isYesterday 
        ? new Date(Date.now() - (24 + i) * 60 * 60 * 1000) // Yesterday
        : new Date(Date.now() - i * 60 * 60 * 1000); // Today
      
      const amount = (Math.random() * 10000).toFixed(2);
      const price = (Math.random() * 0.01).toFixed(6);
      const totalCost = (parseFloat(amount) * parseFloat(price)).toFixed(4);
      
      trades.push({
        tokenId: testToken.id,
        trader: i % 2 === 0 ? testUserAddress.toLowerCase() : testKolAddress.toLowerCase(),
        type: i % 3 === 0 ? 'SELL' : 'BUY',
        amount: amount,
        price: price,
        totalCost: i % 3 === 0 ? undefined : totalCost,
        totalReceived: i % 3 === 0 ? totalCost : undefined,
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
        gasUsed: (Math.random() * 100000).toFixed(0),
        timestamp: timestamp,
      });
    }

    await prisma.trade.createMany({
      data: trades,
      skipDuplicates: true,
    });

    console.log('✅ Trades created:', trades.length);

    // Create a detailed test escrow
    const testEscrow = await prisma.escrow.create({
      data: {
        contractAddress: testEscrowAddress,
        factoryAddress: '0xdFA01a79fb8Bb816BC77aE9cC6C2404b87c2cd18',
        chainId: '84532',
        chainEscrowId: '1',
        blockNumber: BigInt(1000000),
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
        projectName: 'MoonShot Marketing Campaign',
        dealType: 'MARKETING',
        dealDescription: 'Comprehensive marketing campaign for MoonShot Token including: Twitter promotion to 500K+ followers, Telegram community management, YouTube video reviews, and AMA sessions. Expected to drive 10x growth in holder count.',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        projectAddress: testUserAddress.toLowerCase(),
        kolAddress: testKolAddress.toLowerCase(),
        tokenAddress: testTokenAddress,
        tokenSymbol: 'MOON',
        tokenDecimals: 18,
        totalAmount: '50000', // 50,000 MOON tokens
        releasedAmount: '10000', // 10,000 already released
        requireVerification: true,
        verificationMethod: 'COMMUNITY',
        verificationThreshold: 3,
        clawbackDeadline: 7,
        chain: 'base-sepolia',
        status: 'ACTIVE',
        
        // Create milestones
        milestones: {
          create: [
            {
              title: 'Campaign Kickoff',
              description: 'Initial Twitter announcement and Telegram group setup. First promotional posts across all channels.',
              amount: '10000',
              percentage: 20,
              releaseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              released: true,
              verified: true,
              conditions: ['Twitter announcement with 10K+ impressions', 'Telegram group with 500+ members'],
              
              submissions: {
                create: {
                  proofUrl: 'https://twitter.com/cryptokol/status/1234567890',
                  description: 'Successfully launched campaign with 15K impressions on announcement tweet',
                  evidenceLinks: [
                    'https://twitter.com/cryptokol/status/1234567890',
                    'https://t.me/moonshotcommunity'
                  ],
                  status: 'APPROVED',
                  submittedBy: testKolAddress.toLowerCase(),
                  reviewedBy: testUserAddress.toLowerCase(),
                  reviewComments: 'Great start! Exceeded impression targets.',
                  submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                  reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                },
              },
            },
            {
              title: 'Community Growth Phase',
              description: 'Drive community growth through daily engagement, contests, and AMAs. Target: 2000+ new holders.',
              amount: '15000',
              percentage: 30,
              releaseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              released: false,
              verified: false,
              conditions: ['2000+ new holders', 'Daily engagement posts', 'Host 2 AMAs'],
              
              submissions: {
                create: {
                  proofUrl: 'https://dune.com/moonshot/holders',
                  description: 'In progress - currently at 1500 new holders',
                  evidenceLinks: ['https://dune.com/moonshot/holders'],
                  status: 'PENDING',
                  submittedBy: testKolAddress.toLowerCase(),
                  submittedAt: new Date(),
                },
              },
            },
            {
              title: 'YouTube Review & Influencer Outreach',
              description: 'Produce high-quality YouTube review video and coordinate with 5+ micro-influencers for additional coverage.',
              amount: '15000',
              percentage: 30,
              releaseDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
              released: false,
              verified: false,
              conditions: ['YouTube video with 50K+ views', 'Collaborations with 5+ influencers'],
            },
            {
              title: 'Final Push & Graduation',
              description: 'Final marketing push to reach bonding curve graduation. Coordinate listing announcements and celebration events.',
              amount: '10000',
              percentage: 20,
              releaseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              released: false,
              verified: false,
              conditions: ['Token graduation achieved', 'DEX listing announcement', 'Community celebration event'],
            },
          ],
        },

        // Add verifiers
        verifiers: {
          create: [
            {
              address: '0x' + Math.random().toString(16).substr(2, 40),
              addedBy: testUserAddress.toLowerCase(),
              addedAt: new Date(),
            },
            {
              address: '0x' + Math.random().toString(16).substr(2, 40),
              addedBy: testUserAddress.toLowerCase(),
              addedAt: new Date(),
            },
          ],
        },
      },
      include: {
        milestones: {
          include: {
            submissions: true,
          },
        },
        verifiers: true,
        kolUser: true,
        projectUser: true,
      },
    });

    console.log('✅ Escrow created:', testEscrow.contractAddress);

    // Create activities for the escrow
    const activities = [
      {
        escrowId: testEscrow.id,
        userAddress: testUserAddress.toLowerCase(),
        action: 'ESCROW_CREATED',
        details: { projectName: 'MoonShot Marketing Campaign', totalAmount: '50000' },
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        escrowId: testEscrow.id,
        userAddress: testUserAddress.toLowerCase(),
        action: 'ESCROW_FUNDED',
        details: { amount: '50000', tokenSymbol: 'MOON' },
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        escrowId: testEscrow.id,
        userAddress: testKolAddress.toLowerCase(),
        action: 'MILESTONE_SUBMITTED',
        details: { milestoneTitle: 'Campaign Kickoff', proofUrl: 'https://twitter.com/cryptokol/status/1234567890' },
        transactionHash: null,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        escrowId: testEscrow.id,
        userAddress: testUserAddress.toLowerCase(),
        action: 'MILESTONE_APPROVED',
        details: { milestoneTitle: 'Campaign Kickoff', amount: '10000' },
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        escrowId: testEscrow.id,
        userAddress: testUserAddress.toLowerCase(),
        action: 'MILESTONE_RELEASED',
        details: { milestoneTitle: 'Campaign Kickoff', amount: '10000', tokenSymbol: 'MOON' },
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ];

    await prisma.activity.createMany({
      data: activities,
      skipDuplicates: true,
    });

    console.log('✅ Activities created:', activities.length);

    // Create token holder entry for the test user
    await prisma.tokenHolder.upsert({
      where: {
        tokenAddress_userId: {
          userId: testUser.id,
          tokenAddress: testTokenAddress,
        },
      },
      update: {
        balance: '25000',
        percentOwned: 2.5,
        totalBought: '50000',
        totalSold: '25000',
        realizedPnl: '125',
        unrealizedPnl: '312.5',
      },
      create: {
        tokenId: testToken.id,
        tokenAddress: testTokenAddress,
        userId: testUser.id,
        balance: '25000',
        percentOwned: 2.5,
        firstBuyAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        totalBought: '50000',
        totalSold: '25000',
        realizedPnl: '125',
        unrealizedPnl: '312.5',
      },
    });

    console.log('✅ Token holder entry created');

    // Summary
    console.log('\n📊 Test Data Summary:');
    console.log('====================');
    console.log(`Token: ${testToken.name} (${testToken.symbol})`);
    console.log(`  Address: ${testToken.address}`);
    console.log(`  Market Cap: $${parseInt(testToken.marketCap).toLocaleString()}`);
    console.log(`  Holders: ${testToken.holdersCount}`);
    console.log(`  Bonding Progress: ${testToken.bondingProgress}%`);
    console.log(`\nEscrow: ${testEscrow.projectName}`);
    console.log(`  Address: ${testEscrow.contractAddress}`);
    console.log(`  Total Amount: ${testEscrow.totalAmount} MOON`);
    console.log(`  Milestones: ${testEscrow.milestones.length}`);
    console.log(`  Status: ${testEscrow.status}`);
    console.log(`\nUsers:`);
    console.log(`  Project Owner: ${testUser.name} (${testUser.address})`);
    console.log(`  KOL: ${testKol.name} (${testKol.address})`);
    console.log('\n✨ Test data seeding completed successfully!');
    console.log('\n💡 You can now test with these addresses in the frontend.');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedTestData()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });