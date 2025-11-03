import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🔒 Starting SecureLowFeeBondingCurve deployment to Base Sepolia...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");
  
  console.log("✨ IMPROVED Security Features:");
  console.log("  ✅ Anti-spam: Cooldown period & user limits");
  console.log("  ✅ MEV protection: Same-block trade prevention");
  console.log("  ✅ Safety limits: Min/max trade amounts");
  console.log("  ✅ Emergency pause: Owner can pause trading");
  console.log("  ✅ Blacklist system: Ban malicious actors");
  console.log("  ✅ Initial lock: 1-hour liquidity lock");
  console.log("  ✅ Fee claims: Creators can withdraw earnings");
  console.log("  ✅ Slippage protection: Max 5% slippage");
  console.log("");
  
  const SecureLowFeeBondingCurve = await ethers.getContractFactory("SecureLowFeeBondingCurve");
  const factory = await SecureLowFeeBondingCurve.deploy();
  
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  
  console.log("✅ SecureLowFeeBondingCurve deployed to:", factoryAddress);
  
  // Save deployment info
  const deploymentInfo = {
    network: "base-sepolia",
    chainId: 84532,
    secureLowFeeBondingCurve: factoryAddress,
    creationFee: "1000000000000000", // 0.001 ETH
    creationFeeETH: "0.001",
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    blockNumber: await ethers.provider.getBlockNumber(),
    securityFeatures: {
      antiSpam: {
        cooldownPeriod: "1 minute between token creations",
        maxTokensPerUser: "3 initially (unlocks after 1 ETH platform revenue)",
        minTradeAmount: "0.0001 ETH",
        maxTradeAmount: "10 ETH"
      },
      mevProtection: {
        sameBlockPrevention: "Yes",
        maxSlippage: "5%",
        lastTradeBlockTracking: "Yes"
      },
      safety: {
        pausable: "Yes - owner can pause",
        blacklist: "Yes - ban malicious users",
        liquidityLock: "1 hour initial lock",
        inputValidation: "Yes - name/symbol/description limits"
      },
      economic: {
        platformFee: "1% (adjustable, max 3%)",
        creatorFee: "1% (adjustable, max 3%)",
        creatorFeeClaims: "Yes - creators can withdraw",
        graduationThreshold: "$69k market cap"
      }
    },
    improvements: [
      "Prevents spam with cooldown and user limits",
      "MEV protection with same-block prevention",
      "Emergency pause for critical issues",
      "Blacklist system for bad actors",
      "1-hour initial liquidity lock",
      "Creator fee withdrawal function",
      "Trade size limits (0.0001 - 10 ETH)",
      "Maximum 5% slippage protection",
      "Volume and trade tracking",
      "Input validation for token metadata"
    ]
  };
  
  fs.writeFileSync(
    path.join(__dirname, "../deployments/secure-bonding-factory.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n📝 Deployment info saved");
  console.log("\n🎉 Deployment complete!");
  console.log("\n🛡️ Security Summary:");
  console.log("  • Spam Protection: ✅ 1-min cooldown, 3 token limit");
  console.log("  • MEV Protection: ✅ Same-block prevention");
  console.log("  • Safety Features: ✅ Pause, blacklist, locks");
  console.log("  • Economic Safety: ✅ Fee limits, slippage protection");
  console.log("\nThis contract maintains 0.001 ETH fee while adding enterprise-grade security!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });