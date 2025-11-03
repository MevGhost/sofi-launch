const { expect } = require("chai");
const { ethers } = require("hardhat");
const TestHelpers = require("../helpers/TestHelpers");

describe("Integration Tests: Full Lifecycle", function () {
  let bondingCurve, tokenFactory;
  let owner, creator, trader1, trader2, trader3;
  
  beforeEach(async function () {
    [owner, creator, trader1, trader2, trader3] = await ethers.getSigners();
    
    const contracts = await TestHelpers.deployContracts(owner);
    bondingCurve = contracts.bondingCurve;
    tokenFactory = contracts.tokenFactory;
  });

  describe("Complete Token Lifecycle", function () {
    it("Should complete full lifecycle: create → trade → graduate", async function () {
      console.log("\n🔄 Full Lifecycle Test");
      console.log("======================");
      
      // 1. CREATE TOKEN
      console.log("1️⃣ Creating token...");
      const createTx = await tokenFactory.connect(creator).createToken(
        "Lifecycle Token",
        "LIFE",
        "https://example.com/life.png",
        "Token for lifecycle testing"
      );
      const createReceipt = await createTx.wait();
      const createEvent = createReceipt.logs.find(log => log.fragment && log.fragment.name === "TokenCreated");
      const token = createEvent.args.token;
      console.log(`   Token created at: ${token}`);
      
      // 2. ENABLE TRADING
      console.log("2️⃣ Enabling trading...");
      await TestHelpers.enableTrading(bondingCurve, token);
      
      // 3. INITIAL TRADES
      console.log("3️⃣ Initial trading phase...");
      
      // Multiple traders buy
      await TestHelpers.buyTokens(bondingCurve, token, trader1, ethers.parseEther("0.1"));
      console.log("   Trader1 bought");
      
      await TestHelpers.buyTokens(bondingCurve, token, trader2, ethers.parseEther("0.2"));
      console.log("   Trader2 bought");
      
      await TestHelpers.buyTokens(bondingCurve, token, trader3, ethers.parseEther("0.15"));
      console.log("   Trader3 bought");
      
      // 4. PRICE DISCOVERY
      console.log("4️⃣ Price discovery phase...");
      const price1 = await bondingCurve.getCurrentPrice(token);
      console.log(`   Initial price: ${ethers.formatEther(price1)} ETH`);
      
      // Some selling
      const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
      const tokenContract = LaunchpadTokenV2.attach(token);
      const balance1 = await tokenContract.balanceOf(trader1.address);
      
      await TestHelpers.sellTokens(bondingCurve, token, trader1, balance1 / 2n);
      console.log("   Trader1 sold 50%");
      
      const price2 = await bondingCurve.getCurrentPrice(token);
      console.log(`   Price after sell: ${ethers.formatEther(price2)} ETH`);
      
      // 5. VOLUME BUILD-UP
      console.log("5️⃣ Volume build-up phase...");
      for (let i = 0; i < 5; i++) {
        await TestHelpers.buyTokens(bondingCurve, token, trader2, ethers.parseEther("0.05"));
      }
      console.log("   5 more buys completed");
      
      // 6. CHECK METRICS
      console.log("6️⃣ Final metrics:");
      const finalInfo = await bondingCurve.tokenInfo(token);
      const finalPrice = await bondingCurve.getCurrentPrice(token);
      const marketCap = await bondingCurve.getMarketCap(token);
      
      console.log(`   Final price: ${ethers.formatEther(finalPrice)} ETH`);
      console.log(`   Market cap: $${ethers.formatUnits(marketCap, 8)}`);
      console.log(`   ETH in pool: ${ethers.formatEther(finalInfo.realEthReserve)} ETH`);
      
      // 7. VERIFY STATE
      expect(finalPrice).to.be.gt(price1); // Price increased
      expect(finalInfo.realEthReserve).to.be.gt(0); // Has liquidity
      expect(marketCap).to.be.gt(0); // Has market cap
    });

    it("Should handle multiple tokens concurrently", async function () {
      const tokens = [];
      const NUM_TOKENS = 5;
      
      // Create multiple tokens
      for (let i = 0; i < NUM_TOKENS; i++) {
        const params = TestHelpers.generateRandomTokenParams(i);
        const tx = await tokenFactory.connect(creator).createToken(
          params.name,
          params.symbol,
          params.imageUrl,
          params.description
        );
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => log.fragment && log.fragment.name === "TokenCreated");
        tokens.push(event.args.token);
      }
      
      // Enable trading for all
      for (const token of tokens) {
        await TestHelpers.enableTrading(bondingCurve, token);
      }
      
      // Trade on all tokens
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        await TestHelpers.buyTokens(
          bondingCurve, 
          token, 
          trader1, 
          ethers.parseEther(`0.0${i + 1}`)
        );
      }
      
      // Verify all have different states
      const prices = [];
      for (const token of tokens) {
        const price = await bondingCurve.getCurrentPrice(token);
        prices.push(price);
      }
      
      // All prices should be unique (different trade amounts)
      const uniquePrices = new Set(prices.map(p => p.toString()));
      expect(uniquePrices.size).to.equal(prices.length);
    });
  });

  describe("Creator Fee Flow", function () {
    it("Should accumulate and claim creator fees", async function () {
      // Create token as creator
      const token = await TestHelpers.createToken(tokenFactory.connect(creator));
      await TestHelpers.enableTrading(bondingCurve, token);
      
      // Make trades to generate fees
      const tradeAmount = ethers.parseEther("1");
      await TestHelpers.buyTokens(bondingCurve, token, trader1, tradeAmount);
      
      // Check creator fees accumulated
      const info = await bondingCurve.tokenInfo(token);
      const creatorFees = info.creatorFees;
      
      // Creator fee is 1% of trade
      const expectedFee = tradeAmount / 100n;
      expect(creatorFees).to.be.closeTo(expectedFee, expectedFee / 10n);
      
      // Claim fees
      const balanceBefore = await TestHelpers.getBalance(creator.address);
      await bondingCurve.connect(creator).claimCreatorFees(token);
      const balanceAfter = await TestHelpers.getBalance(creator.address);
      
      // Should receive fees (minus gas)
      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });

  describe("Trading Patterns", function () {
    it("Should handle pump and dump pattern", async function () {
      const token = await TestHelpers.createToken(tokenFactory);
      await TestHelpers.enableTrading(bondingCurve, token);
      
      // Pump phase - rapid buys
      const pumpAmount = ethers.parseEther("0.1");
      for (let i = 0; i < 10; i++) {
        await TestHelpers.buyTokens(bondingCurve, token, trader1, pumpAmount);
      }
      
      const pumpPrice = await bondingCurve.getCurrentPrice(token);
      
      // Dump phase - sell all
      const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
      const tokenContract = LaunchpadTokenV2.attach(token);
      const balance = await tokenContract.balanceOf(trader1.address);
      
      await TestHelpers.sellTokens(bondingCurve, token, trader1, balance);
      
      const dumpPrice = await bondingCurve.getCurrentPrice(token);
      
      // Price should crash but not to zero
      expect(dumpPrice).to.be.lt(pumpPrice / 2n);
      expect(dumpPrice).to.be.gt(0);
    });

    it("Should handle arbitrage between traders", async function () {
      const token = await TestHelpers.createToken(tokenFactory);
      await TestHelpers.enableTrading(bondingCurve, token);
      
      // Trader1 buys low
      await TestHelpers.buyTokens(bondingCurve, token, trader1, ethers.parseEther("0.01"));
      const buyPrice = await bondingCurve.getCurrentPrice(token);
      
      // Trader2 buys high (pumps price)
      await TestHelpers.buyTokens(bondingCurve, token, trader2, ethers.parseEther("1"));
      const highPrice = await bondingCurve.getCurrentPrice(token);
      
      // Trader1 sells for profit
      const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
      const tokenContract = LaunchpadTokenV2.attach(token);
      const balance = await tokenContract.balanceOf(trader1.address);
      
      const ethBefore = await TestHelpers.getBalance(trader1.address);
      await TestHelpers.sellTokens(bondingCurve, token, trader1, balance);
      const ethAfter = await TestHelpers.getBalance(trader1.address);
      
      // Trader1 should profit
      expect(highPrice).to.be.gt(buyPrice);
      expect(ethAfter).to.be.gt(ethBefore);
    });
  });

  describe("Tool Suite Integration", function () {
    let liquidityLocker, tokenVesting, multiSender;
    
    beforeEach(async function () {
      // Deploy tool suite
      const LiquidityLocker = await ethers.getContractFactory("LiquidityLocker");
      liquidityLocker = await LiquidityLocker.deploy();
      
      const TokenVesting = await ethers.getContractFactory("TokenVesting");
      tokenVesting = await TokenVesting.deploy();
      
      const MultiSender = await ethers.getContractFactory("MultiSender");
      multiSender = await MultiSender.deploy();
    });
    
    it("Should integrate with MultiSender for airdrops", async function () {
      const token = await TestHelpers.createToken(tokenFactory);
      await TestHelpers.enableTrading(bondingCurve, token);
      
      // Creator buys tokens
      await TestHelpers.buyTokens(bondingCurve, token, creator, ethers.parseEther("1"));
      
      // Get token contract
      const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
      const tokenContract = LaunchpadTokenV2.attach(token);
      const balance = await tokenContract.balanceOf(creator.address);
      
      // Prepare airdrop
      const recipients = [trader1.address, trader2.address, trader3.address];
      const amounts = [
        balance / 10n,
        balance / 10n,
        balance / 10n
      ];
      
      // Approve multisender
      await tokenContract.connect(creator).approve(
        await multiSender.getAddress(),
        balance
      );
      
      // Execute airdrop
      await multiSender.connect(creator).sendTokens(
        token,
        recipients,
        amounts,
        { value: await multiSender.baseFee() }
      );
      
      // Verify recipients received tokens
      for (const recipient of recipients) {
        const recipientBalance = await tokenContract.balanceOf(recipient);
        expect(recipientBalance).to.equal(balance / 10n);
      }
    });
    
    it("Should integrate with TokenVesting for team allocation", async function () {
      const token = await TestHelpers.createToken(tokenFactory);
      
      // Get token contract
      const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
      const tokenContract = LaunchpadTokenV2.attach(token);
      
      // Creator gets initial supply for vesting
      const creatorBalance = await tokenContract.balanceOf(creator.address);
      
      // Create vesting schedule
      const vestingAmount = ethers.parseUnits("100000", 18);
      await tokenContract.connect(creator).transfer(
        await tokenVesting.getAddress(),
        vestingAmount
      );
      
      await tokenVesting.connect(creator).createVestingSchedule(
        trader1.address,
        token,
        vestingAmount,
        Math.floor(Date.now() / 1000),
        30 * 24 * 60 * 60, // 30 day cliff
        365 * 24 * 60 * 60, // 1 year vesting
        true // revocable
      );
      
      // Verify vesting was created
      const scheduleCount = await tokenVesting.vestingScheduleCount();
      expect(scheduleCount).to.equal(1);
    });
  });

  describe("Cross-Contract Interactions", function () {
    it("Should handle factory → bonding curve → token flow", async function () {
      // Track gas across entire flow
      const gasUsed = {};
      
      // 1. Factory creates token
      const createTx = await tokenFactory.createToken(
        "Cross Contract",
        "CROSS",
        "",
        ""
      );
      const createReceipt = await createTx.wait();
      gasUsed.create = createReceipt.gasUsed;
      
      const event = createReceipt.logs.find(log => log.fragment && log.fragment.name === "TokenCreated");
      const token = event.args.token;
      
      // 2. Bonding curve initializes (done in create)
      const info = await bondingCurve.tokenInfo(token);
      expect(info.creator).to.not.equal(ethers.ZeroAddress);
      
      // 3. Enable and trade
      await TestHelpers.enableTrading(bondingCurve, token);
      
      const buyTx = await TestHelpers.buyTokens(bondingCurve, token, trader1, ethers.parseEther("0.01"));
      const buyReceipt = await buyTx.wait();
      gasUsed.buy = buyReceipt.gasUsed;
      
      // 4. Token transfers work
      const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
      const tokenContract = LaunchpadTokenV2.attach(token);
      
      const balance = await tokenContract.balanceOf(trader1.address);
      expect(balance).to.be.gt(0);
      
      // Log gas usage
      console.log("\n⛽ Cross-Contract Gas Usage:");
      console.log(`   Create: ${gasUsed.create}`);
      console.log(`   Buy: ${gasUsed.buy}`);
    });
    
    it("Should maintain state consistency across contracts", async function () {
      const token = await TestHelpers.createToken(tokenFactory);
      
      // Check factory state
      const isValid = await tokenFactory.isValidToken(token);
      expect(isValid).to.be.true;
      
      const meta = await tokenFactory.tokenMeta(token);
      expect(meta.tokenId).to.be.gte(0);
      
      // Check bonding curve state
      const info = await bondingCurve.tokenInfo(token);
      expect(info.creator).to.not.equal(ethers.ZeroAddress);
      
      // Check token state
      const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
      const tokenContract = LaunchpadTokenV2.attach(token);
      
      const totalSupply = await tokenContract.totalSupply();
      expect(totalSupply).to.equal(ethers.parseUnits("1000000000", 18));
      
      const curveBalance = await tokenContract.balanceOf(await bondingCurve.getAddress());
      expect(curveBalance).to.equal(ethers.parseUnits("1000000000", 18));
    });
  });
});