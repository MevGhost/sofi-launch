import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing escrow creation...');
  
  // Clean database
  await prisma.escrow.deleteMany();
  await prisma.user.deleteMany();
  
  // Create minimal user
  const user = await prisma.user.create({
    data: {
      address: '0x1234567890123456789012345678901234567890',
      role: 'team',
    },
  });
  
  const kol = await prisma.user.create({
    data: {
      address: '0x2345678901234567890123456789012345678901',
      role: 'kol',
    },
  });
  
  console.log('Created users');
  
  // Test escrow creation
  try {
    const escrow = await prisma.escrow.create({
      data: {
        contractAddress: '0x3456789012345678901234567890123456789012',
        factoryAddress: '0x4567890123456789012345678901234567890123',
        chainId: '84532',
        blockNumber: BigInt(1000000),
        transactionHash: '0x' + '0'.repeat(64), // 66 chars total
        projectName: 'Test',
        dealType: 'test',
        dealDescription: 'Test description',
        startDate: new Date(),
        endDate: new Date(),
        projectAddress: user.address,
        kolAddress: kol.address,
        tokenAddress: '0x5678901234567890123456789012345678901234',
        tokenSymbol: 'USDC',
        tokenDecimals: 6,
        totalAmount: '1000',
        status: 'ACTIVE',
        requireVerification: false,
      },
    });
    
    console.log('✅ Successfully created escrow:', escrow.id);
  } catch (error) {
    console.error('❌ Failed to create escrow:', error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });