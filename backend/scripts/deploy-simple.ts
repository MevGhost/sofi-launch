import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Starting SimpleTokenFactory deployment to Base Sepolia...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");
  
  // Deploy SimpleTokenFactory
  console.log("Deploying SimpleTokenFactory contract...");
  const SimpleTokenFactory = await ethers.getContractFactory("SimpleTokenFactory");
  const tokenFactory = await SimpleTokenFactory.deploy();
  
  await tokenFactory.waitForDeployment();
  const factoryAddress = await tokenFactory.getAddress();
  
  console.log("✅ SimpleTokenFactory deployed to:", factoryAddress);
  
  // Verify creation fee
  const creationFee = await tokenFactory.getCreationFee();
  console.log("Creation fee:", ethers.formatEther(creationFee), "ETH");
  
  // Save deployment info
  const deploymentInfo = {
    network: "base-sepolia",
    chainId: 84532,
    simpleTokenFactory: factoryAddress,
    creationFee: creationFee.toString(),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    blockNumber: await ethers.provider.getBlockNumber(),
  };
  
  const deploymentPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(deploymentPath, "simple-factory.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n📝 Deployment info saved to deployments/simple-factory.json");
  console.log("\n✅ Deployment complete!");
  console.log("\nNext steps:");
  console.log("1. Update frontend to use new factory address:", factoryAddress);
  console.log("2. Test token creation through the UI");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });