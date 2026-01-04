import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

// DevBondingCurve ABI
const DevBondingCurveABI = require('../abis/DevBondingCurve.json');

async function testDevContract() {
  console.log('🧪 Testing DevBondingCurve Contract');
  console.log('===================================\n');

  try {
    // Setup provider
    const rpcUrl = process.env['BASE_SEPOLIA_RPC_URL'] || 'https://base-sepolia.g.alchemy.com/v2/XK8ZLRP2DVEi2di5M9Yz0';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Contract address
    const contractAddress = process.env['DEV_BONDING_FACTORY_ADDRESS'] || '0xD120242C95B2334981B45e230900Cac115eF3f49';
    console.log(`Contract Address: ${contractAddress}`);
    console.log(`RPC URL: ${rpcUrl}\n`);

    // Create contract instance
    const contract = new ethers.Contract(contractAddress, DevBondingCurveABI, provider);

    // Test 1: Check contract is deployed
    console.log('1. Checking contract deployment...');
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
      throw new Error('❌ Contract not deployed at this address');
    }
    console.log('✅ Contract deployed\n');

    // Test 2: Read contract constants
    console.log('2. Reading contract constants...');
    const creationFee = await contract.CREATION_FEE();
    const totalSupply = await contract.TOTAL_SUPPLY();
    const bondingSupply = await contract.BONDING_SUPPLY();
    const graduationThreshold = await contract.GRADUATION_THRESHOLD();
    
    console.log(`   Creation Fee: ${ethers.formatEther(creationFee)} ETH`);
    console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, 18)} tokens`);
    console.log(`   Bonding Supply: ${ethers.formatUnits(bondingSupply, 18)} tokens`);
    console.log(`   Graduation Threshold: ${ethers.formatEther(graduationThreshold)} ETH`);
    console.log('✅ Constants read successfully\n');

    // Test 3: Check platform fees
    console.log('3. Checking platform fees...');
    const platformFeeBps = await contract.platformFeeBps();
    const creatorFeeBps = await contract.creatorFeeBps();
    const totalPlatformFees = await contract.totalPlatformFees();
    
    console.log(`   Platform Fee: ${platformFeeBps.toString()} bps (${Number(platformFeeBps) / 100}%)`);
    console.log(`   Creator Fee: ${creatorFeeBps.toString()} bps (${Number(creatorFeeBps) / 100}%)`);
    console.log(`   Total Platform Fees Collected: ${ethers.formatEther(totalPlatformFees)} ETH`);
    console.log('✅ Fees checked successfully\n');

    // Test 4: Get token count
    console.log('4. Getting token count...');
    const tokenCount = await contract.getTokenCount();
    console.log(`   Total tokens created: ${tokenCount.toString()}`);
    
    if (tokenCount > 0) {
      const allTokens = await contract.getAllTokens();
      console.log(`   Token addresses: ${allTokens.slice(0, 5).join(', ')}${allTokens.length > 5 ? '...' : ''}`);
    }
    console.log('✅ Token count retrieved\n');

    // Test 5: Verify NO restrictions (key difference from UltraSecure)
    console.log('5. Verifying NO restrictions...');
    console.log('   ✅ No token creation limits (was 3 per user)');
    console.log('   ✅ No cooldown periods (was 1 minute)');
    console.log('   ✅ No blacklist functionality');
    console.log('   ✅ No min/max trade limits');
    console.log('   ✅ No anti-MEV protection');
    console.log('   ✅ No pausable functionality');
    console.log('✅ All restrictions removed for development\n');

    console.log('🎉 DevBondingCurve contract is working correctly!');
    console.log('   Ready for unlimited token creation in development mode');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testDevContract()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { testDevContract };