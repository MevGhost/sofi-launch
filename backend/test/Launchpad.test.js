const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Base Launchpad", function () {
  let bondingCurve;
  let tokenFactory;
  let graduationManager;
  let owner;
  let user1;
  let user2;
  let feeRecipient;

  const INITIAL_VIRTUAL_ETH_RESERVE = ethers.parseEther("1");
  const INITIAL_VIRTUAL_TOKEN_RESERVE = ethers.parseEther("1000000");
  const TOTAL_SUPPLY = ethers.parseEther("1000000000");
  const BONDING_CURVE_SUPPLY = ethers.parseEther("800000000");
  const DEX_SUPPLY = ethers.parseEther("200000000");
  const GRADUATION_THRESHOLD = ethers.parseEther("69000");

  beforeEach(async function () {
    [owner, user1, user2, feeRecipient] = await ethers.getSigners();

    // Deploy contracts
    const ConstantProductCurve = await ethers.getContractFactory("ConstantProductCurve");
    bondingCurve = await ConstantProductCurve.deploy(feeRecipient.address);

    const TokenFactory = await ethers.getContractFactory("TokenFactory");
    tokenFactory = await TokenFactory.deploy();

    const GraduationManager = await ethers.getContractFactory("GraduationManager");
    const UNISWAP_V3_FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";
    const POSITION_MANAGER = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
    const WETH = "0x4200000000000000000000000000000000000006";
    
    graduationManager = await GraduationManager.deploy(
      UNISWAP_V3_FACTORY,
      POSITION_MANAGER,
      WETH
    );

    // Configure contracts
    await bondingCurve.setGraduationManager(await graduationManager.getAddress());
    await tokenFactory.setBondingCurve(await bondingCurve.getAddress());
    await tokenFactory.setGraduationManager(await graduationManager.getAddress());
    await graduationManager.setTokenFactory(await tokenFactory.getAddress());
    await graduationManager.setBondingCurve(await bondingCurve.getAddress());
  });

  describe("Token Creation", function () {
    it("Should create a new token with correct parameters", async function () {
      const tx = await tokenFactory.connect(user1).createToken(
        "Test Token",
        "TEST",
        "A test token for the launchpad",
        "https://example.com/image.png"
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "TokenCreated"
      );

      expect(event).to.not.be.undefined;
      const tokenAddress = event.args.token;

      // Verify token metadata
      const metadata = await tokenFactory.getTokenMetadata(tokenAddress);
      expect(metadata.name).to.equal("Test Token");
      expect(metadata.symbol).to.equal("TEST");
      expect(metadata.creator).to.equal(user1.address);
    });

    it("Should prevent duplicate symbol creation", async function () {
      await tokenFactory.connect(user1).createToken(
        "Test Token",
        "TEST",
        "A test token",
        "https://example.com/image.png"
      );

      await expect(
        tokenFactory.connect(user2).createToken(
          "Another Token",
          "TEST",
          "Another test token",
          "https://example.com/image2.png"
        )
      ).to.be.revertedWith("Symbol already exists");
    });
  });

  describe("Bonding Curve Trading", function () {
    let tokenAddress;

    beforeEach(async function () {
      const tx = await tokenFactory.connect(user1).createToken(
        "Trade Token",
        "TRADE",
        "Token for trading tests",
        "https://example.com/trade.png"
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "TokenCreated"
      );
      tokenAddress = event.args.token;
    });

    it("Should allow buying tokens", async function () {
      const ethAmount = ethers.parseEther("0.1");
      const minTokensOut = 0;

      const tokensBefore = await bondingCurve.calculateTokensOut(tokenAddress, ethAmount);

      await bondingCurve.connect(user2).buyTokens(
        tokenAddress,
        minTokensOut,
        { value: ethAmount }
      );

      const token = await ethers.getContractAt("LaunchpadToken", tokenAddress);
      const balance = await token.balanceOf(user2.address);
      
      expect(balance).to.be.gt(0);
    });

    it("Should apply fees correctly", async function () {
      const ethAmount = ethers.parseEther("1");
      const platformFee = (ethAmount * 1n) / 100n;
      const creatorFee = (ethAmount * 1n) / 100n;
      const expectedFees = platformFee + creatorFee;

      const feeRecipientBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);

      await bondingCurve.connect(user2).buyTokens(
        tokenAddress,
        0,
        { value: ethAmount }
      );

      const totalPlatformFees = await bondingCurve.totalPlatformFees();
      expect(totalPlatformFees).to.equal(platformFee);
    });

    it("Should allow selling tokens", async function () {
      const ethAmount = ethers.parseEther("1");
      
      // First buy tokens
      await bondingCurve.connect(user2).buyTokens(
        tokenAddress,
        0,
        { value: ethAmount }
      );

      const token = await ethers.getContractAt("LaunchpadToken", tokenAddress);
      const balance = await token.balanceOf(user2.address);
      
      // Approve bonding curve to spend tokens
      await token.connect(user2).approve(await bondingCurve.getAddress(), balance);

      // Sell half of the tokens
      const sellAmount = balance / 2n;
      const minEthOut = 0;

      const user2BalanceBefore = await ethers.provider.getBalance(user2.address);

      const tx = await bondingCurve.connect(user2).sellTokens(
        tokenAddress,
        sellAmount,
        minEthOut
      );

      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const user2BalanceAfter = await ethers.provider.getBalance(user2.address);
      expect(user2BalanceAfter).to.be.gt(user2BalanceBefore - gasUsed);
    });
  });

  describe("Market Cap and Graduation", function () {
    let tokenAddress;

    beforeEach(async function () {
      const tx = await tokenFactory.connect(user1).createToken(
        "Grad Token",
        "GRAD",
        "Token for graduation tests",
        "https://example.com/grad.png"
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "TokenCreated"
      );
      tokenAddress = event.args.token;
    });

    it("Should calculate market cap correctly", async function () {
      const marketCap = await bondingCurve.getMarketCap(tokenAddress);
      expect(marketCap).to.be.gt(0);
    });

    it("Should not graduate before threshold", async function () {
      const shouldGraduate = await bondingCurve.shouldGraduate(tokenAddress);
      expect(shouldGraduate).to.be.false;
    });
  });

  describe("Fee Claims", function () {
    let tokenAddress;

    beforeEach(async function () {
      const tx = await tokenFactory.connect(user1).createToken(
        "Fee Token",
        "FEE",
        "Token for fee tests",
        "https://example.com/fee.png"
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "TokenCreated"
      );
      tokenAddress = event.args.token;

      // Make some trades to generate fees
      await bondingCurve.connect(user2).buyTokens(
        tokenAddress,
        0,
        { value: ethers.parseEther("1") }
      );
    });

    it("Should allow creator to claim fees", async function () {
      const creatorBalanceBefore = await ethers.provider.getBalance(user1.address);
      
      const tx = await bondingCurve.connect(user1).claimCreatorFees(tokenAddress);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const creatorBalanceAfter = await ethers.provider.getBalance(user1.address);
      expect(creatorBalanceAfter).to.be.gt(creatorBalanceBefore - gasUsed);
    });

    it("Should allow platform to claim fees", async function () {
      const feeBalance = await ethers.provider.getBalance(feeRecipient.address);
      
      await bondingCurve.connect(feeRecipient).claimPlatformFees();

      const newBalance = await ethers.provider.getBalance(feeRecipient.address);
      expect(newBalance).to.be.gt(feeBalance);
    });
  });
});