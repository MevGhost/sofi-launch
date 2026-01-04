import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function checkAdmins() {
  try {
    // Find all admin users
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: {
        id: true,
        address: true,
        role: true,
        name: true,
        createdAt: true,
      }
    });
    
    console.log('Found', admins.length, 'admin users:');
    console.log(JSON.stringify(admins, null, 2));
    
    // Also check if there are any escrows
    const escrowCount = await prisma.escrow.count();
    console.log('\nTotal escrows in database:', escrowCount);
    
    // Show a few escrows
    const escrows = await prisma.escrow.findMany({
      take: 5,
      select: {
        id: true,
        projectName: true,
        chainId: true,
        status: true,
        projectAddress: true,
        kolAddress: true,
      }
    });
    console.log('\nSample escrows:');
    console.log(JSON.stringify(escrows, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmins();