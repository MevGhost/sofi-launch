import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function checkUserRole() {
  const address = '0xd1e1e96368246d8c91907fa35587bfb82b66b22c';
  
  try {
    const user = await prisma.user.findUnique({
      where: { address: address.toLowerCase() },
      select: {
        id: true,
        address: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      }
    });
    
    console.log('User data:');
    console.log(JSON.stringify(user, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserRole();