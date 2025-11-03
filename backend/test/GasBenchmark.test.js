const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Gas Benchmark - BEFORE Optimizations", function () {
  let tokenFactory;
  let bondingCurve;
  let token;
  let owner, user1;
  
  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // Deploy the current implementation
    const SecureConstantProductCurve = await ethers.getContractFactory("SecureConstantProductCurve");
    bondingCurve = await SecureConstantProductCurve.deploy(
      owner.address,
      "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", // ETH/USD feed
      "0x2626664c2603336E57B271c5C0b26F421741e481", // Swap router
      "0x4200000000000000000000000000000000000006"  // WETH
    );

    const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
    const tokenImpl = await LaunchpadTokenV2.deploy();
    
    const TokenFactoryV2 = await ethers.getContractFactory("TokenFactoryV2");
    tokenFactory = await TokenFactoryV2.deploy(await tokenImpl.getAddress());
    
    await tokenFactory.setBondingCurve(await bondingCurve.getAddress());
  });

  it("Gas Benchmark: Token Creation", async function () {
    const tx = await tokenFactory.createToken(
      "Test Token",
      "TEST",
      "https://example.com/token.png",
      "A test token for gas benchmarking"
    );
    
    const receipt = await tx.wait();
    console.log("🔥 Token Creation Gas Used:", receipt.gasUsed.toString());
    
    const event = receipt.logs.find(log => log.fragment && log.fragment.name === "TokenCreated");
    token = event.args.token;
  });

  it("Gas Benchmark: Buy Operation", async function () {
    // First create a token
    const createTx = await tokenFactory.createToken(
      "Test Token",
      "TEST",
      "https://example.com/token.png",
      "A test token"
    );
    const createReceipt = await createTx.wait();
    const event = createReceipt.logs.find(log => log.fragment && log.fragment.name === "TokenCreated");
    token = event.args.token;

    // Wait for trading to be enabled
    const info = await bondingCurve.tokenInfo(token);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(info.tradingEnabledAt)]);
    await ethers.provider.send("evm_mine");

    // Measure buy operation
    const buyTx = await bondingCurve.connect(user1).buyTokens(
      token,
      0,
      { value: ethers.parseEther("0.01") }
    );
    
    const buyReceipt = await buyTx.wait();
    console.log("🔥 Buy Operation Gas Used:", buyReceipt.gasUsed.toString());
  });

  it("Gas Benchmark: Sell Operation", async function () {
    // Create token and buy first
    const createTx = await tokenFactory.createToken(
      "Test Token",
      "TEST",
      "https://example.com/token.png",
      "A test token"
    );
    const createReceipt = await createTx.wait();
    const event = createReceipt.logs.find(log => log.fragment && log.fragment.name === "TokenCreated");
    token = event.args.token;

    // Wait for trading
    const info = await bondingCurve.tokenInfo(token);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(info.tradingEnabledAt)]);
    await ethers.provider.send("evm_mine");

    // Buy tokens first
    await bondingCurve.connect(user1).buyTokens(
      token,
      0,
      { value: ethers.parseEther("0.01") }
    );

    // Get token contract and approve
    const LaunchpadTokenV2 = await ethers.getContractFactory("LaunchpadTokenV2");
    const tokenContract = LaunchpadTokenV2.attach(token);
    const balance = await tokenContract.balanceOf(user1.address);
    
    await tokenContract.connect(user1).approve(
      await bondingCurve.getAddress(),
      balance
    );

    // Mine a block to avoid same-block trading
    await ethers.provider.send("evm_mine");

    // Measure sell operation
    const sellTx = await bondingCurve.connect(user1).sellTokens(
      token,
      balance / 2n,
      0
    );
    
    const sellReceipt = await sellTx.wait();
    console.log("🔥 Sell Operation Gas Used:", sellReceipt.gasUsed.toString());
  });
});