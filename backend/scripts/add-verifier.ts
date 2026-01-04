import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function addVerifierToEscrow() {
  const escrowAddress = '0xde6d363d1b425f565d4ce175eec3725a3dc14607';
  const verifierAddress = '0x33742D3feEDe42eEb82E65a0155Bd46b693A69f5'; // Your admin address
  
  try {
    // First, update the user role to include verifier permissions
    await prisma.user.update({
      where: {
        address: verifierAddress.toLowerCase()
      },
      data: {
        role: 'admin' // Admin can act as verifier too
      }
    });
    
    console.log(`✅ User ${verifierAddress} has admin role (can act as verifier)`);
    
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
    
    console.log('\nYou can now:');
    console.log('1. Review submissions at /dashboard/verifier');
    console.log('2. Approve/reject KOL deliverables');
    console.log('3. Or use the admin dashboard at /dashboard/admin/submissions');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addVerifierToEscrow();