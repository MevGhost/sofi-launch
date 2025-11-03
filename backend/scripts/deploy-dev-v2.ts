import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function deployDevBondingCurveV2() {
  console.log("🚀 Deploying DevBondingCurveV2 to Base Sepolia...\n");
  
  // Setup provider and signer
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://base-sepolia.g.alchemy.com/v2/XK8ZLRP2DVEi2di5M9Yz0';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Use private key from env or a test key
  let privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.log("⚠️  No PRIVATE_KEY in env, using test wallet");
    console.log("Please send some Base Sepolia ETH to this address to deploy:");
    privateKey = '0x' + '1'.repeat(64); // Generate deterministic test key
  }
  
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log("📝 Deployer address:", wallet.address);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Deployer balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.01")) {
    console.error("❌ Insufficient balance. Need at least 0.01 ETH on Base Sepolia");
    console.log("Get testnet ETH from: https://www.alchemy.com/faucets/base-sepolia");
    process.exit(1);
  }
  
  // Load compiled contract
  const contractPath = path.join(__dirname, "../artifacts/contracts/DevBondingCurveV2.sol/DevBondingCurveV2.json");
  if (!fs.existsSync(contractPath)) {
    console.error("❌ Contract artifact not found. Run 'npx hardhat compile' first");
    process.exit(1);
  }
  
  const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const abi = contractJson.abi;
  const bytecode = contractJson.bytecode;
  
  console.log("\n📋 Contract details:");
  console.log("- Name: DevBondingCurveV2");
  console.log("- Compiler:", contractJson.compiler);
  
  // Deploy factory
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  
  console.log("\n🔨 Deploying contract...");
  const contract = await factory.deploy();
  console.log("📝 Transaction hash:", contract.deploymentTransaction()?.hash);
  
  console.log("⏳ Waiting for confirmation...");
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log("\n✅ DevBondingCurveV2 deployed successfully!");
  console.log("📍 Contract address:", contractAddress);
  console.log("🔍 View on Basescan: https://sepolia.basescan.org/address/" + contractAddress);
  
  // Save deployment info
  const deploymentInfo = {
    network: "base-sepolia",
    chainId: 84532,
    contractName: "DevBondingCurveV2",
    contractAddress: contractAddress,
    deployer: wallet.address,
    deploymentDate: new Date().toISOString(),
    transactionHash: contract.deploymentTransaction()?.hash,
    compiler: contractJson.compiler,
    optimizer: {
      enabled: true,
      runs: 200
    }
  };
  
  const deploymentPath = path.join(__dirname, "../deployments/dev-bonding-curve-v2.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info saved to:", deploymentPath);
  
  // Verify initial state
  console.log("\n🔍 Verifying contract state...");
  const deployedContract = new ethers.Contract(contractAddress, abi, provider);
  
  const platformFee = await deployedContract.platformFeeBps();
  const creatorFee = await deployedContract.creatorFeeBps();
  const owner = await deployedContract.owner();
  
  console.log("- Platform fee:", platformFee.toString(), "bps (", Number(platformFee) / 100, "%)");
  console.log("- Creator fee:", creatorFee.toString(), "bps (", Number(creatorFee) / 100, "%)");
  console.log("- Owner:", owner);
  
  console.log("\n🎉 Deployment complete!");
  console.log("\n📝 Next steps:");
  console.log("1. Update .env with: NEXT_PUBLIC_DEV_BONDING_FACTORY_ADDRESS=" + contractAddress);
  console.log("2. Update frontend contract addresses");
  console.log("3. Test token creation with the new contract");
  
  return contractAddress;
}

// Run deployment
deployDevBondingCurveV2()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });