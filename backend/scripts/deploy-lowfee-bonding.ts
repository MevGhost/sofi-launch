import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Starting LowFeeBondingCurveFactory deployment to Base Sepolia...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");
  
  // Deploy LowFeeBondingCurveFactory
  console.log("Deploying LowFeeBondingCurveFactory...");
  console.log("Features:");
  console.log("  ✅ Ultra-low creation fee: 0.001 ETH");
  console.log("  ✅ Full bonding curve functionality");
  console.log("  ✅ Constant product AMM (x*y=k)");
  console.log("  ✅ Auto graduation at $69k market cap");
  console.log("  ✅ 1% platform + 1% creator fees on trades");
  console.log("");
  
  const LowFeeBondingCurveFactory = await ethers.getContractFactory("LowFeeBondingCurveFactory");
  const factory = await LowFeeBondingCurveFactory.deploy();
  
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  
  console.log("✅ LowFeeBondingCurveFactory deployed to:", factoryAddress);
  
  // Save deployment info
  const deploymentInfo = {
    network: "base-sepolia",
    chainId: 84532,
    lowFeeBondingCurveFactory: factoryAddress,
    creationFee: "1000000000000000", // 0.001 ETH in wei
    creationFeeETH: "0.001",
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    blockNumber: await ethers.provider.getBlockNumber(),
    features: [
      "Ultra-low creation fee: 0.001 ETH (95% cheaper!)",
      "Full bonding curve with constant product AMM",
      "Virtual reserves: 1 ETH + 1M tokens",
      "800M tokens for bonding, 200M for DEX",
      "Auto graduation at $69k market cap",
      "1% platform fee + 1% creator fee on trades",
      "Buy and sell functionality",
      "Slippage protection",
      "Creator fee collection"
    ]
  };
  
  const deploymentPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(deploymentPath, "lowfee-bonding-factory.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n📝 Deployment info saved to deployments/lowfee-bonding-factory.json");
  console.log("\n🎉 Deployment complete!");
  console.log("\n💰 This contract gives you:");
  console.log("  • Low fees: Only 0.001 ETH to create");
  console.log("  • Full bonding curve trading");
  console.log("  • Price discovery mechanism");
  console.log("  • Automatic DEX graduation");
  console.log("  • Creator earnings from trades");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });