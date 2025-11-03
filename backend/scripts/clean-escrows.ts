import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function cleanEscrows() {
  try {
    console.log('🧹 Starting database cleanup...\n');

    // Count existing records before cleanup
    const escrowCount = await prisma.escrow.count();
    const milestoneCount = await prisma.milestone.count();
    const verificationCount = await prisma.verification.count();
    const disputeCount = await prisma.dispute.count();
    const activityCount = await prisma.activity.count();
    const submissionCount = await prisma.milestoneSubmission.count();
    const verifierCount = await prisma.verifier.count();

    console.log('📊 Current database state:');
    console.log(`- Escrows: ${escrowCount}`);
    console.log(`- Milestones: ${milestoneCount}`);
    console.log(`- Verifications: ${verificationCount}`);
    console.log(`- Verifiers: ${verifierCount}`);
    console.log(`- Disputes: ${disputeCount}`);
    console.log(`- Activities: ${activityCount}`);
    console.log(`- Milestone Submissions: ${submissionCount}`);
    console.log('\n');

    if (escrowCount === 0) {
      console.log('✅ Database is already clean - no escrows found');
      return;
    }

    // Confirm deletion
    console.log(`⚠️  WARNING: This will permanently delete ${escrowCount} escrows and all related data!`);
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🗑️  Deleting all escrow-related data...\n');

    // Delete all escrows (this will cascade delete related records due to onDelete: Cascade)
    const deletedEscrows = await prisma.escrow.deleteMany({});
    console.log(`✅ Deleted ${deletedEscrows.count} escrows`);

    // Delete orphaned activities (activities not related to escrows)
    const deletedActivities = await prisma.activity.deleteMany({
      where: {
        escrowId: null
      }
    });
    console.log(`✅ Deleted ${deletedActivities.count} orphaned activities`);

    // Verify cleanup
    console.log('\n📊 Final database state:');
    const finalEscrowCount = await prisma.escrow.count();
    const finalMilestoneCount = await prisma.milestone.count();
    const finalVerificationCount = await prisma.verification.count();
    const finalDisputeCount = await prisma.dispute.count();
    const finalSubmissionCount = await prisma.milestoneSubmission.count();
    const finalVerifierCount = await prisma.verifier.count();

    console.log(`- Escrows: ${finalEscrowCount}`);
    console.log(`- Milestones: ${finalMilestoneCount}`);
    console.log(`- Verifications: ${finalVerificationCount}`);
    console.log(`- Verifiers: ${finalVerifierCount}`);
    console.log(`- Disputes: ${finalDisputeCount}`);
    console.log(`- Milestone Submissions: ${finalSubmissionCount}`);

    console.log('\n✅ Database cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanEscrows();