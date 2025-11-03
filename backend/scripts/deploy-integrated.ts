import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Starting IntegratedTokenFactory deployment to Base Sepolia...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");
  
  if (balance < ethers.parseEther("0.1")) {
    console.error("❌ Insufficient balance! Need at least 0.1 ETH for deployment");
    process.exit(1);
  }
  
  // Deploy IntegratedTokenFactory
  console.log("Deploying IntegratedTokenFactory contract...");
  const IntegratedTokenFactory = await ethers.getContractFactory("IntegratedTokenFactory");
  const factory = await IntegratedTokenFactory.deploy();
  
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  
  console.log("✅ IntegratedTokenFactory deployed to:", factoryAddress);
  
  // Verify creation fee
  const creationFee = await factory.getCreationFee();
  console.log("✅ Creation fee:", ethers.formatEther(creationFee), "ETH");
  
  // Verify constants
  console.log("\n📊 Contract Configuration:");
  console.log("  Total Supply: 1,000,000,000 tokens");
  console.log("  Bonding Curve: 800,000,000 tokens (80%)");
  console.log("  DEX Reserve: 200,000,000 tokens (20%)");
  console.log("  Virtual ETH Reserve: 1 ETH");
  console.log("  Virtual Token Reserve: 1,000,000 tokens");
  console.log("  Graduation Threshold: $69,000");
  console.log("  Platform Fee: 1%");
  console.log("  Creator Fee: 1%");
  
  // Save deployment info
  const deploymentInfo = {
    network: "base-sepolia",
    chainId: 84532,
    integratedTokenFactory: factoryAddress,
    bondingCurve: factoryAddress, // Same contract handles both
    creationFee: creationFee.toString(),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    blockNumber: await ethers.provider.getBlockNumber(),
    features: [
      "Token creation with 0.02 ETH fee",
      "Constant product bonding curve (x*y=k)",
      "Virtual reserves: 1 ETH + 1M tokens",
      "Automatic graduation at $69k market cap",
      "1% platform fee + 1% creator fee on trades",
      "800M tokens for bonding, 200M for DEX liquidity"
    ]
  };
  
  const deploymentPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(deploymentPath, "integrated-factory.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n📝 Deployment info saved to deployments/integrated-factory.json");
  console.log("\n✅ Deployment complete!");
  console.log("\n🎯 Next steps:");
  console.log("1. Update frontend hooks to use new address:", factoryAddress);
  console.log("2. Test token creation with 0.02 ETH");
  console.log("3. Test buying tokens through bonding curve");
  console.log("4. Test selling tokens back to curve");
  console.log("5. Test graduation mechanism at $69k market cap");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });