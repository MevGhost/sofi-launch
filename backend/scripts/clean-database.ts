import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

interface CleanupOptions {
  escrows?: boolean;
  users?: boolean;
  activities?: boolean;
  all?: boolean;
  force?: boolean;
}

async function cleanDatabase(options: CleanupOptions = {}) {
  try {
    console.log('🧹 Database Cleanup Utility\n');

    // Parse command line arguments
    const args = process.argv.slice(2);
    if (args.includes('--help') || args.includes('-h')) {
      printHelp();
      return;
    }

    // Set options from command line
    if (args.includes('--all')) options.all = true;
    if (args.includes('--escrows')) options.escrows = true;
    if (args.includes('--users')) options.users = true;
    if (args.includes('--activities')) options.activities = true;
    if (args.includes('--force')) options.force = true;

    // Default to escrows only if no options specified
    if (!options.all && !options.escrows && !options.users && !options.activities) {
      options.escrows = true;
    }

    // Show current state
    await showDatabaseState();

    // Determine what to clean
    const toClean: string[] = [];
    if (options.all) {
      toClean.push('ALL DATA');
    } else {
      if (options.escrows) toClean.push('Escrows and related data');
      if (options.users) toClean.push('Users (except admins)');
      if (options.activities) toClean.push('Activities');
    }

    console.log('\n🎯 Will clean:', toClean.join(', '));

    // Confirm unless forced
    if (!options.force) {
      console.log('\n⚠️  WARNING: This action is irreversible!');
      console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log('🗑️  Starting cleanup...\n');

    // Perform cleanup
    if (options.all) {
      await cleanAll();
    } else {
      if (options.escrows) await cleanEscrows();
      if (options.activities) await cleanActivities();
      if (options.users) await cleanUsers();
    }

    // Show final state
    console.log('\n✅ Cleanup completed!\n');
    await showDatabaseState();

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function showDatabaseState() {
  const counts = await prisma.$transaction([
    prisma.user.count(),
    prisma.escrow.count(),
    prisma.milestone.count(),
    prisma.verification.count(),
    prisma.verifier.count(),
    prisma.dispute.count(),
    prisma.activity.count(),
    prisma.milestoneSubmission.count(),
  ]);

  console.log('📊 Current database state:');
  console.log(`- Users: ${counts[0]}`);
  console.log(`- Escrows: ${counts[1]}`);
  console.log(`- Milestones: ${counts[2]}`);
  console.log(`- Verifications: ${counts[3]}`);
  console.log(`- Verifiers: ${counts[4]}`);
  console.log(`- Disputes: ${counts[5]}`);
  console.log(`- Activities: ${counts[6]}`);
  console.log(`- Milestone Submissions: ${counts[7]}`);
}

async function cleanEscrows() {
  const result = await prisma.escrow.deleteMany({});
  console.log(`✅ Deleted ${result.count} escrows and all related data`);
}

async function cleanActivities() {
  const result = await prisma.activity.deleteMany({});
  console.log(`✅ Deleted ${result.count} activities`);
}

async function cleanUsers() {
  // Keep admin users
  const result = await prisma.user.deleteMany({
    where: {
      role: {
        not: 'admin'
      }
    }
  });
  console.log(`✅ Deleted ${result.count} non-admin users`);
}

async function cleanAll() {
  // Delete in order to respect foreign key constraints
  const results = await prisma.$transaction([
    prisma.milestoneSubmission.deleteMany({}),
    prisma.verification.deleteMany({}),
    prisma.verifier.deleteMany({}),
    prisma.dispute.deleteMany({}),
    prisma.milestone.deleteMany({}),
    prisma.activity.deleteMany({}),
    prisma.escrow.deleteMany({}),
    prisma.settings.deleteMany({}),
    prisma.user.deleteMany({}),
  ]);

  console.log('✅ Deleted all data:');
  console.log(`- Milestone Submissions: ${results[0].count}`);
  console.log(`- Verifications: ${results[1].count}`);
  console.log(`- Verifiers: ${results[2].count}`);
  console.log(`- Disputes: ${results[3].count}`);
  console.log(`- Milestones: ${results[4].count}`);
  console.log(`- Activities: ${results[5].count}`);
  console.log(`- Escrows: ${results[6].count}`);
  console.log(`- Settings: ${results[7].count}`);
  console.log(`- Users: ${results[8].count}`);
}

function printHelp() {
  console.log(`
Database Cleanup Utility

Usage: npx tsx clean-database.ts [options]

Options:
  --escrows     Clean all escrows and related data (default)
  --users       Clean all non-admin users
  --activities  Clean all activities
  --all         Clean entire database
  --force       Skip confirmation prompt
  -h, --help    Show this help message

Examples:
  npx tsx clean-database.ts                    # Clean escrows only
  npx tsx clean-database.ts --all --force      # Clean everything without confirmation
  npx tsx clean-database.ts --users --escrows  # Clean users and escrows
`);
}

// Run the cleanup
cleanDatabase();