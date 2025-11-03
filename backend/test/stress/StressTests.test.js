const { expect } = require("chai");
const { ethers } = require("hardhat");
const TestHelpers = require("../helpers/TestHelpers");

describe("Stress Tests: Load and Performance", function () {
  let bondingCurve, tokenFactory;
  let accounts;
  
  // Increase timeout for stress tests
  this.timeout(300000); // 5 minutes
  
  before(async function () {
    console.log("\n⚠️  Starting Stress Tests - This may take several minutes...");
    accounts = await ethers.getSigners();
    
    const contracts = await TestHelpers.deployContracts(accounts[0]);
    bondingCurve = contracts.bondingCurve;
    tokenFactory = contracts.tokenFactory;
  });

  describe("Mass Token Creation", function () {
    it("Should handle 100+ token creations", async function () {
      console.log("\n📈 Mass Token Creation Test");
      console.log("===========================");
      
      const NUM_TOKENS = 100;
      const tokens = [];
      const startTime = Date.now();
      const gasUsed = [];
      
      for (let i = 0; i < NUM_TOKENS; i++) {
        if (i % 10 === 0) {
          console.log(`  Creating tokens ${i}-${Math.min(i + 9, NUM_TOKENS - 1)}...`);
        }
        
        const tx = await tokenFactory.connect(accounts[i % 10]).createToken(
          `Stress Token ${i}`,
          `ST${i}`,
          `https://example.com/stress${i}.png`,
          `Stress test token number ${i}`
        );
        
        const receipt = await tx.wait();
        gasUsed.push(receipt.gasUsed);
        
        const event = receipt.logs.find(log => log.fragment && log.fragment.name === "TokenCreated");
        tokens.push(event.args.token);
      }
      
      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;
      const avgGas = gasUsed.reduce((a, b) => a + b, 0n) / BigInt(gasUsed.length);
      
      console.log(`\n📊 Results:`);
      console.log(`  Total Tokens Created: ${NUM_TOKENS}`);
      console.log(`  Total Time: ${totalTime.toFixed(2)} seconds`);
      console.log(`  Average Time per Token: ${(totalTime / NUM_TOKENS).toFixed(3)} seconds`);
      console.log(`  Average Gas per Creation: ${avgGas}`);
      console.log(`  Min Gas: ${gasUsed.reduce((a, b) => a < b ? a : b)}`);
      console.log(`  Max Gas: ${gasUsed.reduce((a, b) => a > b ? a : b)}`);
      
      // Verify all tokens were created
      expect(tokens.length).to.equal(NUM_TOKENS);
      
      // Verify all tokens are unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).to.equal(NUM_TOKENS);
      
      // Verify factory state
      const totalCreated = await tokenFactory.totalTokensCreated();
      expect(totalCreated).to.be.gte(NUM_TOKENS);
    });

    it("Should handle rapid sequential creation from same user", async function () {
      console.log("\n⚡ Rapid Sequential Creation Test");
      console.log("=================================");
      
      const creator = accounts[1];
      const NUM_TOKENS = 20;
      const tokens = [];
      
      const startTime = Date.now();
      
      for (let i = 0; i < NUM_TOKENS; i++) {
        const tx = await tokenFactory.connect(creator).createToken(
          `Rapid ${i}`,
          `RP${i}`,
          "",
          ""
        );
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => log.fragment && log.fragment.name === "TokenCreated");
        tokens.push(event.args.token);
      }
      
      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;
      
      console.log(`  Created ${NUM_TOKENS} tokens in ${totalTime.toFixed(2)} seconds`);
      console.log(`  Rate: ${(NUM_TOKENS / totalTime).toFixed(2)} tokens/second`);
      
      expect(tokens.length).to.equal(NUM_TOKENS);
    });
  });

  describe("High-Frequency Trading", function () {
    let testToken;
    
    beforeEach(async function () {
      testToken = await TestHelpers.createToken(tokenFactory);
      await TestHelpers.enableTrading(bondingCurve, testToken);
    });
    
    it("Should handle 500+ trades on single token", async function () {
      console.log("\n💹 High-Frequency Trading Test");
      console.log("==============================");
      
      const NUM_TRADES = 500;
      const traders = accounts.slice(0, 10);
      const startTime = Date.now();
      const gasUsed = [];
      
      for (let i = 0; i < NUM_TRADES; i++) {
        if (i % 50 === 0) {
          console.log(`  Executing trades ${i}-${Math.min(i + 49, NUM_TRADES - 1)}...`);
        }
        
        const trader = traders[i % traders.length];
        const isBuy = i % 3 !== 0; // 2/3 buys, 1/3 sells
        
        if (isBuy) {
          const amount = ethers.parseEther((0.001 + (i % 10) * 0.0001).toString());
          const tx = await bondingCurve.connect(trader).buyTokens(
            testToken,
            0,
            { value: amount }
          );
          const receipt = await tx.wait();
          gasUsed.push(receipt.gasUsed);
        } else {
          // Try to sell if trader has balance
          const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
          const tokenContract = LaunchpadTokenV2.attach(testToken);
          const balance = await tokenContract.balanceOf(trader.address);
          
          if (balance > 0) {
            const sellAmount = balance / 4n; // Sell 25% of balance
            await tokenContract.connect(trader).approve(await bondingCurve.getAddress(), sellAmount);
            
            // New block required for sell
            await ethers.provider.send("evm_mine");
            
            const tx = await bondingCurve.connect(trader).sellTokens(
              testToken,
              sellAmount,
              0
            );
            const receipt = await tx.wait();
            gasUsed.push(receipt.gasUsed);
          }
        }
        
        // Mine block between trades to avoid same-block restriction
        if (i < NUM_TRADES - 1) {
          await ethers.provider.send("evm_mine");
        }
      }
      
      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;
      const avgGas = gasUsed.reduce((a, b) => a + b, 0n) / BigInt(gasUsed.length);
      
      console.log(`\n📊 Results:`);
      console.log(`  Total Trades: ${NUM_TRADES}`);
      console.log(`  Total Time: ${totalTime.toFixed(2)} seconds`);
      console.log(`  Trades per Second: ${(NUM_TRADES / totalTime).toFixed(2)}`);
      console.log(`  Average Gas per Trade: ${avgGas}`);
      
      // Verify token still functional
      const info = await bondingCurve.tokenInfo(testToken);
      expect(info.virtualEthReserve).to.be.gt(0);
      expect(info.virtualTokenReserve).to.be.gt(0);
    });

    it("Should handle concurrent trades on multiple tokens", async function () {
      console.log("\n🔀 Concurrent Multi-Token Trading");
      console.log("==================================");
      
      const NUM_TOKENS = 10;
      const TRADES_PER_TOKEN = 20;
      const tokens = [];
      
      // Create tokens
      for (let i = 0; i < NUM_TOKENS; i++) {
        const token = await TestHelpers.createToken(tokenFactory);
        await TestHelpers.enableTrading(bondingCurve, token);
        tokens.push(token);
      }
      
      const startTime = Date.now();
      let totalTrades = 0;
      
      // Simulate concurrent trading
      for (let round = 0; round < TRADES_PER_TOKEN; round++) {
        console.log(`  Round ${round + 1}/${TRADES_PER_TOKEN}`);
        
        // Trade on all tokens in parallel-ish (actually sequential but simulates concurrent load)
        for (let i = 0; i < tokens.length; i++) {
          const trader = accounts[i % 10];
          const token = tokens[i];
          const amount = ethers.parseEther("0.001");
          
          await bondingCurve.connect(trader).buyTokens(token, 0, { value: amount });
          totalTrades++;
        }
        
        // Mine block
        await ethers.provider.send("evm_mine");
      }
      
      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;
      
      console.log(`\n📊 Results:`);
      console.log(`  Total Trades: ${totalTrades}`);
      console.log(`  Tokens Traded: ${NUM_TOKENS}`);
      console.log(`  Total Time: ${totalTime.toFixed(2)} seconds`);
      console.log(`  Trades per Second: ${(totalTrades / totalTime).toFixed(2)}`);
      
      // Verify all tokens have activity
      for (const token of tokens) {
        const info = await bondingCurve.tokenInfo(token);
        expect(info.realEthReserve).to.be.gt(0);
      }
    });
  });

  describe("Memory and Storage Stress", function () {
    it("Should handle maximum metadata sizes", async function () {
      console.log("\n📝 Maximum Metadata Test");
      console.log("========================");
      
      // Create token with maximum allowed metadata
      const maxName = "A".repeat(32);
      const maxSymbol = "B".repeat(8);
      const maxUrl = "https://example.com/" + "x".repeat(236); // Total 256
      const maxDescription = "D".repeat(256);
      
      const tx = await tokenFactory.createToken(
        maxName,
        maxSymbol,
        maxUrl,
        maxDescription
      );
      
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed;
      
      console.log(`  Gas Used with Max Metadata: ${gasUsed}`);
      
      // Should still be within reasonable limits
      expect(gasUsed).to.be.lt(500000n);
      
      const event = receipt.logs.find(log => log.fragment && log.fragment.name === "TokenCreated");
      expect(event.args.name).to.equal(maxName);
      expect(event.args.symbol).to.equal(maxSymbol);
    });

    it("Should maintain performance with many unique traders", async function () {
      console.log("\n👥 Many Unique Traders Test");
      console.log("===========================");
      
      const token = await TestHelpers.createToken(tokenFactory);
      await TestHelpers.enableTrading(bondingCurve, token);
      
      const NUM_TRADERS = 50;
      const trades = [];
      
      console.log(`  Testing with ${NUM_TRADERS} unique traders...`);
      
      for (let i = 0; i < NUM_TRADERS; i++) {
        if (i < accounts.length) {
          const trader = accounts[i];
          const tx = await bondingCurve.connect(trader).buyTokens(
            token,
            0,
            { value: ethers.parseEther("0.001") }
          );
          const receipt = await tx.wait();
          trades.push(receipt.gasUsed);
          
          // Mine block for next trade
          await ethers.provider.send("evm_mine");
        }
      }
      
      const avgGas = trades.reduce((a, b) => a + b, 0n) / BigInt(trades.length);
      const minGas = trades.reduce((a, b) => a < b ? a : b);
      const maxGas = trades.reduce((a, b) => a > b ? a : b);
      
      console.log(`\n📊 Gas Usage with Many Traders:`);
      console.log(`  Average: ${avgGas}`);
      console.log(`  Min: ${minGas}`);
      console.log(`  Max: ${maxGas}`);
      console.log(`  Variance: ${((Number(maxGas - minGas) / Number(avgGas)) * 100).toFixed(2)}%`);
      
      // Gas should remain consistent
      expect(maxGas - minGas).to.be.lt(avgGas / 2n); // Less than 50% variance
    });
  });

  describe("Edge Case Stress", function () {
    it("Should handle rapid price swings", async function () {
      console.log("\n📉📈 Rapid Price Swing Test");
      console.log("===========================");
      
      const token = await TestHelpers.createToken(tokenFactory);
      await TestHelpers.enableTrading(bondingCurve, token);
      
      const initialPrice = await bondingCurve.getCurrentPrice(token);
      console.log(`  Initial Price: ${ethers.formatEther(initialPrice)}`);
      
      // Pump
      for (let i = 0; i < 10; i++) {
        await bondingCurve.connect(accounts[0]).buyTokens(
          token,
          0,
          { value: ethers.parseEther("0.1") }
        );
        await ethers.provider.send("evm_mine");
      }
      
      const highPrice = await bondingCurve.getCurrentPrice(token);
      console.log(`  High Price: ${ethers.formatEther(highPrice)}`);
      
      // Dump
      const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
      const tokenContract = LaunchpadTokenV2.attach(token);
      const balance = await tokenContract.balanceOf(accounts[0].address);
      
      await tokenContract.connect(accounts[0]).approve(await bondingCurve.getAddress(), balance);
      await ethers.provider.send("evm_mine");
      
      await bondingCurve.connect(accounts[0]).sellTokens(token, balance, 0);
      
      const lowPrice = await bondingCurve.getCurrentPrice(token);
      console.log(`  Low Price: ${ethers.formatEther(lowPrice)}`);
      
      // Verify price swings
      expect(highPrice).to.be.gt(initialPrice * 10n); // 10x pump
      expect(lowPrice).to.be.lt(highPrice / 5n); // 80% dump
      
      // System should still be functional
      await expect(
        bondingCurve.connect(accounts[1]).buyTokens(token, 0, { value: ethers.parseEther("0.01") })
      ).to.not.be.reverted;
    });

    it("Should handle maximum reserve values", async function () {
      console.log("\n💰 Maximum Reserve Test");
      console.log("=======================");
      
      const token = await TestHelpers.createToken(tokenFactory);
      await TestHelpers.enableTrading(bondingCurve, token);
      
      // Buy large amount to test limits
      const largeAmount = ethers.parseEther("50");
      
      const tx = await bondingCurve.connect(accounts[0]).buyTokens(
        token,
        0,
        { value: largeAmount }
      );
      
      const receipt = await tx.wait();
      console.log(`  Large Buy Gas: ${receipt.gasUsed}`);
      
      const info = await bondingCurve.tokenInfo(token);
      console.log(`  ETH Reserve: ${ethers.formatEther(info.realEthReserve)}`);
      console.log(`  Token Reserve: ${ethers.formatUnits(info.realTokenReserve, 18)}`);
      
      // Should handle large values without overflow
      expect(info.realEthReserve).to.be.gt(0);
      expect(info.realTokenReserve).to.be.lt(ethers.parseUnits("800000000", 18));
    });
  });

  describe("Recovery and Resilience", function () {
    it("Should recover from failed transactions", async function () {
      console.log("\n🔧 Recovery Test");
      console.log("================");
      
      const token = await TestHelpers.createToken(tokenFactory);
      await TestHelpers.enableTrading(bondingCurve, token);
      
      // Try invalid transaction (should fail)
      await expect(
        bondingCurve.connect(accounts[0]).buyTokens(token, ethers.MaxUint256, { value: ethers.parseEther("0.01") })
      ).to.be.revertedWith("Slippage");
      
      // System should still work
      await expect(
        bondingCurve.connect(accounts[0]).buyTokens(token, 0, { value: ethers.parseEther("0.01") })
      ).to.not.be.reverted;
      
      console.log("  ✅ System recovered from failed transaction");
    });

    it("Should maintain consistency under load", async function () {
      console.log("\n🔍 Consistency Check");
      console.log("====================");
      
      const token = await TestHelpers.createToken(tokenFactory);
      await TestHelpers.enableTrading(bondingCurve, token);
      
      // Perform many operations
      for (let i = 0; i < 20; i++) {
        await bondingCurve.connect(accounts[i % 10]).buyTokens(
          token,
          0,
          { value: ethers.parseEther("0.01") }
        );
        await ethers.provider.send("evm_mine");
      }
      
      // Verify consistency
      const info = await bondingCurve.tokenInfo(token);
      const k = BigInt(info.virtualEthReserve) * BigInt(info.virtualTokenReserve);
      
      console.log(`  Constant Product (k): ${k}`);
      console.log(`  ETH Reserve: ${ethers.formatEther(info.virtualEthReserve)}`);
      console.log(`  Token Reserve: ${ethers.formatUnits(info.virtualTokenReserve, 18)}`);
      
      // K should be maintained (approximately)
      const expectedK = ethers.parseEther("1") * ethers.parseUnits("1000000", 18);
      const variance = k > expectedK ? k - expectedK : expectedK - k;
      const variancePercent = (variance * 100n) / expectedK;
      
      console.log(`  Variance from expected: ${variancePercent}%`);
      
      // Should be within 10% variance (accounting for fees)
      expect(variancePercent).to.be.lt(10n);
    });
  });
});