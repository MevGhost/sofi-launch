import { PrismaClient } from '../generated/prisma';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user first
  const adminUser = await prisma.user.upsert({
    where: { address: '0x33742d3feede42eeb82e65a0155bd46b693a69f5' },
    update: {},
    create: {
      address: '0x33742d3feede42eeb82e65a0155bd46b693a69f5',
      role: 'admin',
      name: 'Admin',
    },
  });

  // Create admin settings
  const adminPin = '1234'; // This should be changed in production
  const hashedPin = hashSync(adminPin, 10);
  
  await prisma.settings.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      adminPin: hashedPin,
      adminAddresses: [
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Hardhat default account 0
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Hardhat default account 1
      ],
      maintenanceMode: false,
      announcement: 'Welcome to TokenFlow on Base Sepolia!',
      userId: adminUser.id,
    },
  });

  console.log('✅ Admin user and settings created');

  // Create test users
  const testUsers = [
    {
      address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      name: 'Project Alpha',
      email: 'project@example.com',
      bio: 'Leading DeFi project on Base',
    },
    {
      address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      name: 'KOL Influencer',
      email: 'kol@example.com',
      bio: 'Crypto influencer with 100k+ followers',
    },
    {
      address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      name: 'Verifier One',
      email: 'verifier@example.com',
      bio: 'Professional escrow verifier',
    },
  ];

  for (const userData of testUsers) {
    await prisma.user.upsert({
      where: { address: userData.address },
      update: {},
      create: userData,
    });
  }

  console.log('✅ Test users created');

  // Create a sample escrow (without on-chain deployment)
  const sampleEscrow = await prisma.escrow.create({
    data: {
      contractAddress: '0x1234567890123456789012345678901234567890',
      factoryAddress: '0xdFA01a79fb8Bb816BC77aE9cC6C2404b87c2cd18',
      chainId: '84532', // Base Sepolia
      blockNumber: BigInt(1000000),
      transactionHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
      
      projectName: 'DeFi Marketing Campaign',
      dealType: 'marketing',
      dealDescription: 'Comprehensive marketing campaign for our new DeFi protocol launch',
      startDate: new Date('2025-08-01'),
      endDate: new Date('2025-12-31'),
      
      projectAddress: testUsers[0]?.address || '0x0000000000000000000000000000000000000000',
      kolAddress: testUsers[1]?.address || '0x0000000000000000000000000000000000000000',
      
      tokenAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
      tokenSymbol: 'USDC',
      tokenDecimals: 6,
      totalAmount: '10000000000', // 10,000 USDC
      
      requireVerification: true,
      verificationMethod: 'MAJORITY',
      disputeResolutionMethod: 'ADMIN',
      
      milestones: {
        create: [
          {
            milestoneIndex: 0,
            title: 'Initial Campaign Setup',
            description: 'Set up social media accounts and initial content',
            amount: '2000000000', // 2,000 USDC
            percentage: 20,
            releaseDate: new Date('2025-08-15'),
            conditions: ['Social media accounts created', 'Initial content posted'],
          },
          {
            milestoneIndex: 1,
            title: 'Mid-Campaign Review',
            description: 'Reach 50% of target metrics',
            amount: '3000000000', // 3,000 USDC
            percentage: 30,
            releaseDate: new Date('2025-10-01'),
            conditions: ['50k impressions achieved', 'Engagement rate above 5%'],
          },
          {
            milestoneIndex: 2,
            title: 'Campaign Completion',
            description: 'Full campaign delivery and metrics',
            amount: '5000000000', // 5,000 USDC
            percentage: 50,
            releaseDate: new Date('2025-12-15'),
            conditions: ['100k+ impressions', 'All content delivered', 'Final report submitted'],
          },
        ],
      },
      
      verifiers: {
        create: [
          {
            address: testUsers[2]?.address || '0x0000000000000000000000000000000000000000',
          },
        ],
      },
    },
  });

  console.log('✅ Sample escrow created');

  // Add some activity logs
  await prisma.activity.createMany({
    data: [
      {
        escrowId: sampleEscrow.id,
        userAddress: testUsers[0]?.address || '0x0000000000000000000000000000000000000000',
        action: 'ESCROW_CREATED',
        details: { projectName: 'DeFi Marketing Campaign' },
      },
      {
        escrowId: sampleEscrow.id,
        userAddress: testUsers[2]?.address || '0x0000000000000000000000000000000000000000',
        action: 'VERIFIER_ADDED',
        details: { role: 'verifier' },
      },
    ],
  });

  console.log('✅ Activity logs created');
  console.log('🎉 Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });