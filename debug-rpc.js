const fetch = require('node-fetch');

async function debugRPC() {
  const rpcUrl = 'https://sepolia.base.org';
  const contractAddress = '0xbf8759fb6b543a518cd16cdc627269e17317b65e';
  
  // Check if contract exists
  const codeReq = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getCode',
      params: [contractAddress, 'latest'],
      id: 1
    })
  });
  const codeRes = await codeReq.json();
  console.log('Contract exists:', codeRes.result !== '0x');
  
  // Get latest block
  const blockReq = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 2
    })
  });
  const blockRes = await blockReq.json();
  console.log('Latest block:', parseInt(blockRes.result, 16));
  
  // Try to simulate the failed transaction
  const callData = '0xea1ee599' + 
    '0000000000000000000000000000000000000000000000000000000000000120' + // offset for name
    '0000000000000000000000000000000000000000000000000000000000000160' + // offset for symbol
    '00000000000000000000000000000000000000000000000000000000000001a0' + // offset for description
    '00000000000000000000000000000000000000000000000000000000000001e0' + // offset for imageUrl
    '0000000000000000000000000000000000000000000000000000000000000220' + // offset for twitter
    '0000000000000000000000000000000000000000000000000000000000000240' + // offset for telegram
    '0000000000000000000000000000000000000000000000000000000000000260' + // offset for website
    '0000000000000000000000000000000000000000000000000000000000000280' + // offset for category (empty)
    '000000000000000000000000000000000000000000000000002386f26fc10000'; // devBuyAmount (0.01 ETH)
    
  console.log('\nTrying eth_call to diagnose issue...');
  const callReq = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: contractAddress,
        data: callData,
        value: '0x2710958587a000' // 0.011 ETH in hex
      }, 'latest'],
      id: 3
    })
  });
  const callRes = await callReq.json();
  
  if (callRes.error) {
    console.log('RPC Error:', callRes.error);
  } else if (callRes.result === '0x') {
    console.log('Call reverted with no error message');
  } else {
    console.log('Call result:', callRes.result);
  }
  
  // Try to read creationFee
  const feeCallData = '0xb2e0a0f5'; // creationFee() selector
  const feeReq = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: contractAddress,
        data: feeCallData
      }, 'latest'],
      id: 4
    })
  });
  const feeRes = await feeReq.json();
  
  if (feeRes.result && feeRes.result !== '0x') {
    const fee = BigInt(feeRes.result);
    console.log('\nCreation fee:', (fee / BigInt(10**18)).toString() + '.' + (fee % BigInt(10**18)).toString().padStart(18, '0').replace(/0+$/, ''), 'ETH');
  }
}

debugRPC().catch(console.error);