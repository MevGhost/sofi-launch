export const DEV_BONDING_CURVE_V2_ABI = [
  // Custom Errors
  {
    "type": "error",
    "name": "InsufficientLiquidityMinted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientETHReserve",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientTokenReserve",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidToken",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientBalance",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SlippageExceeded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientOutputAmount",
    "inputs": []
  },
  // Buy function
  {
    "inputs": [
      {"internalType": "address", "name": "_token", "type": "address"},
      {"internalType": "uint256", "name": "_minTokensOut", "type": "uint256"}
    ],
    "name": "buyTokens",
    "outputs": [{"internalType": "uint256", "name": "tokensOut", "type": "uint256"}],
    "stateMutability": "payable",
    "type": "function"
  },
  // Sell function
  {
    "inputs": [
      {"internalType": "address", "name": "_token", "type": "address"},
      {"internalType": "uint256", "name": "_tokenAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "_minEthOut", "type": "uint256"}
    ],
    "name": "sellTokens",
    "outputs": [{"internalType": "uint256", "name": "ethOut", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Calculate buy return
  {
    "inputs": [
      {"internalType": "address", "name": "_token", "type": "address"},
      {"internalType": "uint256", "name": "_ethAmount", "type": "uint256"}
    ],
    "name": "calculateBuyReturn",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Calculate sell return
  {
    "inputs": [
      {"internalType": "address", "name": "_token", "type": "address"},
      {"internalType": "uint256", "name": "_tokenAmount", "type": "uint256"}
    ],
    "name": "calculateSellReturn",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Get token price
  {
    "inputs": [
      {"internalType": "address", "name": "_token", "type": "address"}
    ],
    "name": "getTokenPrice",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Calculate market cap
  {
    "inputs": [
      {"internalType": "address", "name": "_token", "type": "address"}
    ],
    "name": "calculateMarketCap",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Bonding progress
  {
    "inputs": [
      {"internalType": "address", "name": "_token", "type": "address"}
    ],
    "name": "bondingProgress",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Token info
  {
    "inputs": [
      {"internalType": "address", "name": "", "type": "address"}
    ],
    "name": "tokenInfo",
    "outputs": [
      {"internalType": "address", "name": "tokenAddress", "type": "address"},
      {"internalType": "address", "name": "creator", "type": "address"},
      {"internalType": "uint256", "name": "realEthReserve", "type": "uint256"},
      {"internalType": "uint256", "name": "realTokenReserve", "type": "uint256"},
      {"internalType": "uint256", "name": "k", "type": "uint256"},
      {"internalType": "uint256", "name": "lastPrice", "type": "uint256"},
      {"internalType": "uint256", "name": "lastMcapInEth", "type": "uint256"},
      {"internalType": "uint256", "name": "lastLiquidityInEth", "type": "uint256"},
      {"internalType": "uint256", "name": "lastActivity", "type": "uint256"},
      {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
      {"internalType": "uint256", "name": "tokensSold", "type": "uint256"},
      {"internalType": "bool", "name": "isGraduated", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Is valid token
  {
    "inputs": [
      {"internalType": "address", "name": "_token", "type": "address"}
    ],
    "name": "isValidToken",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Create token
  {
    "inputs": [
      {"internalType": "string", "name": "_name", "type": "string"},
      {"internalType": "string", "name": "_symbol", "type": "string"},
      {"internalType": "string", "name": "_imageUrl", "type": "string"},
      {"internalType": "string", "name": "_description", "type": "string"},
      {"internalType": "string", "name": "_twitter", "type": "string"},
      {"internalType": "string", "name": "_telegram", "type": "string"},
      {"internalType": "string", "name": "_website", "type": "string"}
    ],
    "name": "createToken",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "payable",
    "type": "function"
  },
  // Get all tokens
  {
    "inputs": [],
    "name": "getAllTokens",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "token", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "name", "type": "string"},
      {"indexed": false, "internalType": "string", "name": "symbol", "type": "string"},
      {"indexed": true, "internalType": "address", "name": "creator", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "TokenCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "token", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "buyer", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "ethIn", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "tokensOut", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "newPrice", "type": "uint256"}
    ],
    "name": "TokensPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "token", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "seller", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "tokensIn", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "ethOut", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "newPrice", "type": "uint256"}
    ],
    "name": "TokensSold",
    "type": "event"
  }
] as const;