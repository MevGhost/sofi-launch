#!/usr/bin/env npx tsx

/**
 * Initialize test data for development
 * This script sets up test admin addresses and other initial data
 */

import { PrismaClient } from '../generated/prisma';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

// Test addresses - replace with your actual test wallet addresses
const TEST_ADMIN_ADDRESSES = [
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Hardhat account 0
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Hardhat account 1
  // Add your MetaMask or other test wallet addresses here
];

async function main() {
  console.log('Initializing test data...\n');

  try {
    // Check if settings exist
    let settings = await prisma.settings.findUnique({
      where: { id: 'default' }
    });

    if (!settings) {
      // Create initial settings
      const hashedPin = hashSync('1234', 10);
      // Create admin user first
      const adminUser = await prisma.user.upsert({
        where: { address: TEST_ADMIN_ADDRESSES[0]?.toLowerCase() || '0x0000000000000000000000000000000000000000' },
        update: {},
        create: {
          address: TEST_ADMIN_ADDRESSES[0]?.toLowerCase() || '0x0000000000000000000000000000000000000000',
          role: 'admin',
          nonce: Math.floor(Math.random() * 1000000).toString(),
        },
      });
      
      settings = await prisma.settings.create({
        data: {
          id: 'default',
          adminAddresses: TEST_ADMIN_ADDRESSES.map(addr => addr.toLowerCase()),
          adminPin: hashedPin,
          maintenanceMode: false,
          announcement: 'Welcome to TokenFlow - Test Environment',
          userId: adminUser.id,
        }
      });
      console.log('✅ Created initial settings');
      console.log('📌 Default admin PIN: 123456 (please change in production!)');
    } else {
      // Update admin addresses
      const existingAddresses = settings.adminAddresses || [];
      const newAddresses = TEST_ADMIN_ADDRESSES.map(addr => addr.toLowerCase());
      const combinedAddresses = [...new Set([...existingAddresses, ...newAddresses])];
      
      await prisma.settings.update({
        where: { id: 'default' },
        data: {
          adminAddresses: combinedAddresses
        }
      });
      console.log('✅ Updated admin addresses');
    }

    // Display all admin addresses
    const finalSettings = await prisma.settings.findUnique({
      where: { id: 'default' }
    });
    
    console.log('\n📋 Current admin addresses:');
    finalSettings?.adminAddresses.forEach(addr => {
      console.log(`   - ${addr}`);
    });

    console.log('\n✨ Test data initialization complete!');
    console.log('\nTo test admin access:');
    console.log('1. Connect with one of the admin wallet addresses above');
    console.log('2. Navigate to /dashboard/admin');
    console.log('3. You should now have admin access\n');

  } catch (error) {
    console.error('❌ Error initializing test data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();