#!/usr/bin/env npx tsx

/**
 * Script to add test admin addresses to the database
 * Usage: npx tsx scripts/add-test-admin.ts <address>
 */

import { PrismaClient } from '../generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const address = process.argv[2];
  
  if (!address) {
    console.error('Please provide an address as argument');
    console.error('Usage: npx tsx scripts/add-test-admin.ts <address>');
    process.exit(1);
  }

  try {
    // Get current settings or create if not exists
    let settings = await prisma.settings.findUnique({
      where: { id: 'default' }
    });

    if (!settings) {
      // Create initial settings with default admin PIN
      const hashedPin = await bcrypt.hash('123456', 10);
      settings = await prisma.settings.create({
        data: {
          id: 'default',
          adminAddresses: [address.toLowerCase()],
          adminPin: hashedPin,
          maintenanceMode: false,
          user: {
            create: {
              address: address.toLowerCase(),
              role: 'admin',
              nonce: Math.floor(Math.random() * 1000000).toString(),
            }
          }
        }
      });
      console.log('Created initial settings with admin address:', address);
      console.log('Default admin PIN: 123456 (please change this!)');
    } else {
      // Add address to existing admin list if not already present
      const adminAddresses = settings.adminAddresses || [];
      const normalizedAddress = address.toLowerCase();
      
      if (!adminAddresses.includes(normalizedAddress)) {
        await prisma.settings.update({
          where: { id: 'default' },
          data: {
            adminAddresses: [...adminAddresses, normalizedAddress]
          }
        });
        console.log('Added admin address:', address);
      } else {
        console.log('Address is already an admin:', address);
      }
    }

    // Show all current admin addresses
    const updatedSettings = await prisma.settings.findUnique({
      where: { id: 'default' }
    });
    console.log('\nCurrent admin addresses:');
    updatedSettings?.adminAddresses.forEach(addr => {
      console.log(' -', addr);
    });

  } catch (error) {
    console.error('Error adding admin address:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();