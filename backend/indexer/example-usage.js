const EventListener = require('./EventListener');
const EventIndexer = require('./EventIndexer');
const WebSocket = require('ws');

/**
 * Example usage of the event system
 */

// ============ 1. Start the Event Indexer ============
async function startIndexer() {
  const indexer = new EventIndexer({
    rpcUrl: process.env.BASE_RPC_URL,
    contracts: {
      eventEmitter: process.env.EVENT_EMITTER_ADDRESS,
      bondingCurve: process.env.BONDING_CURVE_ADDRESS,
      tokenFactory: process.env.TOKEN_FACTORY_ADDRESS
    },
    database: {
      host: 'localhost',
      port: 5432,
      database: 'launchpad',
      user: 'postgres',
      password: 'password'
    },
    redis: {
      host: 'localhost',
      port: 6379
    },
    startBlock: 12000000, // Base mainnet start block
    batchSize: 1000
  });
  
  await indexer.initialize();
  await indexer.start();
  
  // Query examples
  const topTokens = await indexer.getTopTokens(10, 'volume_24h');
  console.log('Top tokens by volume:', topTokens);
  
  return indexer;
}

// ============ 2. Start the WebSocket Event Listener ============
async function startEventListener() {
  const listener = new EventListener({
    rpcUrl: process.env.BASE_WSS_URL, // WebSocket URL
    eventEmitterAddress: process.env.EVENT_EMITTER_ADDRESS,
    bondingCurveAddress: process.env.BONDING_CURVE_ADDRESS,
    tokenFactoryAddress: process.env.TOKEN_FACTORY_ADDRESS,
    wsPort: 8080
  });
  
  await listener.initialize();
  
  return listener;
}

// ============ 3. Connect as a WebSocket Client ============
function connectAsClient() {
  const ws = new WebSocket('ws://localhost:8080');
  
  ws.on('open', () => {
    console.log('Connected to event stream');
    
    // Subscribe to different channels
    ws.send(JSON.stringify({
      type: 'subscribe',
      channels: ['token_created', 'trades', 'graduations', 'metrics']
    }));
    
    // Subscribe to specific token events
    ws.send(JSON.stringify({
      type: 'subscribe',
      channels: ['token:0x123...'] // Replace with actual token address
    }));
    
    // Request current price
    ws.send(JSON.stringify({
      type: 'get_price',
      token: '0x123...'
    }));
  });
  
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    switch (message.type) {
      case 'token_created':
        console.log('🎉 New token:', message.data.name, message.data.symbol);
        break;
        
      case 'token_traded':
        const action = message.data.isBuy ? '📈 BUY' : '📉 SELL';
        console.log(`${action}: ${message.data.ethAmount} ETH @ ${message.data.newPrice}`);
        break;
        
      case 'token_graduated':
        console.log('🎓 Token graduated!', message.data.token);
        break;
        
      case 'metrics_update':
        console.log('📊 Metrics:', message.data);
        break;
        
      case 'price_response':
        console.log('💰 Current price:', message.data.price);
        break;
    }
  });
  
  // Send periodic pings
  setInterval(() => {
    ws.send(JSON.stringify({ type: 'ping' }));
  }, 30000);
  
  return ws;
}

// ============ 4. REST API Example ============
const express = require('express');

function createRestAPI(indexer) {
  const app = express();
  
  // Get top tokens
  app.get('/api/tokens/top', async (req, res) => {
    const { limit = 100, orderBy = 'market_cap' } = req.query;
    const tokens = await indexer.getTopTokens(limit, orderBy);
    res.json(tokens);
  });
  
  // Get token info
  app.get('/api/tokens/:address', async (req, res) => {
    const tokenInfo = await indexer.getTokenInfo(req.params.address);
    if (tokenInfo) {
      res.json(tokenInfo);
    } else {
      res.status(404).json({ error: 'Token not found' });
    }
  });
  
  // Get token history
  app.get('/api/tokens/:address/history', async (req, res) => {
    const { days = 30 } = req.query;
    const history = await indexer.getTokenHistory(req.params.address, days);
    res.json(history);
  });
  
  // Get recent trades
  app.get('/api/tokens/:address/trades', async (req, res) => {
    const { limit = 100 } = req.query;
    const trades = await indexer.getRecentTrades(req.params.address, limit);
    res.json(trades);
  });
  
  // Search tokens
  app.get('/api/search', async (req, res) => {
    const { q } = req.query;
    // Implementation would search by name/symbol
    res.json({ results: [] });
  });
  
  app.listen(3000, () => {
    console.log('REST API listening on port 3000');
  });
  
  return app;
}

// ============ 5. React Hook Example ============
const reactHookExample = `
import { useEffect, useState } from 'react';

function useTokenEvents(tokenAddress) {
  const [price, setPrice] = useState(null);
  const [trades, setTrades] = useState([]);
  const [ws, setWs] = useState(null);
  
  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:8080');
    
    websocket.onopen = () => {
      // Subscribe to token events
      websocket.send(JSON.stringify({
        type: 'subscribe',
        channels: [\`token:\${tokenAddress}\`, 'trades']
      }));
      
      // Get initial price
      websocket.send(JSON.stringify({
        type: 'get_price',
        token: tokenAddress
      }));
    };
    
    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'price_response' && message.token === tokenAddress) {
        setPrice(message.price);
      } else if (message.type === 'token_traded' && message.data.token === tokenAddress) {
        setTrades(prev => [message.data, ...prev].slice(0, 50));
        setPrice(message.data.newPrice);
      }
    };
    
    setWs(websocket);
    
    return () => {
      websocket.close();
    };
  }, [tokenAddress]);
  
  return { price, trades, ws };
}

// Usage in component
function TokenChart({ tokenAddress }) {
  const { price, trades } = useTokenEvents(tokenAddress);
  
  return (
    <div>
      <h2>Current Price: {price || 'Loading...'}</h2>
      <div>
        {trades.map((trade, i) => (
          <div key={i}>
            {trade.isBuy ? '🟢' : '🔴'} {trade.ethAmount} ETH @ {trade.newPrice}
          </div>
        ))}
      </div>
    </div>
  );
}
`;

// ============ 6. GraphQL Schema Example ============
const graphqlSchema = `
type Token {
  address: String!
  name: String!
  symbol: String!
  creator: String!
  createdAt: DateTime!
  graduated: Boolean!
  uniswapPool: String
  price: Float
  priceChange24h: Float
  volume24h: Float
  marketCap: Float
  trades24h: Int
  holders: Int
}

type Trade {
  id: ID!
  token: Token!
  trader: String!
  isBuy: Boolean!
  ethAmount: Float!
  tokenAmount: Float!
  price: Float!
  timestamp: DateTime!
  txHash: String!
}

type Query {
  # Get top tokens
  topTokens(limit: Int = 100, orderBy: String = "market_cap"): [Token!]!
  
  # Get specific token
  token(address: String!): Token
  
  # Get token trades
  trades(token: String!, limit: Int = 100): [Trade!]!
  
  # Search tokens
  searchTokens(query: String!): [Token!]!
}

type Subscription {
  # Subscribe to new tokens
  tokenCreated: Token!
  
  # Subscribe to trades
  tokenTraded(token: String): Trade!
  
  # Subscribe to graduations
  tokenGraduated: Token!
  
  # Subscribe to price updates
  priceUpdate(token: String!): PriceUpdate!
}

type PriceUpdate {
  token: String!
  price: Float!
  marketCap: Float!
  timestamp: DateTime!
}
`;

// ============ Main Execution ============
async function main() {
  try {
    // Start services
    console.log('🚀 Starting Launchpad Event System...\n');
    
    // 1. Start indexer
    console.log('📊 Starting Event Indexer...');
    const indexer = await startIndexer();
    
    // 2. Start WebSocket listener
    console.log('🌐 Starting WebSocket Event Listener...');
    const listener = await startEventListener();
    
    // 3. Start REST API
    console.log('🔌 Starting REST API...');
    const api = createRestAPI(indexer);
    
    // 4. Connect test client
    console.log('📱 Connecting test client...');
    const client = connectAsClient();
    
    console.log('\n✅ Event system fully operational!');
    console.log('📍 WebSocket: ws://localhost:8080');
    console.log('📍 REST API: http://localhost:3000');
    console.log('\nPress Ctrl+C to stop...');
    
    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...');
      await indexer.stop();
      await listener.stop();
      client.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error starting event system:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  startIndexer,
  startEventListener,
  connectAsClient,
  createRestAPI
};