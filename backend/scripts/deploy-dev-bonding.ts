import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  console.log('🚀 Deploying DevBondingCurve Contract (No Limits Edition)...\n');

  // Configuration
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

  if (!PRIVATE_KEY) {
    throw new Error('Please set PRIVATE_KEY in .env file');
  }

  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const deployer = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log('📍 Network:', await provider.getNetwork().then(n => n.name));
  console.log('👤 Deployer:', deployer.address);
  
  const balance = await provider.getBalance(deployer.address);
  console.log('💰 Balance:', ethers.formatEther(balance), 'ETH\n');

  // Compile contract first
  console.log('📦 Compiling contract...');
  const { execSync } = require('child_process');
  execSync('npx hardhat compile', { stdio: 'inherit' });

  // Read compiled contract
  const contractPath = path.join(__dirname, '../artifacts/contracts/DevBondingCurve.sol/DevBondingCurve.json');
  const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const abi = contractJson.abi;
  const bytecode = contractJson.bytecode;

  // Deploy contract
  console.log('\n🔨 Deploying DevBondingCurve...');
  const contractFactory = new ethers.ContractFactory(abi, bytecode, deployer);
  const contract = await contractFactory.deploy();
  
  console.log('📝 Transaction Hash:', contract.deploymentTransaction()?.hash);
  console.log('⏳ Waiting for confirmation...');
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log('✅ DevBondingCurve deployed to:', contractAddress);

  // Save deployment info
  const deploymentInfo = {
    network: 'base-sepolia',
    contractAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    transactionHash: contract.deploymentTransaction()?.hash,
    features: {
      noTokenLimits: true,
      noCooldown: true,
      noBlacklist: true,
      noMinMaxTrades: true,
      noAntiMEV: true,
      noPausable: true,
      devFriendly: true
    }
  };

  const deploymentsPath = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsPath)) {
    fs.mkdirSync(deploymentsPath);
  }

  fs.writeFileSync(
    path.join(deploymentsPath, 'dev-bonding-curve.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Save ABI for frontend
  const abiPath = path.join(__dirname, '../abis');
  if (!fs.existsSync(abiPath)) {
    fs.mkdirSync(abiPath);
  }

  fs.writeFileSync(
    path.join(abiPath, 'DevBondingCurve.json'),
    JSON.stringify(abi, null, 2)
  );

  console.log('\n📄 Deployment info saved to deployments/dev-bonding-curve.json');
  console.log('📄 ABI saved to abis/DevBondingCurve.json');

  // Verify basic functionality
  console.log('\n🔍 Verifying contract...');
  const deployedContract = new ethers.Contract(contractAddress, abi, deployer);
  
  const tokenCount = await deployedContract.getTokenCount();
  console.log('📊 Current token count:', tokenCount.toString());
  
  const platformFees = await deployedContract.totalPlatformFees();
  console.log('💵 Platform fees collected:', ethers.formatEther(platformFees), 'ETH');

  console.log('\n🎉 Deployment successful!');
  console.log('\n📝 Next steps:');
  console.log('1. Update NEXT_PUBLIC_DEV_BONDING_FACTORY_ADDRESS in .env to:', contractAddress);
  console.log('2. Update frontend hooks to use DevBondingCurve ABI');
  console.log('3. Restart the frontend to use the new contract');
  console.log('\nNo more token limits! Happy testing! 🚀');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });