import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function addVerifierToHyperliquid() {
  const escrowAddress = '0x1fe849269daad6d18d9f2757df1105b5671bf594';
  const verifierAddress = '0x33742D3feEDe42eEb82E65a0155Bd46b693A69f5'; // Your admin address
  
  try {
    // Find the escrow
    const escrow = await prisma.escrow.findFirst({
      where: {
        contractAddress: escrowAddress.toLowerCase()
      }
    });
    
    if (!escrow) {
      console.log('❌ Escrow not found');
      return;
    }
    
    // Check if verifier already exists
    const existingVerifier = await prisma.verifier.findFirst({
      where: {
        escrowId: escrow.id,
        address: verifierAddress.toLowerCase()
      }
    });
    
    if (existingVerifier) {
      console.log('✅ Verifier already exists for this escrow');
    } else {
      // Add verifier
      await prisma.verifier.create({
        data: {
          escrowId: escrow.id,
          address: verifierAddress.toLowerCase(),
          isActive: true
        }
      });
      
      console.log(`✅ Added ${verifierAddress} as verifier to escrow ${escrow.projectName}`);
    }
    
    // Update escrow to require verification
    await prisma.escrow.update({
      where: { id: escrow.id },
      data: { requireVerification: true }
    });
    
    console.log('✅ Updated escrow to require verification');
    
    console.log('\nYou can now:');
    console.log('1. See the submission at /dashboard/verifier');
    console.log('2. Review and approve/reject the KOL deliverable');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addVerifierToHyperliquid();