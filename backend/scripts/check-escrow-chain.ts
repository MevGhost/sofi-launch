import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function checkEscrowChain() {
  const escrowId = 'cmdpe2dpl0003worfdjvd82dq';
  
  try {
    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      select: {
        id: true,
        chain: true,
        chainId: true,
        contractAddress: true,
        projectName: true,
        status: true,
      }
    });
    
    console.log('Escrow details:');
    console.log(JSON.stringify(escrow, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEscrowChain();