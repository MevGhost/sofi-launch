const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:4000');

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully');
  
  // Send a test message
  ws.send(JSON.stringify({
    event: 'ping',
    payload: { timestamp: Date.now() }
  }));
  
  // Close after 2 seconds
  setTimeout(() => {
    ws.close();
  }, 2000);
});

ws.on('message', (data) => {
  console.log('📨 Received:', data.toString());
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('👋 WebSocket closed');
  process.exit(0);
});