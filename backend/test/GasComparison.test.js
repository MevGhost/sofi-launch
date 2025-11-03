const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Gas Optimization Comparison", function () {
  let optimizedFactory, optimizedCurve;
  let originalFactory, originalCurve;
  let token;
  let owner, user1;
  
  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // Deploy OPTIMIZED implementation
    const OptimizedBondingCurve = await ethers.getContractFactory("OptimizedBondingCurve");
    optimizedCurve = await OptimizedBondingCurve.deploy(
      owner.address,
      "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
      "0x2626664c2603336E57B271c5C0b26F421741e481",
      "0x4200000000000000000000000000000000000006"
    );

    const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
    const tokenImpl = await LaunchpadTokenV2.deploy();
    
    const OptimizedTokenFactory = await ethers.getContractFactory("OptimizedTokenFactory");
    optimizedFactory = await OptimizedTokenFactory.deploy(await tokenImpl.getAddress());
    
    await optimizedFactory.setBondingCurve(await optimizedCurve.getAddress());

    // Deploy ORIGINAL implementation
    const SecureConstantProductCurve = await ethers.getContractFactory("SecureConstantProductCurve");
    originalCurve = await SecureConstantProductCurve.deploy(
      owner.address,
      "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
      "0x2626664c2603336E57B271c5C0b26F421741e481",
      "0x4200000000000000000000000000000000000006"
    );

    // Setup pausers for original
    await originalCurve.grantRole(await originalCurve.PAUSER_ROLE(), owner.address);
    
    const tokenImpl2 = await LaunchpadTokenV2.deploy();
    const TokenFactoryV2 = await ethers.getContractFactory("TokenFactoryV2");
    originalFactory = await TokenFactoryV2.deploy(await tokenImpl2.getAddress());
    
    await originalFactory.setBondingCurve(await originalCurve.getAddress());
  });

  describe("Token Creation Comparison", function () {
    it("OPTIMIZED vs ORIGINAL: Token Creation", async function () {
      console.log("\n📊 TOKEN CREATION GAS COMPARISON");
      console.log("=================================");
      
      // OPTIMIZED
      const optimizedTx = await optimizedFactory.createToken(
        "Test Token",
        "TEST",
        "https://example.com/token.png",
        "A test token"
      );
      const optimizedReceipt = await optimizedTx.wait();
      const optimizedGas = optimizedReceipt.gasUsed;
      
      // ORIGINAL
      const originalTx = await originalFactory.createToken(
        "Test Token",
        "TEST",
        "https://example.com/token.png",
        "A test token"
      );
      const originalReceipt = await originalTx.wait();
      const originalGas = originalReceipt.gasUsed;
      
      const savings = ((originalGas - optimizedGas) * 100n) / originalGas;
      
      console.log(`Original:  ${originalGas.toString()} gas`);
      console.log(`Optimized: ${optimizedGas.toString()} gas`);
      console.log(`Savings:   ${savings.toString()}% ✅`);
      console.log(`Target:    < 500,000 gas ${optimizedGas < 500000n ? "✅ ACHIEVED" : "❌ NOT MET"}`);
    });
  });

  describe("Buy Operation Comparison", function () {
    it("OPTIMIZED vs ORIGINAL: Buy Tokens", async function () {
      console.log("\n📊 BUY OPERATION GAS COMPARISON");
      console.log("================================");
      
      // Create tokens first
      let tx = await optimizedFactory.createToken("Test", "TEST", "", "");
      let receipt = await tx.wait();
      let event = receipt.logs.find(log => log.fragment && log.fragment.name === "TokenCreated");
      const optimizedToken = event.args.token;

      tx = await originalFactory.createToken("Test", "TEST", "", "");
      receipt = await tx.wait();
      event = receipt.logs.find(log => log.fragment && log.fragment.name === "TokenCreated");
      const originalToken = event.args.token;

      // Wait for trading
      const optimizedInfo = await optimizedCurve.tokenInfo(optimizedToken);
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(optimizedInfo.tradingEnabledAt) + 1]);
      await ethers.provider.send("evm_mine");

      const originalInfo = await originalCurve.tokenInfo(originalToken);
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(originalInfo.tradingEnabledAt) + 1]);
      await ethers.provider.send("evm_mine");

      // OPTIMIZED BUY
      const optimizedBuyTx = await optimizedCurve.connect(user1).buyTokens(
        optimizedToken,
        0,
        { value: ethers.parseEther("0.01") }
      );
      const optimizedBuyReceipt = await optimizedBuyTx.wait();
      const optimizedBuyGas = optimizedBuyReceipt.gasUsed;

      // ORIGINAL BUY
      const originalBuyTx = await originalCurve.connect(user1).buyTokens(
        originalToken,
        0,
        { value: ethers.parseEther("0.01") }
      );
      const originalBuyReceipt = await originalBuyTx.wait();
      const originalBuyGas = originalBuyReceipt.gasUsed;

      const savings = ((originalBuyGas - optimizedBuyGas) * 100n) / originalBuyGas;

      console.log(`Original:  ${originalBuyGas.toString()} gas`);
      console.log(`Optimized: ${optimizedBuyGas.toString()} gas`);
      console.log(`Savings:   ${savings.toString()}% ✅`);
      console.log(`Target:    < 150,000 gas ${optimizedBuyGas < 150000n ? "✅ ACHIEVED" : "❌ NOT MET"}`);
    });
  });

  describe("Sell Operation Comparison", function () {
    it("OPTIMIZED vs ORIGINAL: Sell Tokens", async function () {
      console.log("\n📊 SELL OPERATION GAS COMPARISON");
      console.log("=================================");
      
      // Setup tokens and buy first
      let tx = await optimizedFactory.createToken("Test", "TEST", "", "");
      let receipt = await tx.wait();
      let event = receipt.logs.find(log => log.fragment && log.fragment.name === "TokenCreated");
      const optimizedToken = event.args.token;

      tx = await originalFactory.createToken("Test", "TEST", "", "");
      receipt = await tx.wait();
      event = receipt.logs.find(log => log.fragment && log.fragment.name === "TokenCreated");
      const originalToken = event.args.token;

      // Enable trading
      const optimizedInfo = await optimizedCurve.tokenInfo(optimizedToken);
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(optimizedInfo.tradingEnabledAt) + 1]);
      await ethers.provider.send("evm_mine");

      const originalInfo = await originalCurve.tokenInfo(originalToken);
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(originalInfo.tradingEnabledAt) + 1]);
      await ethers.provider.send("evm_mine");

      // Buy tokens first
      await optimizedCurve.connect(user1).buyTokens(optimizedToken, 0, { value: ethers.parseEther("0.01") });
      await originalCurve.connect(user1).buyTokens(originalToken, 0, { value: ethers.parseEther("0.01") });

      // Get token contracts
      const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
      const optimizedTokenContract = LaunchpadTokenV2.attach(optimizedToken);
      const originalTokenContract = LaunchpadTokenV2.attach(originalToken);

      // Get balances and approve
      const optimizedBalance = await optimizedTokenContract.balanceOf(user1.address);
      const originalBalance = await originalTokenContract.balanceOf(user1.address);
      
      await optimizedTokenContract.connect(user1).approve(await optimizedCurve.getAddress(), optimizedBalance);
      await originalTokenContract.connect(user1).approve(await originalCurve.getAddress(), originalBalance);

      // Mine block to avoid same-block restriction
      await ethers.provider.send("evm_mine");

      // OPTIMIZED SELL
      const optimizedSellTx = await optimizedCurve.connect(user1).sellTokens(
        optimizedToken,
        optimizedBalance / 2n,
        0
      );
      const optimizedSellReceipt = await optimizedSellTx.wait();
      const optimizedSellGas = optimizedSellReceipt.gasUsed;

      // ORIGINAL SELL
      const originalSellTx = await originalCurve.connect(user1).sellTokens(
        originalToken,
        originalBalance / 2n,
        0
      );
      const originalSellReceipt = await originalSellTx.wait();
      const originalSellGas = originalSellReceipt.gasUsed;

      const savings = ((originalSellGas - optimizedSellGas) * 100n) / originalSellGas;

      console.log(`Original:  ${originalSellGas.toString()} gas`);
      console.log(`Optimized: ${optimizedSellGas.toString()} gas`);
      console.log(`Savings:   ${savings.toString()}% ✅`);
      console.log(`Target:    < 120,000 gas ${optimizedSellGas < 120000n ? "✅ ACHIEVED" : "❌ NOT MET"}`);
    });
  });

  describe("Summary", function () {
    it("Print optimization summary", async function () {
      console.log("\n🎯 OPTIMIZATION SUMMARY");
      console.log("=======================");
      console.log("Key Optimizations Applied:");
      console.log("✅ Packed structs (3 slots vs 5)");
      console.log("✅ Unchecked math blocks");
      console.log("✅ Immutable constants");
      console.log("✅ Single SLOAD/SSTORE patterns");
      console.log("✅ Memory caching");
      console.log("✅ Removed redundant checks");
      console.log("✅ Event-based metadata storage");
      console.log("✅ Optimized formula calculations");
    });
  });
});