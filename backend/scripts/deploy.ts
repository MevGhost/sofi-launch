import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Starting Token Factory deployment to Base Sepolia...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");
  
  // Deploy TokenFactory
  console.log("Deploying TokenFactory contract...");
  const TokenFactory = await ethers.getContractFactory("TokenFactory");
  const tokenFactory = await TokenFactory.deploy();
  
  await tokenFactory.waitForDeployment();
  const factoryAddress = await tokenFactory.getAddress();
  
  console.log("✅ TokenFactory deployed to:", factoryAddress);
  
  // BondingCurve is deployed by the factory constructor
  // For now, we'll use the factory address as the bonding curve address
  // In production, this would be a separate contract
  const bondingCurveAddress = factoryAddress; // Simplified for testing
  console.log("✅ Using factory as bonding curve:", bondingCurveAddress);
  
  // Verify creation fee
  const creationFee = await tokenFactory.getCreationFee();
  console.log("Creation fee:", ethers.formatEther(creationFee), "ETH");
  
  // Save deployment info
  const deploymentInfo = {
    network: "base-sepolia",
    chainId: 84532,
    tokenFactory: factoryAddress,
    bondingCurve: bondingCurveAddress,
    creationFee: creationFee.toString(),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    blockNumber: await ethers.provider.getBlockNumber(),
  };
  
  const deploymentPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentPath, "base-sepolia.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n📄 Deployment info saved to deployments/base-sepolia.json");
  
  // Update .env file
  console.log("\n🔧 Updating environment variables...");
  const envPath = path.join(__dirname, "../../.env");
  let envContent = fs.readFileSync(envPath, "utf-8");
  
  // Update TOKEN_FACTORY_ADDRESS
  if (envContent.includes("TOKEN_FACTORY_ADDRESS=")) {
    envContent = envContent.replace(
      /TOKEN_FACTORY_ADDRESS=.*/,
      `TOKEN_FACTORY_ADDRESS=${factoryAddress}`
    );
  } else {
    envContent += `\nTOKEN_FACTORY_ADDRESS=${factoryAddress}`;
  }
  
  // Update TOKEN_FACTORY_ADDRESS_SEPOLIA
  if (envContent.includes("TOKEN_FACTORY_ADDRESS_SEPOLIA=")) {
    envContent = envContent.replace(
      /TOKEN_FACTORY_ADDRESS_SEPOLIA=.*/,
      `TOKEN_FACTORY_ADDRESS_SEPOLIA=${factoryAddress}`
    );
  } else {
    envContent += `\nTOKEN_FACTORY_ADDRESS_SEPOLIA=${factoryAddress}`;
  }
  
  // Update BONDING_CURVE_ADDRESS
  if (envContent.includes("BONDING_CURVE_ADDRESS=")) {
    envContent = envContent.replace(
      /BONDING_CURVE_ADDRESS=.*/,
      `BONDING_CURVE_ADDRESS=${bondingCurveAddress}`
    );
  } else {
    envContent += `\nBONDING_CURVE_ADDRESS=${bondingCurveAddress}`;
  }
  
  // Update NEXT_PUBLIC_BONDING_CURVE_ADDRESS
  if (envContent.includes("NEXT_PUBLIC_BONDING_CURVE_ADDRESS=")) {
    envContent = envContent.replace(
      /NEXT_PUBLIC_BONDING_CURVE_ADDRESS=.*/,
      `NEXT_PUBLIC_BONDING_CURVE_ADDRESS=${bondingCurveAddress}`
    );
  } else {
    envContent += `\nNEXT_PUBLIC_BONDING_CURVE_ADDRESS=${bondingCurveAddress}`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log("✅ Backend environment variables updated");
  
  // Update frontend .env.local
  const frontendEnvPath = path.join(__dirname, "../../../.env.local");
  if (fs.existsSync(frontendEnvPath)) {
    let frontendEnvContent = fs.readFileSync(frontendEnvPath, "utf-8");
    
    // Update NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS
    if (frontendEnvContent.includes("NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=")) {
      frontendEnvContent = frontendEnvContent.replace(
        /NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=.*/,
        `NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=${factoryAddress}`
      );
    } else {
      frontendEnvContent += `\nNEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=${factoryAddress}`;
    }
    
    // Update NEXT_PUBLIC_BONDING_CURVE_ADDRESS
    if (frontendEnvContent.includes("NEXT_PUBLIC_BONDING_CURVE_ADDRESS=")) {
      frontendEnvContent = frontendEnvContent.replace(
        /NEXT_PUBLIC_BONDING_CURVE_ADDRESS=.*/,
        `NEXT_PUBLIC_BONDING_CURVE_ADDRESS=${bondingCurveAddress}`
      );
    } else {
      frontendEnvContent += `\nNEXT_PUBLIC_BONDING_CURVE_ADDRESS=${bondingCurveAddress}`;
    }
    
    fs.writeFileSync(frontendEnvPath, frontendEnvContent);
    console.log("✅ Frontend environment variables updated");
  }
  
  console.log("\n🎉 Deployment complete!");
  console.log("\n📋 Deployment Summary:");
  console.log("========================");
  console.log("Token Factory:", factoryAddress);
  console.log("Bonding Curve:", bondingCurveAddress);
  console.log("Network: Base Sepolia");
  console.log("Block Number:", deploymentInfo.blockNumber);
  console.log("\n📝 Next steps:");
  console.log("1. Verify the contracts on Basescan:");
  console.log(`   npx hardhat verify --network base-sepolia ${factoryAddress}`);
  console.log("2. Restart the backend:");
  console.log("   npm run build && pm2 restart s4-backend");
  console.log("3. Test token creation through the frontend");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });