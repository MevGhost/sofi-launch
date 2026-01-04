import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function checkChainField() {
  try {
    // Check if chain field exists by trying to query it
    const escrow = await prisma.escrow.findFirst({
      select: {
        id: true,
        chain: true,
        chainId: true,
      }
    });
    
    if (escrow) {
      console.log('Chain field exists! Sample escrow:');
      console.log(escrow);
    } else {
      console.log('No escrows found to test with');
    }
    
  } catch (error: any) {
    if (error.message.includes('Unknown field')) {
      console.log('ERROR: Chain field does NOT exist in database');
      console.log('The migration did not apply successfully');
    } else {
      console.error('Other error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkChainField();