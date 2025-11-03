const { expect } = require("chai");
const { ethers } = require("hardhat");
const TestHelpers = require("../helpers/TestHelpers");

describe("Fork Tests: Base Mainnet", function () {
  let bondingCurve, tokenFactory, token;
  let owner, user1, user2;
  
  // Base mainnet addresses
  const UNISWAP_V3_FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";
  const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";
  const WETH = "0x4200000000000000000000000000000000000006";
  const ETH_USD_FEED = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70";
  const POSITION_MANAGER = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
  
  before(async function () {
    // Skip if not forking
    const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
    if (chainId !== 8453n) {
      console.log("⚠️  Skipping fork tests - not on Base mainnet fork");
      this.skip();
    }
  });
  
  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy with real Base addresses
    const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
    const tokenImpl = await LaunchpadTokenV2.deploy();
    
    const OptimizedBondingCurve = await ethers.getContractFactory("OptimizedBondingCurve");
    bondingCurve = await OptimizedBondingCurve.deploy(
      owner.address,
      ETH_USD_FEED,
      UNISWAP_V3_ROUTER,
      WETH
    );

    const OptimizedTokenFactory = await ethers.getContractFactory("OptimizedTokenFactory");
    tokenFactory = await OptimizedTokenFactory.deploy(await tokenImpl.getAddress());
    
    await tokenFactory.setBondingCurve(await bondingCurve.getAddress());
  });

  describe("Chainlink Price Feed Integration", function () {
    it("Should fetch real ETH price from Chainlink", async function () {
      // Get price feed contract
      const priceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        ETH_USD_FEED
      );
      
      const roundData = await priceFeed.latestRoundData();
      const price = roundData[1]; // price is second element
      
      console.log(`\n💰 Current ETH Price: $${ethers.formatUnits(price, 8)}`);
      
      // Price should be reasonable (between $1000 and $10000)
      expect(price).to.be.gt(1000n * 10n**8n);
      expect(price).to.be.lt(10000n * 10n**8n);
    });

    it("Should calculate market cap using real ETH price", async function () {
      const token = await TestHelpers.createToken(tokenFactory);
      await TestHelpers.enableTrading(bondingCurve, token);
      
      // Make a trade to establish price
      await TestHelpers.buyTokens(bondingCurve, token, user1, ethers.parseEther("0.1"));
      
      const marketCap = await bondingCurve.getMarketCap(token);
      console.log(`\n📊 Token Market Cap: $${ethers.formatUnits(marketCap, 8)}`);
      
      // Should have reasonable market cap
      expect(marketCap).to.be.gt(0);
      expect(marketCap).to.be.lt(ethers.parseUnits("1000000", 8)); // Less than $1M
    });
  });

  describe("Uniswap V3 Integration", function () {
    let graduationManager;
    
    beforeEach(async function () {
      // Deploy graduation manager
      const GraduationManager = await ethers.getContractFactory("GraduationManager");
      graduationManager = await GraduationManager.deploy(
        UNISWAP_V3_FACTORY,
        POSITION_MANAGER,
        WETH
      );
      
      await graduationManager.setTokenFactory(await tokenFactory.getAddress());
      await graduationManager.setBondingCurve(await bondingCurve.getAddress());
    });
    
    it("Should check Uniswap V3 factory", async function () {
      const factory = await ethers.getContractAt(
        "IUniswapV3Factory",
        UNISWAP_V3_FACTORY
      );
      
      const owner = await factory.owner();
      console.log(`\n🏭 Uniswap V3 Factory Owner: ${owner}`);
      
      expect(owner).to.not.equal(ethers.ZeroAddress);
    });
    
    it("Should simulate pool creation for graduated token", async function () {
      const token = await TestHelpers.createToken(tokenFactory);
      
      // Check if pool already exists
      const factory = await ethers.getContractAt(
        "IUniswapV3Factory",
        UNISWAP_V3_FACTORY
      );
      
      const token0 = token < WETH ? token : WETH;
      const token1 = token < WETH ? WETH : token;
      const fee = 3000; // 0.3%
      
      const poolAddress = await factory.getPool(token0, token1, fee);
      console.log(`\n🏊 Pool Address: ${poolAddress}`);
      
      if (poolAddress === ethers.ZeroAddress) {
        console.log("   Pool doesn't exist yet (would be created on graduation)");
      } else {
        console.log("   Pool already exists!");
      }
    });
  });

  describe("Gas Usage on Base", function () {
    it("Should measure actual gas costs in USD", async function () {
      console.log("\n⛽ Gas Cost Analysis on Base");
      console.log("=============================");
      
      // Get current gas price
      const gasPrice = await ethers.provider.getFeeData().then(d => d.gasPrice);
      console.log(`Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
      
      // Get ETH price
      const priceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        ETH_USD_FEED
      );
      const ethPrice = await priceFeed.latestRoundData().then(d => d[1]);
      const ethPriceUSD = Number(ethPrice) / 10**8;
      
      // Create token
      const createTx = await tokenFactory.createToken("Gas Test", "GAS", "", "");
      const createReceipt = await createTx.wait();
      const createGasUsed = createReceipt.gasUsed;
      const createCostETH = createGasUsed * gasPrice;
      const createCostUSD = Number(ethers.formatEther(createCostETH)) * ethPriceUSD;
      
      console.log(`\nToken Creation:`);
      console.log(`  Gas Used: ${createGasUsed}`);
      console.log(`  Cost: ${ethers.formatEther(createCostETH)} ETH`);
      console.log(`  Cost: $${createCostUSD.toFixed(4)} USD`);
      
      // Enable trading
      const event = createReceipt.logs.find(log => log.fragment && log.fragment.name === "TokenCreated");
      const token = event.args.token;
      await TestHelpers.enableTrading(bondingCurve, token);
      
      // Buy tokens
      const buyTx = await TestHelpers.buyTokens(bondingCurve, token, user1, ethers.parseEther("0.01"));
      const buyReceipt = await buyTx.wait();
      const buyGasUsed = buyReceipt.gasUsed;
      const buyCostETH = buyGasUsed * gasPrice;
      const buyCostUSD = Number(ethers.formatEther(buyCostETH)) * ethPriceUSD;
      
      console.log(`\nToken Buy:`);
      console.log(`  Gas Used: ${buyGasUsed}`);
      console.log(`  Cost: ${ethers.formatEther(buyCostETH)} ETH`);
      console.log(`  Cost: $${buyCostUSD.toFixed(4)} USD`);
      
      // Verify costs are reasonable for Base
      expect(createCostUSD).to.be.lt(1); // Should be less than $1
      expect(buyCostUSD).to.be.lt(0.5); // Should be less than $0.50
    });
  });

  describe("WETH Interactions", function () {
    it("Should interact with Base WETH", async function () {
      const weth = await ethers.getContractAt(
        ["function deposit() payable", "function withdraw(uint256)", "function balanceOf(address) view returns (uint256)"],
        WETH
      );
      
      // Wrap ETH
      const wrapAmount = ethers.parseEther("0.1");
      await weth.connect(user1).deposit({ value: wrapAmount });
      
      const balance = await weth.balanceOf(user1.address);
      console.log(`\n💎 WETH Balance: ${ethers.formatEther(balance)} WETH`);
      
      expect(balance).to.equal(wrapAmount);
    });
  });

  describe("Real Network Conditions", function () {
    it("Should handle Base block times", async function () {
      const block1 = await ethers.provider.getBlock("latest");
      
      // Mine a block
      await ethers.provider.send("evm_mine");
      
      const block2 = await ethers.provider.getBlock("latest");
      
      console.log(`\n⏰ Block Times:`);
      console.log(`  Block ${block1.number}: ${new Date(block1.timestamp * 1000).toISOString()}`);
      console.log(`  Block ${block2.number}: ${new Date(block2.timestamp * 1000).toISOString()}`);
      console.log(`  Time Diff: ${block2.timestamp - block1.timestamp} seconds`);
      
      // Base has ~2 second block times
      expect(block2.number).to.equal(block1.number + 1n);
    });
    
    it("Should simulate high load scenario", async function () {
      console.log("\n🔥 High Load Simulation");
      console.log("=======================");
      
      const tokens = [];
      const NUM_TOKENS = 10;
      
      // Create multiple tokens rapidly
      const startTime = Date.now();
      
      for (let i = 0; i < NUM_TOKENS; i++) {
        const tx = await tokenFactory.createToken(
          `Load Test ${i}`,
          `LT${i}`,
          "",
          ""
        );
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => log.fragment && log.fragment.name === "TokenCreated");
        tokens.push(event.args.token);
      }
      
      const createTime = Date.now() - startTime;
      console.log(`  Created ${NUM_TOKENS} tokens in ${createTime}ms`);
      console.log(`  Average: ${(createTime / NUM_TOKENS).toFixed(0)}ms per token`);
      
      // Simulate trading on all tokens
      const tradeStart = Date.now();
      
      for (const token of tokens) {
        await TestHelpers.enableTrading(bondingCurve, token);
        await TestHelpers.buyTokens(bondingCurve, token, user1, ethers.parseEther("0.001"));
      }
      
      const tradeTime = Date.now() - tradeStart;
      console.log(`  Traded on ${NUM_TOKENS} tokens in ${tradeTime}ms`);
      console.log(`  Average: ${(tradeTime / NUM_TOKENS).toFixed(0)}ms per trade`);
      
      // All should complete successfully
      expect(tokens.length).to.equal(NUM_TOKENS);
    });
  });
});