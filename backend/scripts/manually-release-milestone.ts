import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function manuallyReleaseMilestone() {
  const escrowAddress = '0x1fe849269daad6d18d9f2757df1105b5671bf594';
  
  try {
    // Find the escrow
    const escrow = await prisma.escrow.findFirst({
      where: {
        contractAddress: escrowAddress.toLowerCase()
      },
      include: {
        milestones: {
          where: {
            milestoneIndex: 0 // First milestone
          }
        }
      }
    });
    
    if (!escrow || escrow.milestones.length === 0) {
      console.log('❌ Escrow or milestone not found');
      return;
    }
    
    const milestone = escrow.milestones[0];
    
    if (!milestone) {
      console.log('❌ Milestone not found');
      return;
    }
    
    // Update milestone as released
    await prisma.milestone.update({
      where: { id: milestone.id },
      data: {
        released: true,
        releasedAt: new Date()
      }
    });
    
    // Update escrow released amount
    const newReleasedAmount = BigInt(escrow.releasedAmount || 0) + BigInt(milestone?.amount || 0);
    await prisma.escrow.update({
      where: { id: escrow.id },
      data: {
        releasedAmount: newReleasedAmount.toString()
      }
    });
    
    // Log the release activity
    await prisma.activity.create({
      data: {
        escrowId: escrow.id,
        userAddress: '0x33742d3feede42eeb82e65a0155bd46b693a69f5',
        action: 'MILESTONE_RELEASED_MANUAL',
        details: { 
          milestoneIndex: milestone?.milestoneIndex || 0,
          amount: milestone?.amount || '0',
          note: 'Manually released for testing - in production this would be an on-chain transaction'
        },
        ipAddress: '127.0.0.1',
        userAgent: 'Manual Script'
      }
    });
    
    console.log(`\n✅ Milestone manually released!`);
    console.log(`📋 Escrow: ${escrow.projectName}`);
    console.log(`💰 Released amount: ${milestone.amount} ${escrow.tokenSymbol}`);
    console.log(`💸 Total released: ${newReleasedAmount.toString()} ${escrow.tokenSymbol}`);
    console.log(`\n🎉 The KOL can now claim the funds at:`);
    console.log(`   http://localhost:3000/dashboard/kol/deals/${escrowAddress}`);
    console.log(`   Navigate to the "Claim Funds" tab`);
    
    console.log(`\n⚠️  Note: In production, this would be an on-chain transaction.`);
    console.log(`The backend needs proper configuration:`);
    console.log(`- PRIVATE_KEY in .env`);
    console.log(`- ETH for gas fees`);
    console.log(`- Deployed smart contracts`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

manuallyReleaseMilestone();