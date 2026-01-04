const hre = require("hardhat");

async function main() {
  console.log("Deploying Base Launchpad V2 contracts...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy LaunchpadTokenV2 implementation
  const LaunchpadTokenV2 = await hre.ethers.getContractFactory("LaunchpadTokenV2");
  const tokenImplementation = await LaunchpadTokenV2.deploy();
  await tokenImplementation.waitForDeployment();
  console.log("LaunchpadTokenV2 implementation deployed to:", await tokenImplementation.getAddress());

  // Deploy TokenFactoryV2
  const TokenFactoryV2 = await hre.ethers.getContractFactory("TokenFactoryV2");
  const tokenFactory = await TokenFactoryV2.deploy(await tokenImplementation.getAddress());
  await tokenFactory.waitForDeployment();
  console.log("TokenFactoryV2 deployed to:", await tokenFactory.getAddress());

  // Base mainnet Chainlink ETH/USD price feed
  const ETH_USD_FEED = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70";

  // Deploy ConstantProductCurveV2
  const ConstantProductCurveV2 = await hre.ethers.getContractFactory("ConstantProductCurveV2");
  const bondingCurve = await ConstantProductCurveV2.deploy(
    deployer.address, // fee recipient
    ETH_USD_FEED
  );
  await bondingCurve.waitForDeployment();
  console.log("ConstantProductCurveV2 deployed to:", await bondingCurve.getAddress());

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

  // Deploy TokenRegistry helper
  const TokenRegistry = await hre.ethers.getContractFactory("TokenRegistry");
  const tokenRegistry = await TokenRegistry.deploy(
    await tokenFactory.getAddress(),
    await bondingCurve.getAddress()
  );
  await tokenRegistry.waitForDeployment();
  console.log("TokenRegistry deployed to:", await tokenRegistry.getAddress());

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
  
  // Set bonding curve on factory
  await tokenFactory.setBondingCurve(await bondingCurve.getAddress());
  console.log("Set bonding curve on token factory");

  // Set graduation manager on bonding curve
  await bondingCurve.setGraduationManager(await graduationManager.getAddress());
  console.log("Set graduation manager on bonding curve");

  // Set factory and bonding curve on graduation manager
  await graduationManager.setTokenFactory(await tokenFactory.getAddress());
  console.log("Set token factory on graduation manager");

  await graduationManager.setBondingCurve(await bondingCurve.getAddress());
  console.log("Set bonding curve on graduation manager");

  // Set creation fee (optional - can be 0 for initial launch)
  const creationFee = hre.ethers.parseEther("0.001"); // 0.001 ETH
  await tokenFactory.setCreationFee(creationFee);
  console.log("Set creation fee to 0.001 ETH");

  console.log("\nDeployment complete!");
  console.log("\nContract addresses:");
  console.log("LaunchpadTokenV2 Implementation:", await tokenImplementation.getAddress());
  console.log("TokenFactoryV2:", await tokenFactory.getAddress());
  console.log("ConstantProductCurveV2:", await bondingCurve.getAddress());
  console.log("GraduationManager:", await graduationManager.getAddress());
  console.log("TokenRegistry:", await tokenRegistry.getAddress());
  console.log("LiquidityLocker:", await liquidityLocker.getAddress());
  console.log("TokenVesting:", await tokenVesting.getAddress());
  console.log("MultiSender:", await multiSender.getAddress());

  // Save deployment addresses
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    addresses: {
      tokenImplementation: await tokenImplementation.getAddress(),
      tokenFactory: await tokenFactory.getAddress(),
      bondingCurve: await bondingCurve.getAddress(),
      graduationManager: await graduationManager.getAddress(),
      tokenRegistry: await tokenRegistry.getAddress(),
      liquidityLocker: await liquidityLocker.getAddress(),
      tokenVesting: await tokenVesting.getAddress(),
      multiSender: await multiSender.getAddress(),
    },
    configuration: {
      creationFee: creationFee.toString(),
      ethUsdFeed: ETH_USD_FEED,
      uniswapV3Factory: UNISWAP_V3_FACTORY,
      positionManager: POSITION_MANAGER,
      weth: WETH,
    }
  };

  fs.writeFileSync(
    `deployments/${hre.network.name}-${Date.now()}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to deployments folder");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });