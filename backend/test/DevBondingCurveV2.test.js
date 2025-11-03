const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DevBondingCurveV2", function () {
  let factory;
  let owner;
  let user1;
  let user2;
  let tokenAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const DevBondingCurveV2 = await ethers.getContractFactory("DevBondingCurveV2");
    factory = await DevBondingCurveV2.deploy();
    await factory.deployed();
  });

  describe("Token Creation", function () {
    it("Should create a token without dev buy", async function () {
      const creationFee = ethers.utils.parseEther("0.001");
      
      const tx = await factory.connect(user1).createToken(
        "Test Token",
        "TEST",
        "A test token",
        "https://test.com/image.png",
        "https://twitter.com/test",
        "https://t.me/test",
        "https://test.com",
        "meme",
        0, // No dev buy
        { value: creationFee }
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "TokenCreated");
      tokenAddress = event.args.token;
      
      expect(tokenAddress).to.not.equal(ethers.constants.AddressZero);
      
      // Check token info
      const tokenInfo = await factory.tokenInfo(tokenAddress);
      expect(tokenInfo.creator).to.equal(user1.address);
      expect(tokenInfo.realEthReserve).to.equal(0);
      expect(tokenInfo.realTokenReserve).to.equal(ethers.utils.parseEther("800000000"));
    });
    
    it("Should create a token with dev buy", async function () {
      const creationFee = ethers.utils.parseEther("0.001");
      const devBuyAmount = ethers.utils.parseEther("0.1");
      
      const tx = await factory.connect(user1).createToken(
        "Dev Token",
        "DEV",
        "Token with dev buy",
        "",
        "",
        "",
        "",
        "meme",
        devBuyAmount,
        { value: creationFee.add(devBuyAmount) }
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "TokenCreated");
      tokenAddress = event.args.token;
      
      // Check that dev buy was executed
      const tokenInfo = await factory.tokenInfo(tokenAddress);
      expect(tokenInfo.realEthReserve).to.be.gt(0);
      expect(tokenInfo.realTokenReserve).to.be.lt(ethers.utils.parseEther("800000000"));
      
      // Check creator received tokens
      const token = await ethers.getContractAt("LaunchpadToken", tokenAddress);
      const creatorBalance = await token.balanceOf(user1.address);
      expect(creatorBalance).to.be.gt(0);
    });
  });

  describe("Buy and Sell Operations", function () {
    beforeEach(async function () {
      // Create a token first
      const creationFee = ethers.utils.parseEther("0.001");
      const tx = await factory.connect(user1).createToken(
        "Trade Token",
        "TRADE",
        "Token for trading",
        "",
        "",
        "",
        "",
        "meme",
        0,
        { value: creationFee }
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "TokenCreated");
      tokenAddress = event.args.token;
    });
    
    it("Should buy tokens correctly", async function () {
      const buyAmount = ethers.utils.parseEther("0.1");
      
      // Calculate expected tokens
      const expectedTokens = await factory.calculateBuyReturn(tokenAddress, buyAmount);
      
      // Buy tokens
      await factory.connect(user2).buyTokens(
        tokenAddress,
        0, // No minimum for test
        { value: buyAmount }
      );
      
      // Check balance
      const token = await ethers.getContractAt("LaunchpadToken", tokenAddress);
      const balance = await token.balanceOf(user2.address);
      
      // Allow for fees
      expect(balance).to.be.closeTo(expectedTokens, ethers.utils.parseEther("1000"));
    });
    
    it("Should sell tokens correctly", async function () {
      // First buy some tokens
      const buyAmount = ethers.utils.parseEther("0.5");
      await factory.connect(user2).buyTokens(
        tokenAddress,
        0,
        { value: buyAmount }
      );
      
      const token = await ethers.getContractAt("LaunchpadToken", tokenAddress);
      const balance = await token.balanceOf(user2.address);
      
      // Approve factory to spend tokens
      await token.connect(user2).approve(factory.address, balance);
      
      // Calculate expected ETH
      const expectedEth = await factory.calculateSellReturn(tokenAddress, balance);
      
      // Track ETH balance before
      const ethBefore = await user2.getBalance();
      
      // Sell all tokens
      const tx = await factory.connect(user2).sellTokens(
        tokenAddress,
        balance,
        0 // No minimum for test
      );
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      
      // Check ETH received
      const ethAfter = await user2.getBalance();
      const ethReceived = ethAfter.add(gasUsed).sub(ethBefore);
      
      // Allow for fees and rounding
      expect(ethReceived).to.be.closeTo(expectedEth, ethers.utils.parseEther("0.01"));
      
      // Check token balance is 0
      const finalBalance = await token.balanceOf(user2.address);
      expect(finalBalance).to.equal(0);
    });
    
    it("Should maintain constant product during trades", async function () {
      // Get initial k
      const initialInfo = await factory.tokenInfo(tokenAddress);
      const initialK = initialInfo.k;
      
      // Buy tokens
      await factory.connect(user2).buyTokens(
        tokenAddress,
        0,
        { value: ethers.utils.parseEther("0.1") }
      );
      
      // Check k is unchanged
      const afterBuyInfo = await factory.tokenInfo(tokenAddress);
      expect(afterBuyInfo.k).to.equal(initialK);
      
      // Sell some tokens
      const token = await ethers.getContractAt("LaunchpadToken", tokenAddress);
      const balance = await token.balanceOf(user2.address);
      const sellAmount = balance.div(2);
      
      await token.connect(user2).approve(factory.address, sellAmount);
      await factory.connect(user2).sellTokens(tokenAddress, sellAmount, 0);
      
      // Check k is still unchanged
      const afterSellInfo = await factory.tokenInfo(tokenAddress);
      expect(afterSellInfo.k).to.equal(initialK);
    });
  });

  describe("Liquidity Tests", function () {
    it("Should handle large buys without breaking", async function () {
      // Create token with dev buy for initial liquidity
      const creationFee = ethers.utils.parseEther("0.001");
      const devBuy = ethers.utils.parseEther("1");
      
      const tx = await factory.connect(user1).createToken(
        "Liquid Token",
        "LIQ",
        "High liquidity token",
        "",
        "",
        "",
        "",
        "meme",
        devBuy,
        { value: creationFee.add(devBuy) }
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "TokenCreated");
      tokenAddress = event.args.token;
      
      // Try large buy
      const largeBuy = ethers.utils.parseEther("5");
      await factory.connect(user2).buyTokens(
        tokenAddress,
        0,
        { value: largeBuy }
      );
      
      // Should be able to sell back
      const token = await ethers.getContractAt("LaunchpadToken", tokenAddress);
      const balance = await token.balanceOf(user2.address);
      
      await token.connect(user2).approve(factory.address, balance);
      
      // This should not revert
      await expect(
        factory.connect(user2).sellTokens(tokenAddress, balance, 0)
      ).to.not.be.reverted;
    });
    
    it("Should calculate prices correctly", async function () {
      // Create token
      const creationFee = ethers.utils.parseEther("0.001");
      const tx = await factory.connect(user1).createToken(
        "Price Token",
        "PRICE",
        "Token for price testing",
        "",
        "",
        "",
        "",
        "meme",
        0,
        { value: creationFee }
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "TokenCreated");
      tokenAddress = event.args.token;
      
      // Get initial price
      const initialPrice = await factory.getTokenPrice(tokenAddress);
      
      // Buy tokens (should increase price)
      await factory.connect(user2).buyTokens(
        tokenAddress,
        0,
        { value: ethers.utils.parseEther("0.1") }
      );
      
      const priceAfterBuy = await factory.getTokenPrice(tokenAddress);
      expect(priceAfterBuy).to.be.gt(initialPrice);
      
      // Sell tokens (should decrease price)
      const token = await ethers.getContractAt("LaunchpadToken", tokenAddress);
      const balance = await token.balanceOf(user2.address);
      
      await token.connect(user2).approve(factory.address, balance.div(2));
      await factory.connect(user2).sellTokens(tokenAddress, balance.div(2), 0);
      
      const priceAfterSell = await factory.getTokenPrice(tokenAddress);
      expect(priceAfterSell).to.be.lt(priceAfterBuy);
      expect(priceAfterSell).to.be.gt(initialPrice);
    });
  });

  describe("Fee Management", function () {
    it("Should collect platform and creator fees", async function () {
      // Create token
      const creationFee = ethers.utils.parseEther("0.001");
      const tx = await factory.connect(user1).createToken(
        "Fee Token",
        "FEE",
        "Token for fee testing",
        "",
        "",
        "",
        "",
        "meme",
        0,
        { value: creationFee }
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "TokenCreated");
      tokenAddress = event.args.token;
      
      // Buy tokens (generates fees)
      const buyAmount = ethers.utils.parseEther("1");
      await factory.connect(user2).buyTokens(
        tokenAddress,
        0,
        { value: buyAmount }
      );
      
      // Check fees accumulated
      const tokenInfo = await factory.tokenInfo(tokenAddress);
      expect(tokenInfo.platformFees).to.be.gt(0);
      expect(tokenInfo.creatorFees).to.be.gt(0);
      
      // Creator should be able to claim fees
      const creatorBalanceBefore = await user1.getBalance();
      await factory.connect(user1).claimCreatorFees(tokenAddress);
      const creatorBalanceAfter = await user1.getBalance();
      
      expect(creatorBalanceAfter).to.be.gt(creatorBalanceBefore);
    });
  });
});