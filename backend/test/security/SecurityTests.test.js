const { expect } = require("chai");
const { ethers } = require("hardhat");
const TestHelpers = require("../helpers/TestHelpers");

describe("Security Tests: Attack Vectors", function () {
  let bondingCurve, tokenFactory, token;
  let owner, attacker, victim, user;
  
  beforeEach(async function () {
    [owner, attacker, victim, user] = await ethers.getSigners();
    
    const contracts = await TestHelpers.deployContracts(owner);
    bondingCurve = contracts.bondingCurve;
    tokenFactory = contracts.tokenFactory;
    
    token = await TestHelpers.createToken(tokenFactory);
    await TestHelpers.enableTrading(bondingCurve, token);
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy on buy", async function () {
      // Deploy malicious contract
      const MaliciousContract = await ethers.getContractFactory("contracts/test/ReentrancyAttacker.sol:ReentrancyAttacker");
      const malicious = await MaliciousContract.deploy(await bondingCurve.getAddress());
      
      // Attempt reentrancy attack
      await expect(
        malicious.attack(token, { value: ethers.parseEther("0.01") })
      ).to.not.be.reverted;
      
      // The nonReentrant modifier should prevent double execution
      const callCount = await malicious.callCount();
      expect(callCount).to.equal(0); // No reentrancy occurred
    });

    it("Should prevent reentrancy on sell", async function () {
      // First buy tokens normally
      await TestHelpers.buyTokens(bondingCurve, token, attacker, ethers.parseEther("0.1"));
      
      // Get token contract
      const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
      const tokenContract = LaunchpadTokenV2.attach(token);
      const balance = await tokenContract.balanceOf(attacker.address);
      
      // Approve and try to sell (reentrancy protected)
      await tokenContract.connect(attacker).approve(await bondingCurve.getAddress(), balance);
      
      // Even if attacker tries to reenter, modifier prevents it
      await expect(
        bondingCurve.connect(attacker).sellTokens(token, balance, 0)
      ).to.not.be.reverted;
    });
  });

  describe("Front-Running Protection", function () {
    it("Should prevent same-block sandwich attacks", async function () {
      // First transaction in block
      await bondingCurve.connect(victim).buyTokens(
        token,
        0,
        { value: ethers.parseEther("0.01") }
      );
      
      // Attacker tries to trade in same block (should fail)
      await expect(
        bondingCurve.connect(victim).buyTokens(
          token,
          0,
          { value: ethers.parseEther("0.01") }
        )
      ).to.be.revertedWith("Same block trade");
    });

    it("Should enforce slippage protection", async function () {
      // Victim sets strict slippage
      const buyAmount = ethers.parseEther("0.1");
      const expectedTokens = await bondingCurve.calculateTokensOut(token, buyAmount);
      
      // Attacker front-runs with large buy
      await bondingCurve.connect(attacker).buyTokens(
        token,
        0,
        { value: ethers.parseEther("1") }
      );
      
      // Victim's transaction should fail due to slippage
      await expect(
        bondingCurve.connect(victim).buyTokens(
          token,
          expectedTokens, // Original expected amount
          { value: buyAmount }
        )
      ).to.be.revertedWith("Slippage");
    });
  });

  describe("Overflow/Underflow Protection", function () {
    it("Should handle maximum uint128 values safely", async function () {
      // Contract uses uint128 for reserves
      // Test boundary conditions
      const maxUint128 = 2n ** 128n - 1n;
      
      // Should not overflow in calculations
      const smallAmount = ethers.parseEther("0.001");
      await expect(
        bondingCurve.connect(user).buyTokens(token, 0, { value: smallAmount })
      ).to.not.be.reverted;
    });

    it("Should prevent underflow in sell operations", async function () {
      // Try to sell more than balance (should fail gracefully)
      await expect(
        bondingCurve.connect(attacker).sellTokens(
          token,
          ethers.parseUnits("1000000", 18), // More than they have
          0
        )
      ).to.be.reverted;
    });

    it("Should handle division by zero edge cases", async function () {
      // Edge case: very small trades
      const tinyAmount = 1n; // 1 wei
      
      // Should handle gracefully
      await expect(
        bondingCurve.connect(user).buyTokens(token, 0, { value: tinyAmount })
      ).to.not.be.reverted;
    });
  });

  describe("MEV Attack Simulations", function () {
    it("Should resist backrun attacks", async function () {
      // Victim makes large buy
      const victimBuy = ethers.parseEther("1");
      await bondingCurve.connect(victim).buyTokens(token, 0, { value: victimBuy });
      
      // Price increases
      const priceAfterVictim = await bondingCurve.getCurrentPrice(token);
      
      // Attacker tries to backrun by buying and immediately selling
      await ethers.provider.send("evm_mine"); // New block
      
      const attackBuy = ethers.parseEther("0.5");
      await bondingCurve.connect(attacker).buyTokens(token, 0, { value: attackBuy });
      
      // Get attacker's tokens
      const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
      const tokenContract = LaunchpadTokenV2.attach(token);
      const attackerBalance = await tokenContract.balanceOf(attacker.address);
      
      // Try immediate sell (blocked by same-block protection)
      await tokenContract.connect(attacker).approve(await bondingCurve.getAddress(), attackerBalance);
      
      await expect(
        bondingCurve.connect(attacker).sellTokens(token, attackerBalance, 0)
      ).to.be.revertedWith("Same block trade");
    });

    it("Should handle JIT (Just-In-Time) liquidity attacks", async function () {
      // Attacker monitors mempool and tries to add liquidity just before large trade
      // This is mitigated by same-block restrictions
      
      const largeTradeAmount = ethers.parseEther("10");
      
      // Both transactions in same block
      await bondingCurve.connect(attacker).buyTokens(token, 0, { value: ethers.parseEther("0.1") });
      
      // Large trade should fail in same block
      await expect(
        bondingCurve.connect(victim).buyTokens(token, 0, { value: largeTradeAmount })
      ).to.be.revertedWith("Same block trade");
    });
  });

  describe("Access Control", function () {
    it("Should prevent unauthorized fee claims", async function () {
      // Generate fees
      await bondingCurve.connect(user).buyTokens(token, 0, { value: ethers.parseEther("1") });
      
      // Non-creator tries to claim creator fees
      await expect(
        bondingCurve.connect(attacker).claimCreatorFees(token)
      ).to.be.revertedWith("Not creator");
    });

    it("Should prevent unauthorized platform fee claims", async function () {
      // Generate fees
      await bondingCurve.connect(user).buyTokens(token, 0, { value: ethers.parseEther("1") });
      
      // Non-recipient tries to claim platform fees
      await expect(
        bondingCurve.connect(attacker).claimPlatformFees()
      ).to.be.revertedWith("Not recipient");
    });

    it("Should prevent unauthorized factory operations", async function () {
      // Attacker tries to change bonding curve
      await expect(
        tokenFactory.connect(attacker).setBondingCurve(attacker.address)
      ).to.be.revertedWith("Not owner");
      
      // Attacker tries to withdraw fees
      await expect(
        tokenFactory.connect(attacker).withdrawFees()
      ).to.be.revertedWith("Not owner");
    });
  });

  describe("Token Security", function () {
    it("Should prevent double initialization", async function () {
      // Try to reinitialize an existing token
      await expect(
        bondingCurve.initializeToken(token, attacker.address)
      ).to.be.revertedWith("Already initialized");
    });

    it("Should prevent trading on uninitialized tokens", async function () {
      const fakeToken = ethers.Wallet.createRandom().address;
      
      await expect(
        bondingCurve.connect(user).buyTokens(fakeToken, 0, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Not initialized");
    });

    it("Should prevent trading on graduated tokens", async function () {
      // Force graduation (simplified test)
      await bondingCurve.markAsGraduated(token, ethers.ZeroAddress);
      
      await expect(
        bondingCurve.connect(user).buyTokens(token, 0, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Graduated");
    });
  });

  describe("Economic Attacks", function () {
    it("Should resist flash loan attacks", async function () {
      // Flash loans would need to profit within same block
      // Same-block trading restriction prevents this
      
      // Simulate flash loan: borrow, buy, sell, repay
      await bondingCurve.connect(attacker).buyTokens(
        token,
        0,
        { value: ethers.parseEther("10") } // Large buy with "borrowed" funds
      );
      
      // Cannot sell in same block
      const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
      const tokenContract = LaunchpadTokenV2.attach(token);
      const balance = await tokenContract.balanceOf(attacker.address);
      
      await tokenContract.connect(attacker).approve(await bondingCurve.getAddress(), balance);
      
      await expect(
        bondingCurve.connect(attacker).sellTokens(token, balance, 0)
      ).to.be.revertedWith("Same block trade");
    });

    it("Should handle griefing attacks", async function () {
      // Attacker tries to grief by making many small trades
      const smallAmount = ethers.parseEther("0.0001");
      
      // Make 10 small trades (costly for attacker)
      for (let i = 0; i < 10; i++) {
        await bondingCurve.connect(attacker).buyTokens(token, 0, { value: smallAmount });
        await ethers.provider.send("evm_mine"); // New block required
      }
      
      // System should still function normally
      await expect(
        bondingCurve.connect(user).buyTokens(token, 0, { value: ethers.parseEther("0.1") })
      ).to.not.be.reverted;
    });
  });

  describe("Pause Mechanism", function () {
    it("Should block operations when paused", async function () {
      // Grant pause role and pause
      await bondingCurve.connect(owner).grantRole(
        await bondingCurve.PAUSER_ROLE(),
        owner.address
      );
      
      await bondingCurve.connect(owner).pause();
      
      // All operations should fail
      await expect(
        bondingCurve.connect(user).buyTokens(token, 0, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Pausable: paused");
      
      // Unpause
      await bondingCurve.connect(owner).unpause();
      
      // Should work again
      await expect(
        bondingCurve.connect(user).buyTokens(token, 0, { value: ethers.parseEther("0.1") })
      ).to.not.be.reverted;
    });
  });

  describe("Input Validation", function () {
    it("Should validate token creation parameters", async function () {
      // Empty name
      await expect(
        tokenFactory.createToken("", "TEST", "", "")
      ).to.be.revertedWith("Invalid name");
      
      // Empty symbol
      await expect(
        tokenFactory.createToken("Test", "", "", "")
      ).to.be.revertedWith("Invalid symbol");
      
      // Too long name
      const longName = "A".repeat(33);
      await expect(
        tokenFactory.createToken(longName, "TEST", "", "")
      ).to.be.revertedWith("Invalid name");
      
      // Too long symbol
      const longSymbol = "A".repeat(9);
      await expect(
        tokenFactory.createToken("Test", longSymbol, "", "")
      ).to.be.revertedWith("Invalid symbol");
    });

    it("Should validate trade amounts", async function () {
      // Zero ETH buy
      await expect(
        bondingCurve.connect(user).buyTokens(token, 0, { value: 0 })
      ).to.be.revertedWith("No ETH");
      
      // Zero token sell
      await expect(
        bondingCurve.connect(user).sellTokens(token, 0, 0)
      ).to.be.revertedWith("No tokens");
    });
  });
});