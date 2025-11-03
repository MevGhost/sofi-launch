const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

class TestHelpers {
  static async deployContracts(owner) {
    // Deploy token implementation
    const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
    const tokenImpl = await LaunchpadTokenV2.deploy();
    
    // Deploy optimized contracts
    const OptimizedBondingCurve = await ethers.getContractFactory("OptimizedBondingCurve");
    const bondingCurve = await OptimizedBondingCurve.deploy(
      owner.address,
      "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", // ETH/USD feed
      "0x2626664c2603336E57B271c5C0b26F421741e481", // Swap router
      "0x4200000000000000000000000000000000000006"  // WETH
    );

    const OptimizedTokenFactory = await ethers.getContractFactory("OptimizedTokenFactory");
    const tokenFactory = await OptimizedTokenFactory.deploy(await tokenImpl.getAddress());
    
    await tokenFactory.setBondingCurve(await bondingCurve.getAddress());
    
    return { tokenFactory, bondingCurve, tokenImpl };
  }

  static async createToken(tokenFactory, name = "Test Token", symbol = "TEST") {
    const tx = await tokenFactory.createToken(
      name,
      symbol,
      "https://example.com/token.png",
      "A test token"
    );
    
    const receipt = await tx.wait();
    const event = receipt.logs.find(log => log.fragment && log.fragment.name === "TokenCreated");
    return event.args.token;
  }

  static async enableTrading(bondingCurve, token) {
    const info = await bondingCurve.tokenInfo(token);
    await time.increaseTo(Number(info.tradingEnabledAt) + 1);
    await ethers.provider.send("evm_mine");
  }

  static async buyTokens(bondingCurve, token, buyer, amount) {
    return bondingCurve.connect(buyer).buyTokens(
      token,
      0,
      { value: amount }
    );
  }

  static async sellTokens(bondingCurve, token, seller, tokenAmount) {
    const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
    const tokenContract = LaunchpadTokenV2.attach(token);
    
    await tokenContract.connect(seller).approve(
      await bondingCurve.getAddress(),
      tokenAmount
    );
    
    await ethers.provider.send("evm_mine");
    
    return bondingCurve.connect(seller).sellTokens(
      token,
      tokenAmount,
      0
    );
  }

  static async measureGas(transaction) {
    const receipt = await transaction.wait();
    return receipt.gasUsed;
  }

  static calculateExpectedTokens(ethReserve, tokenReserve, ethIn, feeBps = 300) {
    // Match the contract's calculateTokensOut which doesn't deduct fees
    const k = ethReserve * tokenReserve;
    const newEthReserve = ethReserve + ethIn;
    const newTokenReserve = k / newEthReserve;
    const tokensOut = tokenReserve - newTokenReserve;
    
    // Apply 0.1% slippage protection
    return (tokensOut * 999n) / 1000n;
  }

  static calculateExpectedEth(ethReserve, tokenReserve, tokensIn, feeBps = 300) {
    // Match the contract's calculateEthOut which doesn't deduct fees
    const k = ethReserve * tokenReserve;
    const newTokenReserve = tokenReserve + tokensIn;
    const newEthReserve = k / newTokenReserve;
    const ethOut = ethReserve - newEthReserve;
    
    // Apply 0.1% slippage
    return (ethOut * 999n) / 1000n;
  }

  static async increaseBlocks(count) {
    for (let i = 0; i < count; i++) {
      await ethers.provider.send("evm_mine");
    }
  }

  static async getBlockNumber() {
    return ethers.provider.getBlockNumber();
  }

  static async getBalance(address) {
    return ethers.provider.getBalance(address);
  }

  static generateRandomTokenParams(index) {
    return {
      name: `Token ${index}`,
      symbol: `TK${index}`,
      imageUrl: `https://example.com/token${index}.png`,
      description: `Test token number ${index}`
    };
  }
}

module.exports = TestHelpers;