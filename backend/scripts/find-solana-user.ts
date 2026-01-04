import { PrismaClient } from '../generated/prisma';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// Convert Solana address to EVM format (same logic as backend)
function convertToEvmAddress(address: string): string {
  const isSolanaAddress = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(address);
  
  if (isSolanaAddress) {
    const hash = createHash('sha256').update(address).digest('hex');
    return '0x' + hash.slice(0, 40);
  }
  
  return address;
}

async function findSolanaUser() {
  const solanaAddress = process.argv[2] || 'gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz';
  const evmAddress = convertToEvmAddress(solanaAddress);
  
  console.log('Solana address:', solanaAddress);
  console.log('Converted EVM address:', evmAddress);
  
  try {
    const user = await prisma.user.findUnique({
      where: { address: evmAddress.toLowerCase() }
    });
    
    if (user) {
      console.log('\nFound user:', {
        id: user.id,
        address: user.address,
        role: user.role,
        chainType: user.chainType
      });
      
      // Update to admin
      const updated = await prisma.user.update({
        where: { address: evmAddress.toLowerCase() },
        data: { role: 'admin' }
      });
      
      console.log('\n✅ Successfully updated user to admin!');
    } else {
      console.log('\n❌ User not found in database');
      
      // List recent users
      const recentUsers = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          address: true,
          role: true,
          chainType: true,
          createdAt: true
        }
      });
      
      console.log('\nRecent users in database:');
      recentUsers.forEach(u => {
        console.log(`  ${u.address} - ${u.role} - ${u.chainType} - ${u.createdAt.toISOString()}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findSolanaUser();