import { ethers } from 'ethers';
import { db } from './database.service';
import logger from './logger.service';

const DevBondingCurveV2ABI = require('../abis/DevBondingCurveV2ABI.json');

export class EventListenerService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private isListening: boolean = false;
  
  constructor() {
    // Use Base Sepolia for testnet
    const isTestnet = process.env['NODE_ENV'] !== 'production' || process.env['CHAIN_ID'] === '84532';
    const rpcUrl = isTestnet 
      ? (process.env['BASE_SEPOLIA_RPC_URL'] || 'https://base-sepolia.drpc.org')
      : (process.env['BASE_RPC_URL'] || 'https://mainnet.base.org');
    
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // DevBondingCurve V2 contract address
    const contractAddress = process.env['DEV_BONDING_FACTORY_ADDRESS'] || '0x46eCf02772C4Bc9a5cd440FB93022d6e268355c8';
    
    this.contract = new ethers.Contract(
      contractAddress,
      DevBondingCurveV2ABI,
      this.provider
    );
    
    logger.info(`Event listener initialized for contract: ${contractAddress}`);
    logger.info(`RPC URL: ${rpcUrl}`);
  }

  /**
   * Start listening for TokenCreated events
   */
  start() {
    if (this.isListening) {
      logger.warn('Event listener is already running');
      return;
    }

    this.isListening = true;
    
    // Listen for new TokenCreated events
    this.contract.on('TokenCreated', this.handleTokenCreated.bind(this));
    
    logger.info('Event listener started - listening for TokenCreated events');
    
    // Also sync historical events that may have been missed
    this.syncHistoricalEvents();
  }

  /**
   * Stop listening for events
   */
  stop() {
    if (!this.isListening) {
      return;
    }

    this.contract.removeAllListeners();
    this.isListening = false;
    
    logger.info('Event listener stopped');
  }

  /**
   * Handle TokenCreated event
   */
  private async handleTokenCreated(
    token: string,
    creator: string, 
    name: string,
    symbol: string,
    timestamp: bigint,
    devBuyAmount: bigint,
    event: ethers.EventLog
  ) {
    try {
      logger.info(`New token created: ${name} (${symbol}) at ${token} by ${creator}`);
      
      // Check if token already exists in database
      const existingToken = await db.token.findUnique({
        where: { address: token.toLowerCase() }
      });

      if (existingToken) {
        logger.info(`Token ${token} already exists in database, skipping`);
        return;
      }

      // Get additional token metadata
      const tokenContract = new ethers.Contract(token, [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function totalSupply() view returns (uint256)'
      ], this.provider);

      let tokenName = name;
      let tokenSymbol = symbol;
      let decimals = 18;
      let totalSupply = '0';

      try {
        // Get on-chain token details as backup
        const [onChainName, onChainSymbol, onChainDecimals, onChainTotalSupply] = await Promise.all([
          tokenContract.name(),
          tokenContract.symbol(), 
          tokenContract.decimals(),
          tokenContract.totalSupply()
        ]);

        tokenName = onChainName || name;
        tokenSymbol = onChainSymbol || symbol;
        decimals = onChainDecimals;
        totalSupply = onChainTotalSupply.toString();
      } catch (error) {
        logger.warn(`Could not fetch on-chain token details for ${token}:`, error);
      }

      // Calculate initial market cap (using devBuyAmount as initial investment)
      const initialMarketCap = devBuyAmount > 0n ? (Number(ethers.formatEther(devBuyAmount)) * 3000).toString() : '1000'; // Assuming ETH = $3000

      // Find or create user for the creator
      let creatorUser = await db.user.findUnique({
        where: { address: creator.toLowerCase() }
      });

      if (!creatorUser) {
        // Create a new user for the creator
        creatorUser = await db.user.create({
          data: {
            address: creator.toLowerCase(),
            role: 'team', // Default role
            chainType: 'evm'
          }
        });
        logger.info(`Created new user for token creator: ${creator}`);
      }

      // Create token in database
      const newToken = await db.token.create({
        data: {
          address: token.toLowerCase(),
          name: tokenName,
          symbol: tokenSymbol,
          description: '', // Will be updated from metadata if available
          imageUrl: '',
          twitter: '',
          telegram: '',
          website: '',
          totalSupply: totalSupply,
          bondingCurveType: 'constant',
          bondingCurveAddress: this.contract.target as string,
          status: 'ACTIVE',
          marketCap: initialMarketCap,
          bondingProgress: 0,
          holdersCount: 1,
          volume24h: '0',
          change24h: 0,
          creatorId: creatorUser.id,
          deploymentTx: event.transactionHash,
          chainId: process.env['CHAIN_ID'] || '84532',
          createdAt: new Date(Number(timestamp) * 1000)
        }
      });

      logger.info(`Token ${token} successfully added to database with ID: ${newToken.id}`);

      // Emit event for WebSocket clients if needed
      // You can add WebSocket broadcasting here if required

    } catch (error) {
      logger.error(`Error handling TokenCreated event for ${token}:`, error);
    }
  }

  /**
   * Sync historical TokenCreated events that may have been missed
   */
  private async syncHistoricalEvents() {
    try {
      logger.info('Starting historical event sync...');

      // Get the latest block number where we have tokens  
      const latestToken = await db.token.findFirst({
        where: {
          bondingCurveAddress: this.contract.target as string
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Start from the factory start block or a reasonable recent block
      // Since we don't have blockNumber in the existing schema, we'll sync from start block
      const fromBlock = parseInt(process.env['FACTORY_START_BLOCK_SEPOLIA'] || '0');

      const currentBlock = await this.provider.getBlockNumber();
      
      if (fromBlock > currentBlock) {
        logger.info('Already up to date with historical events');
        return;
      }

      // Use the syncBlockRange method which handles batching properly
      await this.syncBlockRange(fromBlock, currentBlock);

      logger.info(`Historical event sync completed`);

    } catch (error) {
      logger.error('Error during historical event sync:', error);
    }
  }

  /**
   * Force sync a specific block range with batching
   */
  async syncBlockRange(fromBlock: number, toBlock: number) {
    try {
      logger.info(`Syncing TokenCreated events from block ${fromBlock} to ${toBlock}`);

      const batchSize = 500; // Alchemy limit
      let totalEvents = 0;

      // Process in batches
      for (let start = fromBlock; start <= toBlock; start += batchSize) {
        const end = Math.min(start + batchSize - 1, toBlock);
        
        logger.debug(`Processing batch: blocks ${start} to ${end}`);

        try {
          const filter = this.contract.filters.TokenCreated();
          const events = await this.contract.queryFilter(filter, start, end);

          logger.debug(`Found ${events.length} events in batch`);
          totalEvents += events.length;

          for (const event of events) {
            if ((event as ethers.EventLog).args) {
              const eventLog = event as ethers.EventLog;
              const [token, creator, name, symbol, timestamp, devBuyAmount] = eventLog.args;
              await this.handleTokenCreated(token, creator, name, symbol, timestamp, devBuyAmount, eventLog);
            }
          }

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          logger.error(`Error processing batch ${start}-${end}:`, error);
          // Continue to next batch
        }
      }

      logger.info(`Block range sync completed. Total events processed: ${totalEvents}`);

    } catch (error) {
      logger.error(`Error syncing block range ${fromBlock}-${toBlock}:`, error);
    }
  }
}

// Export singleton instance
export const eventListenerService = new EventListenerService();