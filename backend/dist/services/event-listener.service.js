"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventListenerService = exports.EventListenerService = void 0;
const ethers_1 = require("ethers");
const database_service_1 = require("./database.service");
const logger_service_1 = __importDefault(require("./logger.service"));
const DevBondingCurveV2ABI = require('../abis/DevBondingCurveV2ABI.json');
class EventListenerService {
    provider;
    contract;
    isListening = false;
    constructor() {
        // Use Base Sepolia for testnet
        const isTestnet = process.env['NODE_ENV'] !== 'production' || process.env['CHAIN_ID'] === '84532';
        const rpcUrl = isTestnet
            ? (process.env['BASE_SEPOLIA_RPC_URL'] || 'https://base-sepolia.drpc.org')
            : (process.env['BASE_RPC_URL'] || 'https://mainnet.base.org');
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        // DevBondingCurve V2 contract address
        const contractAddress = process.env['DEV_BONDING_FACTORY_ADDRESS'] || '0x46eCf02772C4Bc9a5cd440FB93022d6e268355c8';
        this.contract = new ethers_1.ethers.Contract(contractAddress, DevBondingCurveV2ABI, this.provider);
        logger_service_1.default.info(`Event listener initialized for contract: ${contractAddress}`);
        logger_service_1.default.info(`RPC URL: ${rpcUrl}`);
    }
    /**
     * Start listening for TokenCreated events
     */
    start() {
        if (this.isListening) {
            logger_service_1.default.warn('Event listener is already running');
            return;
        }
        this.isListening = true;
        // Listen for new TokenCreated events
        this.contract.on('TokenCreated', this.handleTokenCreated.bind(this));
        logger_service_1.default.info('Event listener started - listening for TokenCreated events');
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
        logger_service_1.default.info('Event listener stopped');
    }
    /**
     * Handle TokenCreated event
     */
    async handleTokenCreated(token, creator, name, symbol, timestamp, devBuyAmount, event) {
        try {
            logger_service_1.default.info(`New token created: ${name} (${symbol}) at ${token} by ${creator}`);
            // Check if token already exists in database
            const existingToken = await database_service_1.db.token.findUnique({
                where: { address: token.toLowerCase() }
            });
            if (existingToken) {
                logger_service_1.default.info(`Token ${token} already exists in database, skipping`);
                return;
            }
            // Get additional token metadata
            const tokenContract = new ethers_1.ethers.Contract(token, [
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
            }
            catch (error) {
                logger_service_1.default.warn(`Could not fetch on-chain token details for ${token}:`, error);
            }
            // Calculate initial market cap (using devBuyAmount as initial investment)
            const initialMarketCap = devBuyAmount > 0n ? (Number(ethers_1.ethers.formatEther(devBuyAmount)) * 3000).toString() : '1000'; // Assuming ETH = $3000
            // Find or create user for the creator
            let creatorUser = await database_service_1.db.user.findUnique({
                where: { address: creator.toLowerCase() }
            });
            if (!creatorUser) {
                // Create a new user for the creator
                creatorUser = await database_service_1.db.user.create({
                    data: {
                        address: creator.toLowerCase(),
                        role: 'team', // Default role
                        chainType: 'evm'
                    }
                });
                logger_service_1.default.info(`Created new user for token creator: ${creator}`);
            }
            // Create token in database
            const newToken = await database_service_1.db.token.create({
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
                    bondingCurveAddress: this.contract.target,
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
            logger_service_1.default.info(`Token ${token} successfully added to database with ID: ${newToken.id}`);
            // Emit event for WebSocket clients if needed
            // You can add WebSocket broadcasting here if required
        }
        catch (error) {
            logger_service_1.default.error(`Error handling TokenCreated event for ${token}:`, error);
        }
    }
    /**
     * Sync historical TokenCreated events that may have been missed
     */
    async syncHistoricalEvents() {
        try {
            logger_service_1.default.info('Starting historical event sync...');
            // Get the latest block number where we have tokens  
            const latestToken = await database_service_1.db.token.findFirst({
                where: {
                    bondingCurveAddress: this.contract.target
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
                logger_service_1.default.info('Already up to date with historical events');
                return;
            }
            // Use the syncBlockRange method which handles batching properly
            await this.syncBlockRange(fromBlock, currentBlock);
            logger_service_1.default.info(`Historical event sync completed`);
        }
        catch (error) {
            logger_service_1.default.error('Error during historical event sync:', error);
        }
    }
    /**
     * Force sync a specific block range with batching
     */
    async syncBlockRange(fromBlock, toBlock) {
        try {
            logger_service_1.default.info(`Syncing TokenCreated events from block ${fromBlock} to ${toBlock}`);
            const batchSize = 500; // Alchemy limit
            let totalEvents = 0;
            // Process in batches
            for (let start = fromBlock; start <= toBlock; start += batchSize) {
                const end = Math.min(start + batchSize - 1, toBlock);
                logger_service_1.default.debug(`Processing batch: blocks ${start} to ${end}`);
                try {
                    const filter = this.contract.filters.TokenCreated();
                    const events = await this.contract.queryFilter(filter, start, end);
                    logger_service_1.default.debug(`Found ${events.length} events in batch`);
                    totalEvents += events.length;
                    for (const event of events) {
                        if (event.args) {
                            const eventLog = event;
                            const [token, creator, name, symbol, timestamp, devBuyAmount] = eventLog.args;
                            await this.handleTokenCreated(token, creator, name, symbol, timestamp, devBuyAmount, eventLog);
                        }
                    }
                    // Add delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                catch (error) {
                    logger_service_1.default.error(`Error processing batch ${start}-${end}:`, error);
                    // Continue to next batch
                }
            }
            logger_service_1.default.info(`Block range sync completed. Total events processed: ${totalEvents}`);
        }
        catch (error) {
            logger_service_1.default.error(`Error syncing block range ${fromBlock}-${toBlock}:`, error);
        }
    }
}
exports.EventListenerService = EventListenerService;
// Export singleton instance
exports.eventListenerService = new EventListenerService();
//# sourceMappingURL=event-listener.service.js.map