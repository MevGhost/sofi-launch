import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function fixAdminRole() {
  const adminAddress = '0x33742D3feEDe42eEb82E65a0155Bd46b693A69f5';
  
  console.log('Checking admin user...');
  const user = await prisma.user.findUnique({
    where: { address: adminAddress.toLowerCase() }
  });
  
  console.log('Current user:', user);
  
  if (!user || user.role !== 'admin') {
    console.log('Updating user to admin role...');
    const updated = await prisma.user.upsert({
      where: { address: adminAddress.toLowerCase() },
      update: { role: 'admin' },
      create: { 
        address: adminAddress.toLowerCase(),
        role: 'admin',
        nonce: ''
      }
    });
    console.log('User updated:', updated);
  } else {
    console.log('User already has admin role');
  }
  
  await prisma.$disconnect();
}

fixAdminRole().catch(console.error);