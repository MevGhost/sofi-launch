const { ethers } = require('ethers');
const abi = require('./src/contracts/abis/UltraSecureBondingCurve.json');

async function debugContract() {
  const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
  const contractAddress = '0xbf8759fb6b543a518cd16cdc627269e17317b65e';
  
  try {
    // Check if contract exists
    const code = await provider.getCode(contractAddress);
    console.log('Contract code exists:', code !== '0x');
    
    // Create contract instance
    const contract = new ethers.Contract(contractAddress, abi, provider);
    
    // Try to read some view functions
    console.log('\nChecking contract state...');
    
    // Try to get creation fee
    try {
      const fee = await contract.creationFee();
      console.log('Creation fee:', ethers.formatEther(fee), 'ETH');
    } catch (e) {
      console.log('Error reading creation fee:', e.message);
    }
    
    // Try to get token count
    try {
      const tokens = await contract.getAllTokens();
      console.log('Total tokens created:', tokens.length);
    } catch (e) {
      console.log('Error reading tokens:', e.message);
    }
    
    // Try to check owner
    try {
      const owner = await contract.owner();
      console.log('Contract owner:', owner);
    } catch (e) {
      console.log('Error reading owner:', e.message);
    }
    
    // Encode the function call to see what's being sent
    const iface = new ethers.Interface(abi);
    const encoded = iface.encodeFunctionData('createToken', [
      'thisisunclebaoawesome',
      'UNCLE',
      'Token for Uncle Bao',
      'https://example.com/image.png',
      '',
      '',
      '',
      '', // 8th parameter (empty category)
      ethers.parseEther('0.01') // dev buy amount
    ]);
    
    console.log('\nEncoded function call:');
    console.log('Selector:', encoded.slice(0, 10));
    console.log('Full data length:', encoded.length);
    
    // Try to simulate the call
    console.log('\nSimulating createToken call...');
    const wallet = new ethers.Wallet('0x' + '0'.repeat(64), provider); // dummy wallet
    const contractWithSigner = contract.connect(wallet);
    
    try {
      const estimatedGas = await contractWithSigner.createToken.estimateGas(
        'thisisunclebaoawesome',
        'UNCLE',
        'Token for Uncle Bao',
        'https://example.com/image.png',
        '',
        '',
        '',
        '',
        ethers.parseEther('0.01'),
        { value: ethers.parseEther('0.011') }
      );
      console.log('Estimated gas:', estimatedGas.toString());
    } catch (e) {
      console.log('Simulation error:', e.message);
      if (e.data) {
        console.log('Error data:', e.data);
      }
      if (e.reason) {
        console.log('Error reason:', e.reason);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugContract();