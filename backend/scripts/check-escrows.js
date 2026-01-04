const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

async function checkEscrows() {
  try {
    // Check all escrows
    const allEscrows = await prisma.escrow.findMany({
      select: {
        id: true,
        chain: true,
        projectAddress: true,
        kolAddress: true,
        totalAmount: true,
        status: true,
        createdAt: true,
      }
    });
    
    console.log('Total escrows in database:', allEscrows.length);
    console.log('\nEscrows by chain:');
    
    const byChain = {};
    allEscrows.forEach(e => {
      const chain = e.chain || 'unknown';
      byChain[chain] = (byChain[chain] || 0) + 1;
    });
    console.log(byChain);
    
    // Check Base Sepolia escrows specifically
    const baseSepoliaEscrows = await prisma.escrow.findMany({
      where: { chain: 'base-sepolia' },
      select: {
        id: true,
        projectAddress: true,
        kolAddress: true,
        totalAmount: true,
        status: true,
      }
    });
    
    console.log('\nBase Sepolia escrows:', baseSepoliaEscrows.length);
    if (baseSepoliaEscrows.length > 0) {
      console.log('Sample escrow:');
      console.log(baseSepoliaEscrows[0]);
    }
    
    // Check specific user with lowercase
    const userAddress = '0x25edb55571a963e0a4910fd59f44226ed7eb0c00';
    const userAddressLower = userAddress.toLowerCase();
    const userEscrows = await prisma.escrow.findMany({
      where: {
        OR: [
          { projectAddress: userAddressLower },
          { kolAddress: userAddressLower },
        ]
      },
      select: {
        id: true,
        chain: true,
        projectAddress: true,
        kolAddress: true,
      }
    });
    
    console.log(`\nEscrows for user ${userAddress}:`, userEscrows.length);
    userEscrows.forEach(e => {
      const role = e.projectAddress === userAddressLower ? 'Project' : 'KOL';
      console.log(`- ID: ${e.id}, Chain: ${e.chain}, Role: ${role}`);
    });
    
    // Also check all unique addresses
    console.log('\nAll unique project addresses:');
    const projectAddresses = [...new Set(allEscrows.map(e => e.projectAddress))];
    projectAddresses.forEach(addr => console.log(addr));
    
    console.log('\nAll unique KOL addresses:');  
    const kolAddresses = [...new Set(allEscrows.map(e => e.kolAddress))];
    kolAddresses.forEach(addr => console.log(addr));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEscrows();