const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenFactoryV2", function () {
  let factory;
  let bondingCurve;
  let tokenImplementation;
  let owner;
  let user1;
  let user2;
  let platformToken;

  const CREATION_FEE = ethers.parseEther("0.001");
  const FREE_CREATION_THRESHOLD = ethers.parseEther("1000000"); // 1M tokens

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy token implementation
    const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
    tokenImplementation = await LaunchpadTokenV2.deploy();

    // Deploy factory
    const TokenFactoryV2 = await ethers.getContractFactory("TokenFactoryV2");
    factory = await TokenFactoryV2.deploy(await tokenImplementation.getAddress());

    // Deploy mock bonding curve (simplified for testing)
    const MockBondingCurve = await ethers.getContractFactory("ConstantProductCurveV2");
    const mockPriceFeed = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70"; // Base mainnet feed
    bondingCurve = await MockBondingCurve.deploy(owner.address, mockPriceFeed);

    // Deploy platform token for testing free creation
    const MockToken = await ethers.getContractFactory("LaunchpadTokenV2");
    platformToken = await MockToken.deploy();
    await platformToken.initialize("Platform Token", "PLATFORM", owner.address, owner.address);

    // Configure factory
    await factory.setBondingCurve(await bondingCurve.getAddress());
    await factory.setCreationFee(CREATION_FEE);
    await factory.setPlatformToken(await platformToken.getAddress());
  });

  describe("Token Creation", function () {
    it("Should create token with valid parameters", async function () {
      const tx = await factory.connect(user1).createToken(
        "Test Token",
        "TEST",
        "https://example.com/image.png",
        "A test token",
        { value: CREATION_FEE }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "TokenCreated"
      );

      expect(event).to.not.be.undefined;
      
      const tokenAddress = event.args.token;
      expect(await factory.isValidToken(tokenAddress)).to.be.true;
      expect(await factory.totalTokensCreated()).to.equal(1);
    });

    it("Should predict token address correctly", async function () {
      const predictedAddress = await factory.predictTokenAddress(
        user1.address,
        "Predicted Token",
        "PRED"
      );

      const tx = await factory.connect(user1).createToken(
        "Predicted Token",
        "PRED",
        "https://example.com/pred.png",
        "A predicted token",
        { value: CREATION_FEE }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "TokenCreated"
      );

      expect(event.args.token).to.equal(predictedAddress);
    });

    it("Should enforce anti-spam measures", async function () {
      // Create max tokens per block
      for (let i = 0; i < 3; i++) {
        await factory.connect(user1).createToken(
          `Token ${i}`,
          `TK${i}`,
          "https://example.com/image.png",
          "Test token",
          { value: CREATION_FEE }
        );
      }

      // Fourth creation should fail
      await expect(
        factory.connect(user1).createToken(
          "Token 4",
          "TK4",
          "https://example.com/image.png",
          "Test token",
          { value: CREATION_FEE }
        )
      ).to.be.revertedWith("Max creations per block exceeded");
    });

    it("Should allow free creation for platform token holders", async function () {
      // Transfer platform tokens to user2
      await platformToken.transfer(user2.address, FREE_CREATION_THRESHOLD);

      // Check creation fee is 0
      expect(await factory.getCreationFee(user2.address)).to.equal(0);

      // Create token without fee
      await factory.connect(user2).createToken(
        "Free Token",
        "FREE",
        "https://example.com/free.png",
        "A free token",
        { value: 0 }
      );

      expect(await factory.totalTokensCreated()).to.equal(1);
    });

    it("Should prevent duplicate names in same block", async function () {
      await factory.connect(user1).createToken(
        "Duplicate Token",
        "DUP1",
        "https://example.com/dup1.png",
        "First token",
        { value: CREATION_FEE }
      );

      await expect(
        factory.connect(user2).createToken(
          "Duplicate Token",
          "DUP2",
          "https://example.com/dup2.png",
          "Second token",
          { value: CREATION_FEE }
        )
      ).to.be.revertedWith("Name already used in this block");
    });

    it("Should validate token parameters", async function () {
      // Test invalid name length
      await expect(
        factory.connect(user1).createToken(
          "This is a very long token name that exceeds the maximum allowed length",
          "LONG",
          "https://example.com/long.png",
          "Long name token",
          { value: CREATION_FEE }
        )
      ).to.be.revertedWith("Invalid name");

      // Test invalid symbol
      await expect(
        factory.connect(user1).createToken(
          "Special Symbol",
          "SP@CE",
          "https://example.com/special.png",
          "Special token",
          { value: CREATION_FEE }
        )
      ).to.be.revertedWith("Symbol must be alphanumeric");

      // Test empty name
      await expect(
        factory.connect(user1).createToken(
          "",
          "EMPTY",
          "https://example.com/empty.png",
          "Empty name",
          { value: CREATION_FEE }
        )
      ).to.be.revertedWith("Invalid name");
    });

    it("Should refund excess ETH", async function () {
      const excessFee = ethers.parseEther("0.01");
      const balanceBefore = await ethers.provider.getBalance(user1.address);

      const tx = await factory.connect(user1).createToken(
        "Refund Token",
        "REFUND",
        "https://example.com/refund.png",
        "Refund test",
        { value: excessFee }
      );

      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      // User should have paid only creation fee + gas
      const expectedBalance = balanceBefore - CREATION_FEE - gasUsed;
      expect(balanceAfter).to.be.closeTo(expectedBalance, ethers.parseEther("0.0001"));
    });
  });

  describe("Token Registry", function () {
    beforeEach(async function () {
      // Create some test tokens
      for (let i = 0; i < 5; i++) {
        await factory.connect(user1).createToken(
          `Token ${i}`,
          `TK${i}`,
          `https://example.com/token${i}.png`,
          `Test token ${i}`,
          { value: CREATION_FEE }
        );
      }
    });

    it("Should track tokens by creator", async function () {
      const creatorTokens = await factory.getTokensByCreator(user1.address);
      expect(creatorTokens.length).to.equal(5);
    });

    it("Should paginate tokens correctly", async function () {
      const page1 = await factory.getTokensPaginated(0, 3);
      expect(page1.length).to.equal(3);

      const page2 = await factory.getTokensPaginated(3, 3);
      expect(page2.length).to.equal(2);
    });

    it("Should categorize tokens", async function () {
      const token = await factory.tokenByIndex(0);
      
      // Initially NEW
      expect(await factory.tokenCategory(token)).to.equal(0); // NEW

      // Update to TRENDING
      await factory.updateTokenCategory(token, 1); // TRENDING
      expect(await factory.tokenCategory(token)).to.equal(1);
    });

    it("Should get tokens by category", async function () {
      // Update some tokens to different categories
      const token1 = await factory.tokenByIndex(0);
      const token2 = await factory.tokenByIndex(1);
      
      await factory.updateTokenCategory(token1, 1); // TRENDING
      await factory.updateTokenCategory(token2, 1); // TRENDING

      const trendingTokens = await factory.getTokensByCategory(1, 0, 10);
      expect(trendingTokens.length).to.equal(2);
      expect(trendingTokens).to.include(token1);
      expect(trendingTokens).to.include(token2);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update creation fee", async function () {
      const newFee = ethers.parseEther("0.002");
      await factory.setCreationFee(newFee);
      expect(await factory.creationFee()).to.equal(newFee);
    });

    it("Should allow owner to update platform token", async function () {
      const newToken = ethers.Wallet.createRandom().address;
      await factory.setPlatformToken(newToken);
      expect(await factory.platformToken()).to.equal(newToken);
    });

    it("Should allow owner to withdraw fees", async function () {
      // Create a token to generate fees
      await factory.connect(user1).createToken(
        "Fee Token",
        "FEE",
        "https://example.com/fee.png",
        "Fee test",
        { value: CREATION_FEE }
      );

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      
      const tx = await factory.withdrawFees();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const balanceAfter = await ethers.provider.getBalance(owner.address);
      expect(balanceAfter).to.be.closeTo(
        balanceBefore + CREATION_FEE - gasUsed,
        ethers.parseEther("0.0001")
      );
    });

    it("Should prevent non-owners from admin functions", async function () {
      await expect(
        factory.connect(user1).setCreationFee(ethers.parseEther("0.01"))
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");

      await expect(
        factory.connect(user1).withdrawFees()
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });
  });
});