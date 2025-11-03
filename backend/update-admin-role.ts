import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient();

async function makeAdmin() {
  const adminAddress = '0x33742D3feEDe42eEb82E65a0155Bd46b693A69f5';
  
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