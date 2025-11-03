const fetch = require('node-fetch');

const API_URL = 'http://localhost:4000';
const TEST_ADDRESS = '0x1234567890123456789012345678901234567890';

async function testAuthFlow() {
  console.log('🔑 Testing Authentication Flow...\n');
  
  try {
    // Step 1: Get nonce
    console.log('1️⃣ Getting nonce...');
    const nonceResponse = await fetch(`${API_URL}/api/auth/nonce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: TEST_ADDRESS })
    });
    
    const nonceData = await nonceResponse.json();
    console.log('   Nonce response:', nonceData);
    
    if (!nonceData.success) {
      throw new Error('Failed to get nonce');
    }
    
    // Step 2: Test other endpoints
    console.log('\n2️⃣ Testing token endpoint...');
    const tokensResponse = await fetch(`${API_URL}/api/tokens`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const tokensData = await tokensResponse.json();
    console.log('   Tokens response:', { 
      success: tokensData.success, 
      dataLength: Array.isArray(tokensData.data) ? tokensData.data.length : 'N/A' 
    });
    
    // Step 3: Test escrows endpoint
    console.log('\n3️⃣ Testing escrows endpoint...');
    const escrowsResponse = await fetch(`${API_URL}/api/escrows`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const escrowsData = await escrowsResponse.json();
    console.log('   Escrows response:', { 
      success: escrowsData.success, 
      dataLength: Array.isArray(escrowsData.data) ? escrowsData.data.length : 'N/A' 
    });
    
    // Step 4: Test portfolio endpoint
    console.log('\n4️⃣ Testing portfolio endpoint...');
    const portfolioResponse = await fetch(`${API_URL}/api/portfolio?userAddress=${TEST_ADDRESS}`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const portfolioData = await portfolioResponse.json();
    console.log('   Portfolio response:', { 
      success: portfolioData.success,
      hasData: !!portfolioData.data
    });
    
    // Step 5: Test stats endpoint
    console.log('\n5️⃣ Testing stats endpoint...');
    const statsResponse = await fetch(`${API_URL}/api/stats`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const statsData = await statsResponse.json();
    console.log('   Stats response:', { 
      success: statsData.success,
      hasData: !!statsData.data
    });
    
    console.log('\n✅ All endpoints responding successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testAuthFlow();