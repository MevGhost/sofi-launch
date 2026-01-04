const { ethers } = require('ethers');
const WebSocket = require('ws');
const EventEmitter = require('events');

/**
 * Real-time event listener for the launchpad
 * Streams events via WebSocket for frontend consumption
 */
class LaunchpadEventListener extends EventEmitter {
  constructor(config) {
    super();
    
    this.config = {
      rpcUrl: config.rpcUrl || 'wss://base-mainnet.g.alchemy.com/v2/YOUR_KEY',
      eventEmitterAddress: config.eventEmitterAddress,
      bondingCurveAddress: config.bondingCurveAddress,
      tokenFactoryAddress: config.tokenFactoryAddress,
      startBlock: config.startBlock || 'latest',
      wsPort: config.wsPort || 8080,
      ...config
    };
    
    this.provider = null;
    this.contracts = {};
    this.wsServer = null;
    this.clients = new Set();
    this.eventCache = new Map();
    this.blockCache = new Map();
  }
  
  /**
   * Initialize the event listener
   */
  async initialize() {
    console.log('🚀 Initializing Event Listener...');
    
    // Connect to Base
    this.provider = new ethers.WebSocketProvider(this.config.rpcUrl);
    
    // Load contract ABIs
    const eventEmitterABI = require('./abis/EventEmitter.json');
    const bondingCurveABI = require('./abis/BondingCurve.json');
    const tokenFactoryABI = require('./abis/TokenFactory.json');
    
    // Initialize contracts
    this.contracts.eventEmitter = new ethers.Contract(
      this.config.eventEmitterAddress,
      eventEmitterABI,
      this.provider
    );
    
    this.contracts.bondingCurve = new ethers.Contract(
      this.config.bondingCurveAddress,
      bondingCurveABI,
      this.provider
    );
    
    this.contracts.tokenFactory = new ethers.Contract(
      this.config.tokenFactoryAddress,
      tokenFactoryABI,
      this.provider
    );
    
    // Setup WebSocket server
    this.setupWebSocketServer();
    
    // Start listening to events
    this.setupEventListeners();
    
    console.log('✅ Event Listener initialized');
  }
  
  /**
   * Setup WebSocket server for client connections
   */
  setupWebSocketServer() {
    this.wsServer = new WebSocket.Server({ port: this.config.wsPort });
    
    this.wsServer.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const client = {
        id: clientId,
        ws,
        subscriptions: new Set(),
        ip: req.socket.remoteAddress
      };
      
      this.clients.add(client);
      console.log(`📱 Client connected: ${clientId} from ${client.ip}`);
      
      // Send welcome message
      this.sendToClient(client, {
        type: 'welcome',
        clientId,
        timestamp: Date.now()
      });
      
      // Handle client messages
      ws.on('message', (message) => {
        this.handleClientMessage(client, message);
      });
      
      // Handle disconnection
      ws.on('close', () => {
        this.clients.delete(client);
        console.log(`📴 Client disconnected: ${clientId}`);
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for ${clientId}:`, error);
      });
    });
    
    console.log(`🌐 WebSocket server listening on port ${this.config.wsPort}`);
  }
  
  /**
   * Setup blockchain event listeners
   */
  setupEventListeners() {
    // Token lifecycle events
    this.contracts.eventEmitter.on('TokenCreated', this.handleTokenCreated.bind(this));
    this.contracts.eventEmitter.on('TokenTraded', this.handleTokenTraded.bind(this));
    this.contracts.eventEmitter.on('TokenGraduated', this.handleTokenGraduated.bind(this));
    
    // Financial events
    this.contracts.eventEmitter.on('FeesCollected', this.handleFeesCollected.bind(this));
    this.contracts.eventEmitter.on('CreatorFeeClaimed', this.handleCreatorFeeClaimed.bind(this));
    this.contracts.eventEmitter.on('SwapbackExecuted', this.handleSwapbackExecuted.bind(this));
    
    // Tool events
    this.contracts.eventEmitter.on('LiquidityLocked', this.handleLiquidityLocked.bind(this));
    this.contracts.eventEmitter.on('VestingScheduleCreated', this.handleVestingScheduleCreated.bind(this));
    this.contracts.eventEmitter.on('MultisendCompleted', this.handleMultisendCompleted.bind(this));
    
    // Metrics events
    this.contracts.eventEmitter.on('TokenMetricsUpdate', this.handleMetricsUpdate.bind(this));
    this.contracts.eventEmitter.on('DailySnapshot', this.handleDailySnapshot.bind(this));
    
    // Block listener for additional processing
    this.provider.on('block', this.handleNewBlock.bind(this));
    
    console.log('👂 Event listeners setup complete');
  }
  
  // ============ Event Handlers ============
  
  async handleTokenCreated(token, creator, tokenId, name, symbol, timestamp, metadata, event) {
    const eventData = {
      type: 'token_created',
      data: {
        token,
        creator,
        tokenId: tokenId.toString(),
        name,
        symbol,
        timestamp: timestamp.toString(),
        metadata,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      },
      timestamp: Date.now()
    };
    
    // Broadcast to subscribed clients
    this.broadcast(eventData, ['token_created', `token:${token}`]);
    
    // Store in cache
    this.eventCache.set(`token:${token}:created`, eventData);
    
    // Log
    console.log(`🎉 New token created: ${name} (${symbol}) at ${token}`);
  }
  
  async handleTokenTraded(token, trader, isBuy, ethAmount, tokenAmount, newPrice, newMarketCap, timestamp, event) {
    const eventData = {
      type: 'token_traded',
      data: {
        token,
        trader,
        isBuy,
        ethAmount: ethers.formatEther(ethAmount),
        tokenAmount: ethers.formatUnits(tokenAmount, 18),
        newPrice: ethers.formatEther(newPrice),
        newMarketCap: ethers.formatUnits(newMarketCap, 8),
        timestamp: timestamp.toString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      },
      timestamp: Date.now()
    };
    
    // Broadcast to subscribed clients
    this.broadcast(eventData, ['trades', `token:${token}`, `trader:${trader}`]);
    
    // Update price cache
    this.updatePriceCache(token, newPrice, newMarketCap);
    
    // Log significant trades
    if (parseFloat(eventData.data.ethAmount) > 1) {
      console.log(`🐋 Large trade: ${isBuy ? 'BUY' : 'SELL'} ${eventData.data.ethAmount} ETH on ${token}`);
    }
  }
  
  async handleTokenGraduated(token, uniswapPool, finalMarketCap, liquidityAdded, ethLiquidity, tokenLiquidity, timestamp, event) {
    const eventData = {
      type: 'token_graduated',
      data: {
        token,
        uniswapPool,
        finalMarketCap: ethers.formatUnits(finalMarketCap, 8),
        liquidityAdded: ethers.formatEther(liquidityAdded),
        ethLiquidity: ethers.formatEther(ethLiquidity),
        tokenLiquidity: ethers.formatUnits(tokenLiquidity, 18),
        timestamp: timestamp.toString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      },
      timestamp: Date.now()
    };
    
    // Broadcast to all clients (important event)
    this.broadcast(eventData, ['graduations', `token:${token}`, 'important']);
    
    console.log(`🎓 Token graduated: ${token} with $${eventData.data.finalMarketCap} market cap`);
  }
  
  async handleMetricsUpdate(token, blockNumber, packedData, event) {
    // Decode packed data
    const metrics = this.decodeMetrics(packedData);
    
    const eventData = {
      type: 'metrics_update',
      data: {
        token,
        price: ethers.formatEther(metrics.price),
        volume24h: ethers.formatEther(metrics.volume24h),
        holders: metrics.holders,
        trades24h: metrics.trades24h,
        liquidity: ethers.formatEther(metrics.liquidity),
        blockNumber: blockNumber.toString()
      },
      timestamp: Date.now()
    };
    
    // Broadcast to subscribed clients
    this.broadcast(eventData, ['metrics', `token:${token}`]);
    
    // Update metrics cache
    this.updateMetricsCache(token, metrics);
  }
  
  async handleDailySnapshot(token, date, volume, high, low, close, trades, event) {
    const eventData = {
      type: 'daily_snapshot',
      data: {
        token,
        date: new Date(Number(date) * 1000).toISOString(),
        volume: ethers.formatEther(volume),
        high: ethers.formatEther(high),
        low: ethers.formatEther(low),
        close: ethers.formatEther(close),
        trades: trades.toString()
      },
      timestamp: Date.now()
    };
    
    // Broadcast to subscribed clients
    this.broadcast(eventData, ['snapshots', `token:${token}`]);
    
    console.log(`📊 Daily snapshot for ${token}: Volume ${eventData.data.volume} ETH`);
  }
  
  async handleFeesCollected(token, blockNumber, platformFee, creatorFee, totalVolume, event) {
    const eventData = {
      type: 'fees_collected',
      data: {
        token,
        platformFee: ethers.formatEther(platformFee),
        creatorFee: ethers.formatEther(creatorFee),
        totalVolume: ethers.formatEther(totalVolume),
        blockNumber: blockNumber.toString()
      },
      timestamp: Date.now()
    };
    
    this.broadcast(eventData, ['fees', `token:${token}`]);
  }
  
  async handleCreatorFeeClaimed(token, creator, amount, totalClaimed, timestamp, event) {
    const eventData = {
      type: 'creator_fee_claimed',
      data: {
        token,
        creator,
        amount: ethers.formatEther(amount),
        totalClaimed: ethers.formatEther(totalClaimed),
        timestamp: timestamp.toString()
      },
      timestamp: Date.now()
    };
    
    this.broadcast(eventData, ['fees', `token:${token}`, `creator:${creator}`]);
  }
  
  async handleSwapbackExecuted(executor, blockNumber, ethAmount, tokensReceived, priceImpact, timestamp, event) {
    const eventData = {
      type: 'swapback_executed',
      data: {
        executor,
        ethAmount: ethers.formatEther(ethAmount),
        tokensReceived: ethers.formatUnits(tokensReceived, 18),
        priceImpact: (Number(priceImpact) / 100).toFixed(2) + '%',
        timestamp: timestamp.toString(),
        blockNumber: blockNumber.toString()
      },
      timestamp: Date.now()
    };
    
    this.broadcast(eventData, ['swapback', 'important']);
  }
  
  async handleLiquidityLocked(token, locker, lockId, duration, amount, unlockTime, event) {
    const eventData = {
      type: 'liquidity_locked',
      data: {
        token,
        locker,
        lockId: lockId.toString(),
        duration: duration.toString(),
        amount: ethers.formatUnits(amount, 18),
        unlockTime: new Date(Number(unlockTime) * 1000).toISOString()
      },
      timestamp: Date.now()
    };
    
    this.broadcast(eventData, ['locks', `token:${token}`]);
  }
  
  async handleVestingScheduleCreated(beneficiary, token, scheduleId, amount, vestingStart, vestingEnd, cliff, event) {
    const eventData = {
      type: 'vesting_created',
      data: {
        beneficiary,
        token,
        scheduleId: scheduleId.toString(),
        amount: ethers.formatUnits(amount, 18),
        vestingStart: new Date(Number(vestingStart) * 1000).toISOString(),
        vestingEnd: new Date(Number(vestingEnd) * 1000).toISOString(),
        cliff: cliff.toString()
      },
      timestamp: Date.now()
    };
    
    this.broadcast(eventData, ['vesting', `token:${token}`, `beneficiary:${beneficiary}`]);
  }
  
  async handleMultisendCompleted(token, sender, recipientCount, totalAmount, averageAmount, timestamp, event) {
    const eventData = {
      type: 'multisend_completed',
      data: {
        token,
        sender,
        recipientCount: recipientCount.toString(),
        totalAmount: ethers.formatUnits(totalAmount, 18),
        averageAmount: ethers.formatUnits(averageAmount, 18),
        timestamp: timestamp.toString()
      },
      timestamp: Date.now()
    };
    
    this.broadcast(eventData, ['multisend', `token:${token}`]);
  }
  
  async handleNewBlock(blockNumber) {
    // Periodic tasks on new blocks
    if (blockNumber % 100 === 0) {
      // Clean up old cache entries
      this.cleanupCache();
    }
    
    // Broadcast block update
    this.broadcast({
      type: 'new_block',
      data: { blockNumber },
      timestamp: Date.now()
    }, ['blocks']);
  }
  
  // ============ Client Communication ============
  
  handleClientMessage(client, message) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'subscribe':
          this.handleSubscribe(client, data.channels);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(client, data.channels);
          break;
        case 'ping':
          this.sendToClient(client, { type: 'pong', timestamp: Date.now() });
          break;
        case 'get_price':
          this.handleGetPrice(client, data.token);
          break;
        case 'get_metrics':
          this.handleGetMetrics(client, data.token);
          break;
        default:
          console.warn(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error handling client message:', error);
      this.sendToClient(client, {
        type: 'error',
        message: 'Invalid message format',
        timestamp: Date.now()
      });
    }
  }
  
  handleSubscribe(client, channels) {
    channels.forEach(channel => {
      client.subscriptions.add(channel);
    });
    
    this.sendToClient(client, {
      type: 'subscribed',
      channels,
      timestamp: Date.now()
    });
  }
  
  handleUnsubscribe(client, channels) {
    channels.forEach(channel => {
      client.subscriptions.delete(channel);
    });
    
    this.sendToClient(client, {
      type: 'unsubscribed',
      channels,
      timestamp: Date.now()
    });
  }
  
  handleGetPrice(client, token) {
    const price = this.eventCache.get(`price:${token}`);
    this.sendToClient(client, {
      type: 'price_response',
      token,
      price: price || null,
      timestamp: Date.now()
    });
  }
  
  handleGetMetrics(client, token) {
    const metrics = this.eventCache.get(`metrics:${token}`);
    this.sendToClient(client, {
      type: 'metrics_response',
      token,
      metrics: metrics || null,
      timestamp: Date.now()
    });
  }
  
  // ============ Helper Functions ============
  
  broadcast(data, channels) {
    this.clients.forEach(client => {
      // Check if client is subscribed to any of the channels
      const shouldSend = channels.some(channel => 
        client.subscriptions.has(channel) || 
        client.subscriptions.has('all')
      );
      
      if (shouldSend) {
        this.sendToClient(client, data);
      }
    });
  }
  
  sendToClient(client, data) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }
  
  updatePriceCache(token, price, marketCap) {
    this.eventCache.set(`price:${token}`, {
      price: ethers.formatEther(price),
      marketCap: ethers.formatUnits(marketCap, 8),
      timestamp: Date.now()
    });
  }
  
  updateMetricsCache(token, metrics) {
    this.eventCache.set(`metrics:${token}`, {
      ...metrics,
      timestamp: Date.now()
    });
  }
  
  decodeMetrics(packedData) {
    const data = BigInt(packedData);
    return {
      price: (data >> 192n) & 0xFFFFFFFFFFFFFFFFn,
      volume24h: (data >> 128n) & 0xFFFFFFFFFFFFFFFFn,
      holders: Number((data >> 96n) & 0xFFFFFFFFn),
      trades24h: Number((data >> 64n) & 0xFFFFFFFFn),
      liquidity: data & 0xFFFFFFFFFFFFFFFFn
    };
  }
  
  cleanupCache() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    for (const [key, value] of this.eventCache.entries()) {
      if (value.timestamp && now - value.timestamp > maxAge) {
        this.eventCache.delete(key);
      }
    }
  }
  
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // ============ Lifecycle ============
  
  async stop() {
    console.log('🛑 Stopping Event Listener...');
    
    // Close WebSocket connections
    this.clients.forEach(client => {
      client.ws.close();
    });
    
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    // Remove event listeners
    this.provider.removeAllListeners();
    
    // Close provider connection
    if (this.provider) {
      await this.provider.destroy();
    }
    
    console.log('✅ Event Listener stopped');
  }
}

module.exports = LaunchpadEventListener;