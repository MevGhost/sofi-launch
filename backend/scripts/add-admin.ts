import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const adminAddress = 'gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz';
  
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { address: adminAddress }
    });

    if (existingUser) {
      // Update to admin role
      const updated = await prisma.user.update({
        where: { address: adminAddress },
        data: { role: 'admin' }
      });
      console.log('Updated user to admin:', updated);
    } else {
      // Create new admin user
      const newUser = await prisma.user.create({
        data: {
          address: adminAddress,
          role: 'admin',
          nonce: Math.floor(Math.random() * 1000000).toString(),
          chainType: 'solana'
        }
      });
      console.log('Created new admin user:', newUser);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());