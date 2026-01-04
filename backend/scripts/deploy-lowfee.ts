import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Starting LowFeeTokenFactory deployment to Base Sepolia...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");
  
  // Deploy LowFeeTokenFactory
  console.log("Deploying LowFeeTokenFactory contract...");
  console.log("Creation fee: 0.001 ETH (vs 0.02 ETH for other factories)");
  
  const LowFeeTokenFactory = await ethers.getContractFactory("LowFeeTokenFactory");
  const tokenFactory = await LowFeeTokenFactory.deploy();
  
  await tokenFactory.waitForDeployment();
  const factoryAddress = await tokenFactory.getAddress();
  
  console.log("✅ LowFeeTokenFactory deployed to:", factoryAddress);
  
  // Verify creation fee
  const creationFee = await tokenFactory.getCreationFee();
  console.log("Creation fee verified:", ethers.formatEther(creationFee), "ETH");
  
  // Save deployment info
  const deploymentInfo = {
    network: "base-sepolia",
    chainId: 84532,
    lowFeeTokenFactory: factoryAddress,
    creationFee: creationFee.toString(),
    creationFeeETH: "0.001",
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    blockNumber: await ethers.provider.getBlockNumber(),
    features: [
      "Ultra-low creation fee: 0.001 ETH (20x cheaper!)",
      "Simple ERC20 tokens",
      "1 billion token supply",
      "Direct minting to creator",
      "No bonding curve complexity",
      "Minimal gas costs"
    ]
  };
  
  const deploymentPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(deploymentPath, "lowfee-factory.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n📝 Deployment info saved to deployments/lowfee-factory.json");
  console.log("\n✅ Deployment complete!");
  console.log("\n💰 Cost comparison:");
  console.log("  - LowFeeTokenFactory: 0.001 ETH");
  console.log("  - SimpleTokenFactory: 0.02 ETH");
  console.log("  - IntegratedFactory:  0.02 ETH");
  console.log("\nYou save 0.019 ETH (95% cheaper!) per token creation!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });