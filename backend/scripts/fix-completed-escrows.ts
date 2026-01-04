import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function fixCompletedEscrows() {
  console.log('🔍 Checking for escrows that should be marked as completed...\n');
  
  // Find all active escrows
  const activeEscrows = await prisma.escrow.findMany({
    where: { status: 'ACTIVE' },
    include: {
      milestones: true
    }
  });
  
  console.log(`Found ${activeEscrows.length} active escrows\n`);
  
  let updatedCount = 0;
  
  for (const escrow of activeEscrows) {
    // Check if all milestones are released
    const allReleased = escrow.milestones.every(m => m.released);
    
    // Also check if released amount equals total amount
    const fullyReleased = BigInt(escrow.releasedAmount || 0) === BigInt(escrow.totalAmount);
    
    if (allReleased || fullyReleased) {
      console.log(`Escrow ${escrow.contractAddress}:`);
      console.log(`  - Project: ${escrow.projectName}`);
      console.log(`  - Milestones: ${escrow.milestones.length} (all released: ${allReleased})`);
      console.log(`  - Amount: ${escrow.releasedAmount} / ${escrow.totalAmount} ${escrow.tokenSymbol}`);
      console.log(`  - Updating status to COMPLETED...`);
      
      await prisma.escrow.update({
        where: { id: escrow.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });
      
      updatedCount++;
      console.log('  ✅ Updated!\n');
    }
  }
  
  console.log(`\n🎉 Summary: Updated ${updatedCount} escrows to COMPLETED status`);
}

fixCompletedEscrows()
  .catch(console.error)
  .finally(() => prisma.$disconnect());