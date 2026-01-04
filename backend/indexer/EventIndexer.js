const { ethers } = require('ethers');
const { Pool } = require('pg');
const Redis = require('redis');

/**
 * Event Indexer Service
 * Indexes blockchain events into PostgreSQL for efficient querying
 */
class EventIndexer {
  constructor(config) {
    this.config = {
      rpcUrl: config.rpcUrl || 'https://base-mainnet.g.alchemy.com/v2/YOUR_KEY',
      contracts: config.contracts,
      database: config.database,
      redis: config.redis,
      startBlock: config.startBlock || 0,
      batchSize: config.batchSize || 1000,
      ...config
    };
    
    this.provider = null;
    this.db = null;
    this.redis = null;
    this.contracts = {};
    this.lastProcessedBlock = 0;
    this.isRunning = false;
  }
  
  async initialize() {
    console.log('🚀 Initializing Event Indexer...');
    
    // Connect to Base
    this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    
    // Initialize database
    this.db = new Pool(this.config.database);
    await this.setupDatabase();
    
    // Initialize Redis for caching
    this.redis = Redis.createClient(this.config.redis);
    await this.redis.connect();
    
    // Load contracts
    await this.loadContracts();
    
    // Get last processed block
    this.lastProcessedBlock = await this.getLastProcessedBlock();
    
    console.log(`✅ Event Indexer initialized. Starting from block ${this.lastProcessedBlock}`);
  }
  
  /**
   * Setup database schema
   */
  async setupDatabase() {
    const queries = [
      // Tokens table
      `CREATE TABLE IF NOT EXISTS tokens (
        address VARCHAR(42) PRIMARY KEY,
        creator VARCHAR(42) NOT NULL,
        name VARCHAR(32) NOT NULL,
        symbol VARCHAR(8) NOT NULL,
        token_id BIGINT UNIQUE,
        created_at TIMESTAMP NOT NULL,
        created_block BIGINT NOT NULL,
        graduated BOOLEAN DEFAULT FALSE,
        uniswap_pool VARCHAR(42),
        graduation_block BIGINT,
        metadata JSONB,
        INDEX idx_creator (creator),
        INDEX idx_created_at (created_at),
        INDEX idx_graduated (graduated)
      )`,
      
      // Trades table
      `CREATE TABLE IF NOT EXISTS trades (
        id SERIAL PRIMARY KEY,
        token VARCHAR(42) NOT NULL,
        trader VARCHAR(42) NOT NULL,
        is_buy BOOLEAN NOT NULL,
        eth_amount NUMERIC(78, 18) NOT NULL,
        token_amount NUMERIC(78, 18) NOT NULL,
        price NUMERIC(78, 18) NOT NULL,
        market_cap NUMERIC(78, 18),
        timestamp TIMESTAMP NOT NULL,
        block_number BIGINT NOT NULL,
        tx_hash VARCHAR(66) NOT NULL,
        gas_used BIGINT,
        INDEX idx_token (token),
        INDEX idx_trader (trader),
        INDEX idx_timestamp (timestamp),
        INDEX idx_block (block_number)
      )`,
      
      // Daily snapshots table
      `CREATE TABLE IF NOT EXISTS daily_snapshots (
        id SERIAL PRIMARY KEY,
        token VARCHAR(42) NOT NULL,
        date DATE NOT NULL,
        open_price NUMERIC(78, 18),
        high_price NUMERIC(78, 18),
        low_price NUMERIC(78, 18),
        close_price NUMERIC(78, 18),
        volume NUMERIC(78, 18),
        trades_count INTEGER,
        holders_count INTEGER,
        UNIQUE(token, date),
        INDEX idx_token_date (token, date)
      )`,
      
      // Fees table
      `CREATE TABLE IF NOT EXISTS fees (
        id SERIAL PRIMARY KEY,
        token VARCHAR(42) NOT NULL,
        platform_fee NUMERIC(78, 18),
        creator_fee NUMERIC(78, 18),
        total_volume NUMERIC(78, 18),
        block_number BIGINT NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        INDEX idx_token (token),
        INDEX idx_block (block_number)
      )`,
      
      // Liquidity locks table
      `CREATE TABLE IF NOT EXISTS liquidity_locks (
        lock_id BIGINT PRIMARY KEY,
        token VARCHAR(42) NOT NULL,
        locker VARCHAR(42) NOT NULL,
        amount NUMERIC(78, 18) NOT NULL,
        duration BIGINT NOT NULL,
        unlock_time TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL,
        released BOOLEAN DEFAULT FALSE,
        INDEX idx_token (token),
        INDEX idx_locker (locker),
        INDEX idx_unlock (unlock_time)
      )`,
      
      // Metrics table (for caching)
      `CREATE TABLE IF NOT EXISTS token_metrics (
        token VARCHAR(42) PRIMARY KEY,
        price NUMERIC(78, 18),
        price_change_24h NUMERIC,
        volume_24h NUMERIC(78, 18),
        liquidity NUMERIC(78, 18),
        market_cap NUMERIC(78, 18),
        holders_count INTEGER,
        trades_24h INTEGER,
        buy_pressure NUMERIC,
        last_updated TIMESTAMP,
        INDEX idx_market_cap (market_cap DESC),
        INDEX idx_volume (volume_24h DESC),
        INDEX idx_updated (last_updated)
      )`,
      
      // Indexer state table
      `CREATE TABLE IF NOT EXISTS indexer_state (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];
    
    for (const query of queries) {
      try {
        await this.db.query(query);
      } catch (error) {
        console.error('Error creating table:', error);
      }
    }
    
    console.log('📊 Database schema ready');
  }
  
  /**
   * Load contract instances
   */
  async loadContracts() {
    const eventEmitterABI = require('./abis/EventEmitter.json');
    const bondingCurveABI = require('./abis/BondingCurve.json');
    const tokenFactoryABI = require('./abis/TokenFactory.json');
    
    this.contracts.eventEmitter = new ethers.Contract(
      this.config.contracts.eventEmitter,
      eventEmitterABI,
      this.provider
    );
    
    this.contracts.bondingCurve = new ethers.Contract(
      this.config.contracts.bondingCurve,
      bondingCurveABI,
      this.provider
    );
    
    this.contracts.tokenFactory = new ethers.Contract(
      this.config.contracts.tokenFactory,
      tokenFactoryABI,
      this.provider
    );
  }
  
  /**
   * Start indexing
   */
  async start() {
    this.isRunning = true;
    console.log('▶️  Starting indexer...');
    
    // Process historical events
    await this.processHistoricalEvents();
    
    // Start real-time indexing
    this.startRealtimeIndexing();
    
    // Start metrics updater
    this.startMetricsUpdater();
  }
  
  /**
   * Process historical events in batches
   */
  async processHistoricalEvents() {
    const currentBlock = await this.provider.getBlockNumber();
    
    if (this.lastProcessedBlock >= currentBlock) {
      console.log('✅ Already up to date');
      return;
    }
    
    console.log(`📚 Processing historical events from block ${this.lastProcessedBlock} to ${currentBlock}`);
    
    let fromBlock = this.lastProcessedBlock + 1;
    
    while (fromBlock <= currentBlock && this.isRunning) {
      const toBlock = Math.min(fromBlock + this.config.batchSize - 1, currentBlock);
      
      console.log(`  Processing blocks ${fromBlock} to ${toBlock}...`);
      
      try {
        // Process events for this batch
        await this.processBatch(fromBlock, toBlock);
        
        // Update last processed block
        await this.updateLastProcessedBlock(toBlock);
        this.lastProcessedBlock = toBlock;
        
        fromBlock = toBlock + 1;
      } catch (error) {
        console.error(`Error processing batch ${fromBlock}-${toBlock}:`, error);
        await this.sleep(5000); // Wait before retry
      }
    }
    
    console.log('✅ Historical events processed');
  }
  
  /**
   * Process a batch of blocks
   */
  async processBatch(fromBlock, toBlock) {
    // Get all events in this range
    const filter = {
      fromBlock,
      toBlock
    };
    
    // Process TokenCreated events
    const tokenCreatedEvents = await this.contracts.eventEmitter.queryFilter(
      this.contracts.eventEmitter.filters.TokenCreated(),
      fromBlock,
      toBlock
    );
    
    for (const event of tokenCreatedEvents) {
      await this.indexTokenCreated(event);
    }
    
    // Process TokenTraded events
    const tokenTradedEvents = await this.contracts.eventEmitter.queryFilter(
      this.contracts.eventEmitter.filters.TokenTraded(),
      fromBlock,
      toBlock
    );
    
    for (const event of tokenTradedEvents) {
      await this.indexTokenTraded(event);
    }
    
    // Process TokenGraduated events
    const tokenGraduatedEvents = await this.contracts.eventEmitter.queryFilter(
      this.contracts.eventEmitter.filters.TokenGraduated(),
      fromBlock,
      toBlock
    );
    
    for (const event of tokenGraduatedEvents) {
      await this.indexTokenGraduated(event);
    }
    
    // Process fee events
    const feeEvents = await this.contracts.eventEmitter.queryFilter(
      this.contracts.eventEmitter.filters.FeesCollected(),
      fromBlock,
      toBlock
    );
    
    for (const event of feeEvents) {
      await this.indexFeesCollected(event);
    }
    
    // Process daily snapshots
    const snapshotEvents = await this.contracts.eventEmitter.queryFilter(
      this.contracts.eventEmitter.filters.DailySnapshot(),
      fromBlock,
      toBlock
    );
    
    for (const event of snapshotEvents) {
      await this.indexDailySnapshot(event);
    }
  }
  
  /**
   * Start real-time event indexing
   */
  startRealtimeIndexing() {
    console.log('📡 Starting real-time indexing...');
    
    // Listen for new events
    this.contracts.eventEmitter.on('TokenCreated', async (token, creator, tokenId, name, symbol, timestamp, metadata, event) => {
      await this.indexTokenCreated(event);
    });
    
    this.contracts.eventEmitter.on('TokenTraded', async (...args) => {
      const event = args[args.length - 1];
      await this.indexTokenTraded(event);
    });
    
    this.contracts.eventEmitter.on('TokenGraduated', async (...args) => {
      const event = args[args.length - 1];
      await this.indexTokenGraduated(event);
    });
    
    this.contracts.eventEmitter.on('FeesCollected', async (...args) => {
      const event = args[args.length - 1];
      await this.indexFeesCollected(event);
    });
    
    this.contracts.eventEmitter.on('DailySnapshot', async (...args) => {
      const event = args[args.length - 1];
      await this.indexDailySnapshot(event);
    });
  }
  
  /**
   * Start metrics updater
   */
  startMetricsUpdater() {
    setInterval(async () => {
      try {
        await this.updateTokenMetrics();
      } catch (error) {
        console.error('Error updating metrics:', error);
      }
    }, 60000); // Update every minute
  }
  
  // ============ Event Indexing Functions ============
  
  async indexTokenCreated(event) {
    const { token, creator, tokenId, name, symbol, timestamp, metadata } = event.args;
    
    const query = `
      INSERT INTO tokens (address, creator, name, symbol, token_id, created_at, created_block, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (address) DO NOTHING
    `;
    
    await this.db.query(query, [
      token,
      creator,
      name,
      symbol,
      tokenId.toString(),
      new Date(Number(timestamp) * 1000),
      event.blockNumber,
      { metadata: metadata }
    ]);
    
    // Clear cache
    await this.redis.del(`token:${token}`);
  }
  
  async indexTokenTraded(event) {
    const { token, trader, isBuy, ethAmount, tokenAmount, newPrice, newMarketCap, timestamp } = event.args;
    
    const query = `
      INSERT INTO trades (token, trader, is_buy, eth_amount, token_amount, price, market_cap, timestamp, block_number, tx_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    
    await this.db.query(query, [
      token,
      trader,
      isBuy,
      ethers.formatEther(ethAmount),
      ethers.formatUnits(tokenAmount, 18),
      ethers.formatEther(newPrice),
      ethers.formatUnits(newMarketCap, 8),
      new Date(Number(timestamp) * 1000),
      event.blockNumber,
      event.transactionHash
    ]);
    
    // Update metrics cache
    await this.updateTokenMetricsCache(token);
  }
  
  async indexTokenGraduated(event) {
    const { token, uniswapPool, finalMarketCap } = event.args;
    
    const query = `
      UPDATE tokens 
      SET graduated = true, 
          uniswap_pool = $1, 
          graduation_block = $2
      WHERE address = $3
    `;
    
    await this.db.query(query, [
      uniswapPool,
      event.blockNumber,
      token
    ]);
    
    // Clear cache
    await this.redis.del(`token:${token}`);
  }
  
  async indexFeesCollected(event) {
    const { token, platformFee, creatorFee, totalVolume } = event.args;
    
    const query = `
      INSERT INTO fees (token, platform_fee, creator_fee, total_volume, block_number, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    await this.db.query(query, [
      token,
      ethers.formatEther(platformFee),
      ethers.formatEther(creatorFee),
      ethers.formatEther(totalVolume),
      event.blockNumber,
      new Date()
    ]);
  }
  
  async indexDailySnapshot(event) {
    const { token, date, volume, high, low, close, trades } = event.args;
    
    const query = `
      INSERT INTO daily_snapshots (token, date, open_price, high_price, low_price, close_price, volume, trades_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (token, date) 
      DO UPDATE SET 
        high_price = EXCLUDED.high_price,
        low_price = EXCLUDED.low_price,
        close_price = EXCLUDED.close_price,
        volume = EXCLUDED.volume,
        trades_count = EXCLUDED.trades_count
    `;
    
    // Get open price from first trade of the day
    const openPrice = await this.getOpenPrice(token, date);
    
    await this.db.query(query, [
      token,
      new Date(Number(date) * 1000),
      ethers.formatEther(openPrice || low),
      ethers.formatEther(high),
      ethers.formatEther(low),
      ethers.formatEther(close),
      ethers.formatEther(volume),
      trades.toString()
    ]);
  }
  
  // ============ Metrics Functions ============
  
  async updateTokenMetrics() {
    const query = `
      SELECT DISTINCT token FROM trades 
      WHERE timestamp > NOW() - INTERVAL '24 hours'
    `;
    
    const result = await this.db.query(query);
    
    for (const row of result.rows) {
      await this.updateTokenMetricsCache(row.token);
    }
  }
  
  async updateTokenMetricsCache(token) {
    // Calculate 24h metrics
    const metricsQuery = `
      WITH recent_trades AS (
        SELECT * FROM trades 
        WHERE token = $1 
        AND timestamp > NOW() - INTERVAL '24 hours'
      ),
      price_24h_ago AS (
        SELECT price FROM trades 
        WHERE token = $1 
        AND timestamp <= NOW() - INTERVAL '24 hours'
        ORDER BY timestamp DESC 
        LIMIT 1
      )
      SELECT 
        (SELECT price FROM trades WHERE token = $1 ORDER BY timestamp DESC LIMIT 1) as current_price,
        (SELECT price FROM price_24h_ago) as price_24h_ago,
        COALESCE(SUM(eth_amount), 0) as volume_24h,
        COUNT(*) as trades_24h,
        COUNT(DISTINCT trader) as unique_traders,
        SUM(CASE WHEN is_buy THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0) * 100 as buy_pressure
      FROM recent_trades
    `;
    
    const result = await this.db.query(metricsQuery, [token]);
    const metrics = result.rows[0];
    
    if (metrics && metrics.current_price) {
      const priceChange = metrics.price_24h_ago ? 
        ((metrics.current_price - metrics.price_24h_ago) / metrics.price_24h_ago * 100) : 0;
      
      // Update metrics table
      const updateQuery = `
        INSERT INTO token_metrics (
          token, price, price_change_24h, volume_24h, trades_24h, buy_pressure, last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (token) 
        DO UPDATE SET 
          price = EXCLUDED.price,
          price_change_24h = EXCLUDED.price_change_24h,
          volume_24h = EXCLUDED.volume_24h,
          trades_24h = EXCLUDED.trades_24h,
          buy_pressure = EXCLUDED.buy_pressure,
          last_updated = NOW()
      `;
      
      await this.db.query(updateQuery, [
        token,
        metrics.current_price,
        priceChange,
        metrics.volume_24h,
        metrics.trades_24h,
        metrics.buy_pressure || 50
      ]);
      
      // Update Redis cache
      await this.redis.setex(
        `metrics:${token}`,
        300, // 5 minute TTL
        JSON.stringify({
          price: metrics.current_price,
          priceChange24h: priceChange,
          volume24h: metrics.volume_24h,
          trades24h: metrics.trades_24h,
          buyPressure: metrics.buy_pressure
        })
      );
    }
  }
  
  // ============ Query Functions ============
  
  async getTopTokens(limit = 100, orderBy = 'market_cap') {
    const validColumns = ['market_cap', 'volume_24h', 'price_change_24h', 'trades_24h'];
    if (!validColumns.includes(orderBy)) {
      orderBy = 'market_cap';
    }
    
    const query = `
      SELECT 
        t.address,
        t.name,
        t.symbol,
        t.creator,
        t.created_at,
        t.graduated,
        m.price,
        m.price_change_24h,
        m.volume_24h,
        m.market_cap,
        m.trades_24h,
        m.buy_pressure
      FROM tokens t
      LEFT JOIN token_metrics m ON t.address = m.token
      WHERE m.${orderBy} IS NOT NULL
      ORDER BY m.${orderBy} DESC
      LIMIT $1
    `;
    
    const result = await this.db.query(query, [limit]);
    return result.rows;
  }
  
  async getTokenInfo(token) {
    // Check cache first
    const cached = await this.redis.get(`token:${token}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const query = `
      SELECT 
        t.*,
        m.price,
        m.price_change_24h,
        m.volume_24h,
        m.market_cap,
        m.trades_24h
      FROM tokens t
      LEFT JOIN token_metrics m ON t.address = m.token
      WHERE t.address = $1
    `;
    
    const result = await this.db.query(query, [token]);
    
    if (result.rows.length > 0) {
      const tokenInfo = result.rows[0];
      
      // Cache for 1 minute
      await this.redis.setex(`token:${token}`, 60, JSON.stringify(tokenInfo));
      
      return tokenInfo;
    }
    
    return null;
  }
  
  async getTokenHistory(token, days = 30) {
    const query = `
      SELECT * FROM daily_snapshots
      WHERE token = $1
      AND date >= NOW() - INTERVAL '${days} days'
      ORDER BY date ASC
    `;
    
    const result = await this.db.query(query, [token]);
    return result.rows;
  }
  
  async getRecentTrades(token, limit = 100) {
    const query = `
      SELECT * FROM trades
      WHERE token = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;
    
    const result = await this.db.query(query, [token, limit]);
    return result.rows;
  }
  
  // ============ Helper Functions ============
  
  async getLastProcessedBlock() {
    const query = "SELECT value FROM indexer_state WHERE key = 'last_processed_block'";
    const result = await this.db.query(query);
    
    if (result.rows.length > 0) {
      return parseInt(result.rows[0].value);
    }
    
    return this.config.startBlock;
  }
  
  async updateLastProcessedBlock(blockNumber) {
    const query = `
      INSERT INTO indexer_state (key, value, updated_at)
      VALUES ('last_processed_block', $1, NOW())
      ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
    `;
    
    await this.db.query(query, [blockNumber.toString()]);
  }
  
  async getOpenPrice(token, date) {
    const query = `
      SELECT price FROM trades
      WHERE token = $1
      AND DATE(timestamp) = DATE($2)
      ORDER BY timestamp ASC
      LIMIT 1
    `;
    
    const result = await this.db.query(query, [token, new Date(Number(date) * 1000)]);
    
    if (result.rows.length > 0) {
      return result.rows[0].price;
    }
    
    return null;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // ============ Lifecycle ============
  
  async stop() {
    console.log('🛑 Stopping indexer...');
    this.isRunning = false;
    
    // Remove event listeners
    this.provider.removeAllListeners();
    
    // Close connections
    await this.db.end();
    await this.redis.quit();
    
    console.log('✅ Indexer stopped');
  }
}

module.exports = EventIndexer;