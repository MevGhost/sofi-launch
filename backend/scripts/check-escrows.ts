import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  try {
    // Get all escrows with milestones and submissions
    const escrows = await prisma.escrow.findMany({
      include: {
        milestones: {
          include: {
            submissions: true,
          },
        },
      },
    });

    console.log(`Total escrows: ${escrows.length}`);
    
    let pendingCount = 0;
    escrows.forEach((escrow) => {
      console.log(`\nEscrow ${escrow.id}:`);
      console.log(`  Project: ${escrow.projectName}`);
      console.log(`  Chain: ${escrow.chain}`);
      console.log(`  Milestones: ${escrow.milestones.length}`);
      
      escrow.milestones.forEach((milestone, index) => {
        console.log(`    Milestone ${index}: ${milestone.title}`);
        console.log(`      Submissions: ${milestone.submissions.length}`);
        
        milestone.submissions.forEach((sub) => {
          console.log(`        - ${sub.id}: ${sub.status}`);
          if (sub.status === 'PENDING') {
            pendingCount++;
          }
        });
      });
    });
    
    console.log(`\nTotal pending submissions: ${pendingCount}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());