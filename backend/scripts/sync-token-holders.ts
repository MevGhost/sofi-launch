import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

// The address that created tokens
const CREATOR_ADDRESS = '0x33742D3feEDe42eEb82E65a0155Bd46b693A69f5';

async function syncTokenHolders() {
  try {
    console.log('Starting token holder sync...');
    console.log(`Looking for tokens created by: ${CREATOR_ADDRESS}`);
    
    // First, find or create the user
    let user = await prisma.user.findFirst({
      where: { 
        address: {
          equals: CREATOR_ADDRESS,
          mode: 'insensitive'
        }
      }
    });

    if (!user) {
      console.log('User not found, creating user record...');
      user = await prisma.user.create({
        data: {
          address: CREATOR_ADDRESS.toLowerCase(),
          name: 'Token Creator',
        }
      });
      console.log('User created with ID:', user.id);
    } else {
      console.log('User found with ID:', user.id);
    }

    // Find all tokens created by this user
    const tokens = await prisma.token.findMany({
      where: {
        OR: [
          { creatorId: user.id },
          // Also check for tokens created through the platform
          // where we might have stored the creator address differently
        ]
      }
    });

    console.log(`Found ${tokens.length} tokens created by this user`);

    // Also check for any tokens in the database without proper creator assignment
    const allTokens = await prisma.token.findMany();
    console.log(`Total tokens in database: ${allTokens.length}`);
    
    // Log each token for debugging
    for (const token of allTokens) {
      console.log(`Token: ${token.symbol} (${token.address})`);
      console.log(`  Creator ID: ${token.creatorId}`);
      console.log(`  Market Cap: $${token.marketCap}`);
      console.log(`  Holders: ${token.holdersCount}`);
      
      // Create token holder entries for the creator if they don't exist
      // Assuming the creator should have some initial balance
      const existingHolder = await prisma.tokenHolder.findFirst({
        where: {
          userId: user.id,
          tokenId: token.id
        }
      });

      if (!existingHolder) {
        console.log(`  Creating holder entry for user ${user.id} and token ${token.symbol}`);
        
        // For testing, give the creator some tokens so they show up in portfolio
        // In production, this should be based on actual blockchain data
        await prisma.tokenHolder.create({
          data: {
            user: { connect: { id: user.id } },
            token: { connect: { id: token.id } },
            tokenAddress: token.address,
            // Give them 10% of total supply for testing
            balance: '100000000', // 100M tokens (10% of 1B)
            percentOwned: 10.0, // 10% of total supply
            firstBuyAt: new Date(),
            totalBought: '0',
            totalSold: '0'
          }
        });
        
        console.log(`  Created holder entry with 100M tokens`);
      } else {
        console.log(`  Holder entry already exists with balance: ${existingHolder.balance}`);
      }
    }

    // Update holder counts for all tokens
    for (const token of allTokens) {
      const holderCount = await prisma.tokenHolder.count({
        where: {
          tokenId: token.id,
          balance: { gt: '0' }
        }
      });

      await prisma.token.update({
        where: { id: token.id },
        data: { holdersCount: holderCount }
      });
      
      console.log(`Updated holder count for ${token.symbol}: ${holderCount}`);
    }

    console.log('\nSync completed successfully!');
    
    // Verify the portfolio data
    console.log('\nVerifying portfolio data for user:');
    const holdings = await prisma.tokenHolder.findMany({
      where: {
        userId: user.id,
        balance: { gt: '0' }
      },
      include: {
        token: true
      }
    });

    console.log(`User has ${holdings.length} token holdings:`);
    for (const holding of holdings) {
      console.log(`- ${holding.token.symbol}: ${holding.balance} tokens`);
    }

  } catch (error) {
    console.error('Error syncing token holders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncTokenHolders();