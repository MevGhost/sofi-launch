// Debug script to check tokens
const fetch = require('node-fetch');

async function checkTokens() {
  try {
    // Check API endpoint
    const response = await fetch('http://localhost:5001/api/tokens?limit=50&offset=0&sortBy=marketCap');
    const data = await response.json();
    
    console.log('API Response:', JSON.stringify(data, null, 2));
    console.log('Total tokens:', data.data.total);
    console.log('Token count:', data.data.tokens.length);
    
    // List each token
    data.data.tokens.forEach((token, index) => {
      console.log(`\nToken ${index + 1}:`);
      console.log('  Address:', token.address);
      console.log('  Name:', token.name);
      console.log('  Symbol:', token.symbol);
      console.log('  Market Cap:', token.marketCap);
      console.log('  Holders:', token.holders);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTokens();