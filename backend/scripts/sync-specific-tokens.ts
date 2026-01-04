import { eventListenerService } from '../services/event-listener.service';
import { db } from '../services/database.service';
import logger from '../services/logger.service';
import { ethers } from 'ethers';

// DevBondingCurve ABI
const DevBondingCurveABI = require('../abis/DevBondingCurve.json');

async function syncSpecificTokens() {
  try {
    console.log('🔍 Syncing Specific Tokens');
    console.log('===========================\n');

    // Connect to database
    await db.connect();

    // Initialize provider and contract
    const rpcUrl = process.env['BASE_SEPOLIA_RPC_URL'] || 'https://base-sepolia.drpc.org';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contractAddress = process.env['DEV_BONDING_FACTORY_ADDRESS'] || '0xD120242C95B2334981B45e230900Cac115eF3f49';
    const contract = new ethers.Contract(contractAddress, DevBondingCurveABI, provider);

    console.log(`Connected to contract: ${contractAddress}`);
    console.log(`RPC URL: ${rpcUrl}\n`);

    // Target tokens to find
    const targetTokens = [
      '0xde7afc6fed884d4ce8a1fce4b6fb80b9caf98607',
      '0x93a136983a836a75662593aae7ca7dc9cd0af4be'
    ];

    // Get current block
    const currentBlock = await provider.getBlockNumber();
    console.log(`Current block: ${currentBlock}\n`);

    // Search for TokenCreated events for specific tokens
    console.log('Searching for TokenCreated events...');

    for (const tokenAddress of targetTokens) {
      console.log(`\nSearching for token: ${tokenAddress}`);

      // Search in batches of 500 blocks (Alchemy limit)
      const batchSize = 500;
      let found = false;

      // Start from recent blocks and work backwards
      for (let toBlock = currentBlock; toBlock > 0 && !found; toBlock -= batchSize) {
        const fromBlock = Math.max(0, toBlock - batchSize + 1);

        console.log(`  Checking blocks ${fromBlock} to ${toBlock}...`);

        try {
          // Get all TokenCreated events in this range
          const filter = contract.filters.TokenCreated();
          const events = await contract.queryFilter(filter, fromBlock, toBlock);

          // Check if any event matches our target token
          for (const event of events) {
            if ((event as ethers.EventLog).args) {
              const eventLog = event as ethers.EventLog;
              const [token, creator, name, symbol, timestamp, devBuyAmount] = eventLog.args;

              if (token.toLowerCase() === tokenAddress.toLowerCase()) {
                found = true;
                console.log(`  ✅ Found token ${tokenAddress}!`);
                console.log(`     Block: ${eventLog.blockNumber}`);
                console.log(`     Creator: ${creator}`);
                console.log(`     Name: ${name}`);
                console.log(`     Symbol: ${symbol}`);
                console.log(`     Transaction: ${eventLog.transactionHash}`);

                // Check if token exists in database
                const existingToken = await db.token.findUnique({
                  where: { address: token.toLowerCase() }
                });

                if (existingToken) {
                  console.log(`     ⚠️ Token already exists in database`);
                } else {
                  console.log(`     ➕ Adding token to database...`);

                  try {
                    // Find or create user for the creator
                    let creatorUser = await db.user.findUnique({
                      where: { address: creator.toLowerCase() }
                    });

                    if (!creatorUser) {
                      creatorUser = await db.user.create({
                        data: {
                          address: creator.toLowerCase(),
                          role: 'team',
                          chainType: 'evm'
                        }
                      });
                      console.log(`       Created user for creator: ${creator}`);
                    }

                    // Get token details from blockchain
                    const tokenContract = new ethers.Contract(token, [
                      'function name() view returns (string)',
                      'function symbol() view returns (string)',
                      'function decimals() view returns (uint8)',
                      'function totalSupply() view returns (uint256)'
                    ], provider);

                    let tokenName = name;
                    let tokenSymbol = symbol;
                    let decimals = 18;
                    let totalSupply = '0';

                    try {
                      [tokenName, tokenSymbol, decimals, totalSupply] = await Promise.all([
                        tokenContract.name(),
                        tokenContract.symbol(),
                        tokenContract.decimals(),
                        tokenContract.totalSupply()
                      ]);
                    } catch (error) {
                      console.log(`       ⚠️ Could not fetch on-chain token details, using event data`);
                    }

                    // Calculate initial market cap
                    const initialMarketCap = devBuyAmount > 0n ? 
                      (Number(ethers.formatEther(devBuyAmount)) * 3000).toString() : 
                      '1000';

                    // Create token in database
                    const newToken = await db.token.create({
                      data: {
                        address: token.toLowerCase(),
                        name: tokenName,
                        symbol: tokenSymbol,
                        description: '',
                        imageUrl: '',
                        twitter: '',
                        telegram: '',
                        website: '',
                        totalSupply: totalSupply.toString(),
                        bondingCurveType: 'constant',
                        bondingCurveAddress: contractAddress,
                        status: 'ACTIVE',
                        marketCap: initialMarketCap,
                        bondingProgress: 0,
                        holdersCount: 1,
                        volume24h: '0',
                        change24h: 0,
                        creatorId: creatorUser.id,
                        deploymentTx: eventLog.transactionHash,
                        chainId: process.env['CHAIN_ID'] || '84532',
                        createdAt: new Date(Number(timestamp) * 1000)
                      }
                    });

                    console.log(`       ✅ Token added to database with ID: ${newToken.id}`);
                  } catch (error) {
                    console.log(`       ❌ Error adding token to database:`, error);
                  }
                }
                break;
              }
            }
          }

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.log(`  ❌ Error searching blocks ${fromBlock}-${toBlock}:`, error);
          // Continue to next batch
        }
      }

      if (!found) {
        console.log(`  ❌ Token ${tokenAddress} not found in recent blocks`);
      }
    }

  } catch (error) {
    console.error('❌ Sync failed:', error);
  } finally {
    await db.disconnect();
    console.log('\n✅ Sync completed');
    process.exit(0);
  }
}

// Handle command line arguments
if (process.argv.includes('--run')) {
  syncSpecificTokens();
} else {
  console.log('Run with --run flag to execute the sync');
  console.log('Example: ts-node scripts/sync-specific-tokens.ts --run');
}