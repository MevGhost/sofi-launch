const hre = require("hardhat");

async function main() {
  console.log("Deploying Base Launchpad contracts...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy ConstantProductCurve
  const ConstantProductCurve = await hre.ethers.getContractFactory("ConstantProductCurve");
  const bondingCurve = await ConstantProductCurve.deploy(deployer.address);
  await bondingCurve.waitForDeployment();
  console.log("ConstantProductCurve deployed to:", await bondingCurve.getAddress());

  // Deploy TokenFactory
  const TokenFactory = await hre.ethers.getContractFactory("TokenFactory");
  const tokenFactory = await TokenFactory.deploy();
  await tokenFactory.waitForDeployment();
  console.log("TokenFactory deployed to:", await tokenFactory.getAddress());

  // Deploy GraduationManager
  const GraduationManager = await hre.ethers.getContractFactory("GraduationManager");
  
  // Base mainnet addresses
  const UNISWAP_V3_FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";
  const POSITION_MANAGER = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
  const WETH = "0x4200000000000000000000000000000000000006";
  
  const graduationManager = await GraduationManager.deploy(
    UNISWAP_V3_FACTORY,
    POSITION_MANAGER,
    WETH
  );
  await graduationManager.waitForDeployment();
  console.log("GraduationManager deployed to:", await graduationManager.getAddress());

  // Deploy utility contracts
  const LiquidityLocker = await hre.ethers.getContractFactory("LiquidityLocker");
  const liquidityLocker = await LiquidityLocker.deploy();
  await liquidityLocker.waitForDeployment();
  console.log("LiquidityLocker deployed to:", await liquidityLocker.getAddress());

  const TokenVesting = await hre.ethers.getContractFactory("TokenVesting");
  const tokenVesting = await TokenVesting.deploy();
  await tokenVesting.waitForDeployment();
  console.log("TokenVesting deployed to:", await tokenVesting.getAddress());

  const MultiSender = await hre.ethers.getContractFactory("MultiSender");
  const multiSender = await MultiSender.deploy();
  await multiSender.waitForDeployment();
  console.log("MultiSender deployed to:", await multiSender.getAddress());

  // Configure contracts
  console.log("\nConfiguring contracts...");
  
  await bondingCurve.setGraduationManager(await graduationManager.getAddress());
  console.log("Set graduation manager on bonding curve");

  await tokenFactory.setBondingCurve(await bondingCurve.getAddress());
  console.log("Set bonding curve on token factory");

  await tokenFactory.setGraduationManager(await graduationManager.getAddress());
  console.log("Set graduation manager on token factory");

  await graduationManager.setTokenFactory(await tokenFactory.getAddress());
  console.log("Set token factory on graduation manager");

  await graduationManager.setBondingCurve(await bondingCurve.getAddress());
  console.log("Set bonding curve on graduation manager");

  console.log("\nDeployment complete!");
  console.log("\nContract addresses:");
  console.log("ConstantProductCurve:", await bondingCurve.getAddress());
  console.log("TokenFactory:", await tokenFactory.getAddress());
  console.log("GraduationManager:", await graduationManager.getAddress());
  console.log("LiquidityLocker:", await liquidityLocker.getAddress());
  console.log("TokenVesting:", await tokenVesting.getAddress());
  console.log("MultiSender:", await multiSender.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });