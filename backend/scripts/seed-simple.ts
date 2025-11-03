import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.activity.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.verifier.deleteMany();
  await prisma.escrow.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleared existing data');

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      address: '0x33742d3feede42eeb82e65a0155bd46b693a69f5',
      role: 'admin',
      nonce: Math.floor(Math.random() * 1000000).toString(),
      lastActive: new Date(),
    },
  });

  console.log('✅ Created admin user:', admin.address);

  // Create one team member
  const team = await prisma.user.create({
    data: {
      address: '0x1234567890123456789012345678901234567890',
      role: 'team',
      nonce: Math.floor(Math.random() * 1000000).toString(),
      lastActive: new Date(),
    },
  });

  // Create one KOL
  const kol = await prisma.user.create({
    data: {
      address: '0x2345678901234567890123456789012345678901',
      role: 'kol',
      nonce: Math.floor(Math.random() * 1000000).toString(),
      lastActive: new Date(),
    },
  });

  // Create one verifier
  const verifier = await prisma.user.create({
    data: {
      address: '0x3456789012345678901234567890123456789012',
      role: 'verifier',
      nonce: Math.floor(Math.random() * 1000000).toString(),
      lastActive: new Date(),
    },
  });

  console.log('✅ Created users');

  // Create one escrow
  const escrow = await prisma.escrow.create({
    data: {
      contractAddress: '0x4567890123456789012345678901234567890123',
      factoryAddress: '0x5678901234567890123456789012345678901234',
      chainId: '84532',
      blockNumber: BigInt(1000000),
      transactionHash: '0x' + '0'.repeat(64),
      projectName: 'Test Escrow',
      dealType: 'influencer-marketing',
      dealDescription: 'Test escrow for platform demo',
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      projectAddress: team.address,
      kolAddress: kol.address,
      tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      tokenSymbol: 'USDC',
      tokenDecimals: 6,
      totalAmount: '10000',
      status: 'ACTIVE',
      requireVerification: true,
    },
  });

  console.log('✅ Created escrow');

  // Create milestones
  for (let i = 0; i < 3; i++) {
    await prisma.milestone.create({
      data: {
        escrowId: escrow.id,
        milestoneIndex: i,
        title: `Milestone ${i + 1}`,
        description: `Deliverables for milestone ${i + 1}`,
        amount: (10000 / 3).toFixed(0),
        percentage: 33.33,
        releaseDate: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log('✅ Created milestones');

  // Assign verifier
  await prisma.verifier.create({
    data: {
      escrowId: escrow.id,
      address: verifier.address,
    },
  });

  console.log('✅ Assigned verifier');

  // Create activity
  await prisma.activity.create({
    data: {
      escrowId: escrow.id,
      userAddress: team.address,
      action: 'ESCROW_CREATED',
      details: 'Created escrow "Test Escrow"',
    },
  });

  console.log('✅ Created activity');

  // Create settings
  await prisma.settings.create({
    data: {
      userId: admin.id,
      platformName: 'TokenFlow',
      platformFee: '2.5',
      minEscrowAmount: '100',
      maxEscrowAmount: '1000000',
      defaultCurrency: 'USDC',
    },
  });

  console.log('✅ Created settings');

  console.log('\n🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });