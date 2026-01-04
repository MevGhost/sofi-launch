import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function makeAdmin() {
  const address = process.argv[2];
  
  if (!address) {
    console.error('Please provide an address as argument');
    console.error('Usage: tsx scripts/make-admin.ts <address>');
    process.exit(1);
  }
  
  try {
    const user = await prisma.user.update({
      where: { address: address.toLowerCase() },
      data: { role: 'admin' }
    });
    
    console.log('✅ Successfully updated user to admin:', {
      id: user.id,
      address: user.address,
      role: user.role
    });
  } catch (error) {
    console.error('Error updating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();