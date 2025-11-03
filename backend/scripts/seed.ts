import { PrismaClient } from '../generated/prisma';
import { ethers } from 'ethers';

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
  const adminAddress = process.env['ADMIN_WALLET'] || '0x33742D3feEDe42eEb82E65a0155Bd46b693A69f5';
  const admin = await prisma.user.create({
    data: {
      address: adminAddress.toLowerCase(),
      role: 'admin',
      nonce: Math.floor(Math.random() * 1000000).toString(),
    },
  });

  console.log('✅ Created admin user:', admin.address);

  // Create sample team members (ensure addresses are 42 chars including 0x)
  const teamAddresses = [
    '0x1234567890123456789012345678901234567890',
    '0x2345678901234567890123456789012345678901',
  ];

  const teamMembers = await Promise.all(
    teamAddresses.map((address) =>
      prisma.user.create({
        data: {
          address: address.toLowerCase(),
          role: 'team',
          nonce: Math.floor(Math.random() * 1000000).toString(),
        },
      })
    )
  );

  console.log('✅ Created', teamMembers.length, 'team members');

  // Create sample KOLs
  const kolAddresses = [
    '0x3456789012345678901234567890123456789012',
    '0x4567890123456789012345678901234567890123',
    '0x5678901234567890123456789012345678901234',
  ];

  const kols = await Promise.all(
    kolAddresses.map((address) =>
      prisma.user.create({
        data: {
          address: address.toLowerCase(),
          role: 'kol',
          nonce: Math.floor(Math.random() * 1000000).toString(),
        },
      })
    )
  );

  console.log('✅ Created', kols.length, 'KOLs');

  // Create sample verifiers
  const verifierAddresses = [
    '0x6789012345678901234567890123456789012345',
    '0x7890123456789012345678901234567890123456',
  ];

  const verifiers = await Promise.all(
    verifierAddresses.map((address) =>
      prisma.user.create({
        data: {
          address: address.toLowerCase(),
          role: 'verifier',
          nonce: Math.floor(Math.random() * 1000000).toString(),
        },
      })
    )
  );

  console.log('✅ Created', verifiers.length, 'verifiers');

  // Create sample escrows
  const escrowData = [
    {
      projectName: 'DeFi Protocol Launch Campaign',
      dealType: 'influencer-marketing',
      dealDescription: 'Social media campaign for new DeFi protocol launch.',
      projectAddress: teamMembers[0]?.address || '0x0000000000000000000000000000000000000000',
      kolAddress: kols[0]?.address || '0x0000000000000000000000000000000000000000',
      totalAmount: '50000',
      tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC on Base
      tokenSymbol: 'USDC',
      tokenDecimals: 6,
      status: 'ACTIVE',
      requireVerification: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    },
    {
      projectName: 'NFT Collection Marketing',
      dealType: 'content-creation',
      dealDescription: 'Influencer marketing campaign for upcoming NFT drop.',
      projectAddress: teamMembers[1]?.address || '0x0000000000000000000000000000000000000000',
      kolAddress: kols[1]?.address || '0x0000000000000000000000000000000000000000',
      totalAmount: '25000',
      tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      tokenSymbol: 'USDC',
      tokenDecimals: 6,
      status: 'ACTIVE',
      requireVerification: true,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Started 30 days ago
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
    },
    {
      projectName: 'GameFi Beta Testing',
      dealType: 'community-engagement',
      dealDescription: 'Community engagement and beta testing program.',
      projectAddress: teamMembers[0]?.address || '0x0000000000000000000000000000000000000000',
      kolAddress: kols[2]?.address || '0x0000000000000000000000000000000000000000',
      totalAmount: '15000',
      tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      tokenSymbol: 'USDC',
      tokenDecimals: 6,
      status: 'COMPLETED',
      requireVerification: false,
      startDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // Started 120 days ago
      endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Ended 30 days ago
    },
  ];

  const escrows = [];
  for (let index = 0; index < escrowData.length; index++) {
    const data = escrowData[index];
    if (!data) continue;
    try {
      const contractAddress = ethers.Wallet.createRandom().address.toLowerCase();
      const txHash = ethers.hexlify(ethers.randomBytes(32));
      
      console.log(`Creating escrow ${index + 1}:`, {
        contractAddress: contractAddress.length,
        factoryAddress: 42,
        transactionHash: txHash.length,
        projectAddress: data.projectAddress?.length || 0,
        kolAddress: data.kolAddress?.length || 0,
        tokenAddress: data.tokenAddress?.length || 0,
        dealDescription: data.dealDescription?.length || 0,
      });
      
      const escrow = await prisma.escrow.create({
        data: {
          contractAddress,
          factoryAddress: '0xf1234567890123456789012345678901234567890',
          chainId: '84532', // Base Sepolia
          chainEscrowId: `${84532}_${contractAddress}`, // Added chainEscrowId
          blockNumber: BigInt(1000000 + index * 1000),
          transactionHash: txHash,
          // Deal basics
          projectName: data.projectName,
          dealType: data.dealType,
          dealDescription: data.dealDescription,
          startDate: data.startDate,
          endDate: data.endDate,
          // Participants
          projectAddress: data.projectAddress,
          kolAddress: data.kolAddress,
          // Token info
          tokenAddress: data.tokenAddress,
          tokenSymbol: data.tokenSymbol,
          tokenDecimals: data.tokenDecimals,
          totalAmount: data.totalAmount,
          // Status
          status: data.status as 'ACTIVE' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED' | 'PAUSED',
          requireVerification: data.requireVerification,
        },
      });

      // Create milestones for active escrows
      if (data.status === 'ACTIVE') {
        const milestoneCount = 3;
        for (let i = 0; i < milestoneCount; i++) {
          await prisma.milestone.create({
            data: {
              escrowId: escrow.id,
              title: `Milestone ${i + 1}`,
              description: `Deliverables for milestone ${i + 1}`,
              amount: (parseInt(data.totalAmount) / milestoneCount).toString(),
              releaseDate: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000),
              milestoneIndex: i,
              percentage: 100 / milestoneCount,
              conditions: [],
            },
          });
        }
      }

      // Assign verifiers to escrows that require verification
      if (data.requireVerification) {
        await prisma.verifier.create({
          data: {
            escrowId: escrow.id,
            address: verifiers[index % verifiers.length]?.address || '0x0000000000000000000000000000000000000000',
          },
        });

        // Create sample verifications for completed escrows
        // Skip verification creation - requires proper milestone and verifier IDs
      }

      // Create activity logs
      await prisma.activity.create({
        data: {
          escrowId: escrow.id,
          userAddress: data.projectAddress,
          action: 'ESCROW_CREATED',
          details: `Created escrow "${data.projectName}"`,
        },
      });

      escrows.push(escrow);
    } catch (error) {
      console.error(`Failed to create escrow ${index + 1}:`, error);
      throw error;
    }
  }

  console.log('✅ Created', escrows.length, 'escrows with milestones and activities');

  // Skip pending verification creation - requires proper milestone and verifier IDs
  console.log('✅ Skipped verification creation (requires proper IDs)');

  // Create platform settings
  await prisma.settings.create({
    data: {
      userId: admin.id,
      platformName: 'TokenFlow',
      platformFee: '2.5',
      minEscrowAmount: '100',
      maxEscrowAmount: '1000000',
      defaultCurrency: 'USDC',
      maintenanceMode: false,
      twoFactorRequired: false,
      sessionTimeout: '30',
      maxLoginAttempts: '5',
      ipWhitelist: '',
      requireVerification: true,
      emailNotifications: true,
    },
  });

  console.log('✅ Created platform settings');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Admin: ${admin.address}`);
  console.log(`- Team members: ${teamMembers.length}`);
  console.log(`- KOLs: ${kols.length}`);
  console.log(`- Verifiers: ${verifiers.length}`);
  console.log(`- Escrows: ${escrows.length}`);
  console.log(`- Pending verifications: 1`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });