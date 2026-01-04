import { eventListenerService } from '../services/event-listener.service';
import { db } from '../services/database.service';
import logger from '../services/logger.service';

async function testEventListener() {
  try {
    console.log('🧪 Testing Event Listener Service');
    console.log('================================\n');

    // First check if we can connect to the database
    console.log('1. Testing database connection...');
    await db.connect();
    console.log('✅ Database connected successfully\n');

    // Check current tokens in the database
    console.log('2. Checking existing tokens in database...');
    const existingTokens = await db.token.findMany({
      select: {
        address: true,
        name: true,
        symbol: true,
        createdAt: true
      }
    });
    
    console.log(`Found ${existingTokens.length} existing tokens:`);
    existingTokens.forEach((token, index) => {
      console.log(`  ${index + 1}. ${token.name} (${token.symbol}) - ${token.address}`);
    });
    console.log('');

    // Test specific tokens that should exist
    const targetTokens = [
      '0xde7afc6fed884d4ce8a1fce4b6fb80b9caf98607',
      '0x93a136983a836a75662593aae7ca7dc9cd0af4be'
    ];

    console.log('3. Checking for specific deployed tokens...');
    for (const tokenAddress of targetTokens) {
      const token = await db.token.findUnique({
        where: { address: tokenAddress.toLowerCase() }
      });
      
      if (token) {
        console.log(`✅ Token ${tokenAddress} found in database`);
      } else {
        console.log(`❌ Token ${tokenAddress} NOT found in database`);
      }
    }
    console.log('');

    // Now test the event listener service
    console.log('4. Testing event listener historical sync...');
    
    // Sync a specific block range to test (you can adjust these values)
    const currentBlock = 18000000; // Approximate current block
    const fromBlock = Math.max(0, currentBlock - 10000); // Last 10k blocks
    
    console.log(`Syncing blocks from ${fromBlock} to ${currentBlock}...`);
    
    try {
      await eventListenerService.syncBlockRange(fromBlock, currentBlock);
      console.log('✅ Historical sync completed\n');
    } catch (error) {
      console.log('❌ Historical sync failed:', error);
    }

    // Check tokens again after sync
    console.log('5. Checking tokens after historical sync...');
    const tokensAfterSync = await db.token.findMany({
      select: {
        address: true,
        name: true,
        symbol: true,
        createdAt: true
      }
    });
    
    console.log(`Found ${tokensAfterSync.length} tokens after sync:`);
    tokensAfterSync.forEach((token, index) => {
      console.log(`  ${index + 1}. ${token.name} (${token.symbol}) - ${token.address}`);
    });
    
    if (tokensAfterSync.length > existingTokens.length) {
      console.log(`✅ Added ${tokensAfterSync.length - existingTokens.length} new tokens`);
    } else {
      console.log('ℹ️ No new tokens were added');
    }

    console.log('\n6. Testing specific token addresses again...');
    for (const tokenAddress of targetTokens) {
      const token = await db.token.findUnique({
        where: { address: tokenAddress.toLowerCase() }
      });
      
      if (token) {
        console.log(`✅ Token ${tokenAddress} found in database after sync`);
        console.log(`    Name: ${token.name}, Symbol: ${token.symbol}`);
      } else {
        console.log(`❌ Token ${tokenAddress} still NOT found in database`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await db.disconnect();
    console.log('\n✅ Test completed');
    process.exit(0);
  }
}

// Handle command line arguments
if (process.argv.includes('--run')) {
  testEventListener();
} else {
  console.log('Run with --run flag to execute the test');
  console.log('Example: ts-node scripts/test-event-listener.ts --run');
}