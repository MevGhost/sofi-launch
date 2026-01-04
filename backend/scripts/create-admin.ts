import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function createAdmin() {
  const address = process.argv[2];
  
  if (!address) {
    console.error('Please provide an address as argument');
    console.error('Usage: tsx scripts/create-admin.ts <address>');
    process.exit(1);
  }
  
  try {
    // First try to find the user
    let user = await prisma.user.findUnique({
      where: { address: address.toLowerCase() }
    });
    
    if (!user) {
      // Create the user if they don't exist
      console.log('User not found, creating new admin user...');
      user = await prisma.user.create({
        data: {
          address: address.toLowerCase(),
          role: 'admin',
          chainType: 'evm'
        }
      });
      console.log('✅ Created new admin user');
    } else {
      // Update existing user to admin
      console.log('User found, updating to admin...');
      user = await prisma.user.update({
        where: { address: address.toLowerCase() },
        data: { role: 'admin' }
      });
      console.log('✅ Updated existing user to admin');
    }
    
    console.log('Admin user:', {
      id: user.id,
      address: user.address,
      role: user.role
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();