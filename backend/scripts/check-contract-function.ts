import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const DevBondingCurveABI = require('../abis/DevBondingCurve.json');

async function checkContract() {
  const provider = new ethers.JsonRpcProvider(
    process.env['BASE_SEPOLIA_RPC_URL'] || 'https://base-sepolia.g.alchemy.com/v2/XK8ZLRP2DVEi2di5M9Yz0'
  );
  
  const contractAddress = '0xD120242C95B2334981B45e230900Cac115eF3f49';
  const contract = new ethers.Contract(contractAddress, DevBondingCurveABI, provider);
  
  console.log('Checking DevBondingCurve contract...\n');
  
  // Check if contract exists
  const code = await provider.getCode(contractAddress);
  console.log('Contract deployed:', code !== '0x');
  
  // Get creation fee
  const creationFee = await contract.CREATION_FEE();
  console.log('Creation fee:', ethers.formatEther(creationFee), 'ETH');
  
  // Check the createToken function encoding
  const iface = new ethers.Interface(DevBondingCurveABI);
  
  // Test encoding the function call
  try {
    const encoded = iface.encodeFunctionData('createToken', [
      'Test Token',
      'TEST',
      'Test description',
      'https://example.com/image.png',
      '',
      '',
      '',
      '', // category (unused)
      ethers.parseEther('0.05') // dev buy amount
    ]);
    
    console.log('\nFunction encoding successful!');
    console.log('Encoded data (first 10 bytes):', encoded.slice(0, 10));
    console.log('Full selector:', encoded.slice(0, 10));
    
    // Check if the function selector matches
    const expectedSelector = iface.getFunction('createToken')?.selector;
    console.log('Expected selector:', expectedSelector);
    
    // Simulate the call
    console.log('\nSimulating createToken call...');
    const totalValue = ethers.parseEther('0.051'); // 0.001 creation + 0.05 dev buy
    
    try {
      const result = await provider.call({
        to: contractAddress,
        data: encoded,
        value: totalValue.toString(),
        from: '0x33742D3feEDe42eEb82E65a0155Bd46b693A69f5' // Your wallet address
      });
      console.log('Simulation result:', result);
    } catch (simError: any) {
      console.log('Simulation failed (this is expected if you haven\'t deployed tokens before)');
      console.log('Error:', simError.message);
      
      // Try to decode the error
      if (simError.data) {
        try {
          const decodedError = iface.parseError(simError.data);
          console.log('Decoded error:', decodedError);
        } catch {
          console.log('Raw error data:', simError.data);
        }
      }
    }
    
  } catch (error: any) {
    console.error('Error encoding function:', error.message);
  }
  
  // Check if there's an issue with the function signature
  console.log('\nAvailable functions:');
  const functions = iface.fragments.filter(f => f.type === 'function');
  for (const func of functions) {
    if (func.name === 'createToken') {
      console.log(`- ${func.name}: ${func.format('minimal')}`);
      console.log('  Inputs:', func.inputs.map(i => `${i.name}:${i.type}`).join(', '));
    }
  }
}

checkContract().catch(console.error);