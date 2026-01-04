#!/usr/bin/env tsx

import { PrismaClient } from '../generated/prisma';
import { config } from 'dotenv';

config();

const prisma = new PrismaClient();

async function syncEscrow19() {
  try {
    // Check if escrow 19 already exists
    const existing = await prisma.escrow.findFirst({
      where: {
        chainId: '901', // Solana devnet
        chainEscrowId: '19',
      },
    });

    if (existing) {
      console.log('Escrow 19 already exists:', existing.id);
      return;
    }

    // Create a placeholder escrow for ID 19
    const escrow = await prisma.escrow.create({
      data: {
        chainId: '901', // Solana devnet
        chainEscrowId: '19',
        contractAddress: '0x0000000000000000000000000000000000000019', // Placeholder
        factoryAddress: '0x0000000000000000000000000000000000000000',
        blockNumber: BigInt(0),
        transactionHash: '0x' + '0'.repeat(64),
        projectName: 'Solana Escrow #19',
        dealType: 'Other',
        dealDescription: 'Manually synced Solana escrow',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        projectAddress: '0x25edb55571a963e0a4910fd59f44226ed7eb0c00', // Your address
        kolAddress: '0xCKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du', // Convert Solana address
        tokenAddress: '0x0000000000000000000000000000000000000000',
        tokenSymbol: 'SOL',
        tokenDecimals: 9,
        totalAmount: '500000000', // 0.5 SOL in lamports
        releasedAmount: '0',
        status: 'ACTIVE',
        requireVerification: false,
      },
    });

    console.log('Created escrow:', escrow.id);
    console.log('Chain escrow ID:', escrow.chainEscrowId);
  } catch (error) {
    console.error('Error syncing escrow:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncEscrow19();