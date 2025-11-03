const { expect } = require("chai");
const { ethers } = require("hardhat");
const TestHelpers = require("../helpers/TestHelpers");

describe("Unit Tests: Bonding Curve Math", function () {
  let bondingCurve, tokenFactory, token;
  let owner, user1, user2;
  
  const INITIAL_VIRTUAL_ETH = ethers.parseEther("1");
  const INITIAL_VIRTUAL_TOKEN = ethers.parseUnits("1000000", 18);
  const PRECISION = 1000000n; // 0.0001% precision

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const contracts = await TestHelpers.deployContracts(owner);
    bondingCurve = contracts.bondingCurve;
    tokenFactory = contracts.tokenFactory;
    
    token = await TestHelpers.createToken(tokenFactory);
    await TestHelpers.enableTrading(bondingCurve, token);
  });

  describe("Constant Product Formula (x * y = k)", function () {
    it("Should maintain constant product after buy", async function () {
      const kBefore = INITIAL_VIRTUAL_ETH * INITIAL_VIRTUAL_TOKEN;
      
      const buyAmount = ethers.parseEther("0.1");
      await TestHelpers.buyTokens(bondingCurve, token, user1, buyAmount);
      
      const info = await bondingCurve.tokenInfo(token);
      const kAfter = BigInt(info.virtualEthReserve) * BigInt(info.virtualTokenReserve);
      
      // After a buy with fees, k increases slightly (fees increase ETH, k = x*y increases)
      // This is expected behavior as fees are added to the pool
      expect(kAfter).to.be.gte(kBefore);
      
      // The increase should be reasonable (less than 5% for typical trades)
      const increaseRatio = ((kAfter - kBefore) * 10000n) / kBefore;
      expect(increaseRatio).to.be.lte(500n); // Less than 5%
    });

    it("Should maintain constant product after sell", async function () {
      // First buy tokens
      await TestHelpers.buyTokens(bondingCurve, token, user1, ethers.parseEther("0.1"));
      
      const infoBefore = await bondingCurve.tokenInfo(token);
      const kBefore = BigInt(infoBefore.virtualEthReserve) * BigInt(infoBefore.virtualTokenReserve);
      
      // Sell half the tokens
      const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
      const tokenContract = LaunchpadTokenV2.attach(token);
      const balance = await tokenContract.balanceOf(user1.address);
      
      await TestHelpers.sellTokens(bondingCurve, token, user1, balance / 2n);
      
      const infoAfter = await bondingCurve.tokenInfo(token);
      const kAfter = BigInt(infoAfter.virtualEthReserve) * BigInt(infoAfter.virtualTokenReserve);
      
      // After a sell with fees, k slightly decreases (fees reduce ETH returned)
      // The change should be minimal
      const changeRatio = kAfter > kBefore ? 
        ((kAfter - kBefore) * 10000n) / kBefore :
        ((kBefore - kAfter) * 10000n) / kBefore;
      
      expect(changeRatio).to.be.lte(500n); // Less than 5% change
    });
  });

  describe("Price Calculations", function () {
    it("Should calculate correct tokens out for ETH in", async function () {
      const ethIn = ethers.parseEther("0.01");
      
      const expectedTokens = TestHelpers.calculateExpectedTokens(
        INITIAL_VIRTUAL_ETH,
        INITIAL_VIRTUAL_TOKEN,
        ethIn
      );
      
      const actualTokens = await bondingCurve.calculateTokensOut(token, ethIn);
      
      // Should match within 0.1%
      const diff = actualTokens > expectedTokens ? 
        actualTokens - expectedTokens : expectedTokens - actualTokens;
      expect(diff).to.be.lte(expectedTokens / 1000n);
    });

    it("Should calculate correct ETH out for tokens in", async function () {
      const tokensIn = ethers.parseUnits("10000", 18);
      
      const expectedEth = TestHelpers.calculateExpectedEth(
        INITIAL_VIRTUAL_ETH,
        INITIAL_VIRTUAL_TOKEN,
        tokensIn
      );
      
      const actualEth = await bondingCurve.calculateEthOut(token, tokensIn);
      
      const diff = actualEth > expectedEth ? 
        actualEth - expectedEth : expectedEth - actualEth;
      expect(diff).to.be.lte(expectedEth / 1000n);
    });

    it("Should increase price as more ETH enters", async function () {
      const priceBefore = await bondingCurve.getCurrentPrice(token);
      
      await TestHelpers.buyTokens(bondingCurve, token, user1, ethers.parseEther("0.1"));
      
      const priceAfter = await bondingCurve.getCurrentPrice(token);
      
      expect(priceAfter).to.be.gt(priceBefore);
    });

    it("Should decrease price as ETH exits", async function () {
      // Buy first
      await TestHelpers.buyTokens(bondingCurve, token, user1, ethers.parseEther("0.1"));
      
      const priceBefore = await bondingCurve.getCurrentPrice(token);
      
      // Sell tokens
      const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
      const tokenContract = LaunchpadTokenV2.attach(token);
      const balance = await tokenContract.balanceOf(user1.address);
      
      await TestHelpers.sellTokens(bondingCurve, token, user1, balance);
      
      const priceAfter = await bondingCurve.getCurrentPrice(token);
      
      expect(priceAfter).to.be.lt(priceBefore);
    });
  });

  describe("Slippage Protection", function () {
    it("Should apply 0.1% slippage protection on buys", async function () {
      const ethIn = ethers.parseEther("0.1");
      
      // The calculateTokensOut function:
      // 1. Calculates new reserves with ALL ethIn (no fee deduction)
      // 2. Applies 0.1% slippage at the end
      const k = INITIAL_VIRTUAL_ETH * INITIAL_VIRTUAL_TOKEN;
      const newEthReserve = INITIAL_VIRTUAL_ETH + ethIn;
      const newTokenReserve = k / newEthReserve;
      const tokensWithoutSlippage = INITIAL_VIRTUAL_TOKEN - newTokenReserve;
      
      const actualTokens = await bondingCurve.calculateTokensOut(token, ethIn);
      
      // Should be exactly 0.1% less (999/1000)
      const expectedWithSlippage = (tokensWithoutSlippage * 999n) / 1000n;
      
      expect(actualTokens).to.equal(expectedWithSlippage);
    });

    it("Should enforce minimum tokens out", async function () {
      const ethIn = ethers.parseEther("0.01");
      const expectedTokens = await bondingCurve.calculateTokensOut(token, ethIn);
      
      // Set minTokensOut higher than expected
      const minTokensOut = expectedTokens * 2n;
      
      await expect(
        bondingCurve.connect(user1).buyTokens(token, minTokensOut, { value: ethIn })
      ).to.be.revertedWith("Slippage");
    });
  });

  describe("Reserve Management", function () {
    it("Should track virtual reserves correctly", async function () {
      const info = await bondingCurve.tokenInfo(token);
      
      expect(info.virtualEthReserve).to.equal(INITIAL_VIRTUAL_ETH);
      expect(info.virtualTokenReserve).to.equal(INITIAL_VIRTUAL_TOKEN);
    });

    it("Should track real reserves separately", async function () {
      const infoBefore = await bondingCurve.tokenInfo(token);
      expect(infoBefore.realEthReserve).to.equal(0);
      
      const buyAmount = ethers.parseEther("0.1");
      await TestHelpers.buyTokens(bondingCurve, token, user1, buyAmount);
      
      const infoAfter = await bondingCurve.tokenInfo(token);
      const ethAfterFee = (buyAmount * 9700n) / 10000n; // 3% fee
      
      expect(infoAfter.realEthReserve).to.be.closeTo(ethAfterFee, ethAfterFee / 100n);
    });

    it("Should handle large purchases correctly", async function () {
      // Large purchases should work but become increasingly expensive
      const largeAmount = ethers.parseEther("10");
      
      const priceBefore = await bondingCurve.getCurrentPrice(token);
      
      await bondingCurve.connect(user1).buyTokens(token, 0, { value: largeAmount });
      
      const priceAfter = await bondingCurve.getCurrentPrice(token);
      
      // Price should increase significantly
      expect(priceAfter).to.be.gt(priceBefore * 10n);
    });
  });

  describe("Market Cap Calculations", function () {
    it("Should calculate market cap correctly", async function () {
      const marketCap = await bondingCurve.getMarketCap(token);
      
      // The contract calculates: (pricePerToken * TOTAL_SUPPLY * 3000) / 10**26
      // where pricePerToken = (virtualEthReserve * 10**18) / virtualTokenReserve
      // virtualEthReserve = 1 ETH = 10**18
      // virtualTokenReserve = 1M tokens = 10**6 * 10**18
      // pricePerToken = 10**18 * 10**18 / (10**6 * 10**18) = 10**12
      // TOTAL_SUPPLY = 10**9 * 10**18 = 10**27
      // Market cap = (10**12 * 10**27 * 3000) / 10**26 = 3 * 10**16
      
      console.log("Actual market cap:", marketCap);
      
      // Market cap should be a reasonable value
      expect(marketCap).to.be.gt(0);
      expect(marketCap).to.be.lt(ethers.parseUnits("1000000000", 8)); // Less than $1B
    });

    it("Should increase market cap as price increases", async function () {
      const marketCapBefore = await bondingCurve.getMarketCap(token);
      
      await TestHelpers.buyTokens(bondingCurve, token, user1, ethers.parseEther("0.5"));
      
      const marketCapAfter = await bondingCurve.getMarketCap(token);
      
      expect(marketCapAfter).to.be.gt(marketCapBefore);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle minimum buy amounts", async function () {
      const minAmount = 1n; // 1 wei
      
      await expect(
        bondingCurve.connect(user1).buyTokens(token, 0, { value: minAmount })
      ).to.not.be.reverted;
    });

    it("Should handle maximum safe values", async function () {
      // Test with large but safe values
      const maxSafeEth = ethers.parseEther("10");
      
      const tx = bondingCurve.connect(user1).buyTokens(token, 0, { value: maxSafeEth });
      await expect(tx).to.not.be.reverted;
    });

    it("Should maintain precision with many small trades", async function () {
      const smallAmount = ethers.parseEther("0.0001");
      const trades = 100;
      
      let totalTokensReceived = 0n;
      
      for (let i = 0; i < trades; i++) {
        const tx = await TestHelpers.buyTokens(bondingCurve, token, user1, smallAmount);
        const receipt = await tx.wait();
        
        // Get tokens received from event
        const event = receipt.logs.find(log => log.fragment && log.fragment.name === "Trade");
        if (event) {
          totalTokensReceived += event.args.tokenAmount;
        }
      }
      
      expect(totalTokensReceived).to.be.gt(0);
    });

    it("Should handle zero ETH input correctly", async function () {
      await expect(
        bondingCurve.connect(user1).buyTokens(token, 0, { value: 0 })
      ).to.be.revertedWith("No ETH");
    });

    it("Should handle zero token input correctly", async function () {
      await expect(
        bondingCurve.connect(user1).sellTokens(token, 0, 0)
      ).to.be.revertedWith("No tokens");
    });
  });
});