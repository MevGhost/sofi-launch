import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Starting UltraSecureBondingCurve deployment to Base Sepolia...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");
  
  console.log("✨ NEW Features:");
  console.log("  ✅ NO LOCK PERIOD - Immediate trading for everyone");
  console.log("  ✅ Dev Buy Option - Up to 1 ETH initial buy with 5% bonus");
  console.log("  ✅ Fixed Price Display - Correct USD pricing");
  console.log("  ✅ All security features maintained");
  console.log("");
  
  const UltraSecureBondingCurve = await ethers.getContractFactory("UltraSecureBondingCurve");
  const factory = await UltraSecureBondingCurve.deploy();
  
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  
  console.log("✅ UltraSecureBondingCurve deployed to:", factoryAddress);
  
  // Save deployment info
  const deploymentInfo = {
    network: "base-sepolia",
    chainId: 84532,
    ultraSecureBondingCurve: factoryAddress,
    creationFee: "1000000000000000", // 0.001 ETH
    creationFeeETH: "0.001",
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    blockNumber: await ethers.provider.getBlockNumber(),
    features: {
      devBuy: {
        maxAmount: "1 ETH",
        discount: "5% bonus tokens",
        optional: "Yes - can be 0"
      },
      trading: {
        noLockPeriod: "Immediate trading for all",
        minTrade: "0.0001 ETH",
        maxTrade: "10 ETH",
        slippage: "5% max"
      },
      antiSpam: {
        cooldown: "1 minute between creations",
        maxTokensPerUser: "3 initially",
        unlockCondition: "After 1 ETH platform revenue"
      },
      security: {
        mevProtection: "Same-block prevention",
        pausable: "Emergency pause",
        blacklist: "Ban malicious users",
        fees: "1% platform + 1% creator (adjustable)"
      }
    }
  };
  
  fs.writeFileSync(
    path.join(__dirname, "../deployments/ultra-secure-factory.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n📝 Deployment info saved");
  console.log("\n🎉 Deployment complete!");
  console.log("\n💡 Key Improvements:");
  console.log("  • NO LOCK - Anyone can trade immediately");
  console.log("  • Dev Buy - Optional initial purchase with bonus");
  console.log("  • Fixed pricing display");
  console.log("  • All security maintained");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });