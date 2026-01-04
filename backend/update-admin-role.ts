import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin() {
  const adminAddress = '0xe110a8140eaC41DBF2a54ad02872ACe1eA47B95b';
  
  try {
    // Update the user's role to admin
    const user = await prisma.user.update({
      where: {
        address: adminAddress.toLowerCase()
      },
      data: {
        role: 'admin'
      }
    });
    
    console.log('✅ Successfully updated user role to admin:', {
      id: user.id,
      address: user.address,
      role: user.role,
      name: user.name
    });
  } catch (error) {
    console.error('❌ Failed to update user role:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();