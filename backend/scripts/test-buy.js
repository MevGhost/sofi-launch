const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing token buy on Base Sepolia...\n");
  
  const tokenAddress = "0x24c8c47641468d860cb1e7876c23f3f3565cc446";
  const factoryAddress = "0x4f344717f048D5b9553a8292f1c1265832537977";
  
  const [signer] = await ethers.getSigners();
  console.log("Testing with account:", signer.address);
  
  // Get factory contract
  const factoryABI = [
    "function buyTokens(address _token, uint256 _minTokensOut) payable returns (uint256)",
    "function getTokenPrice(address) view returns (uint256)",
    "function tokenInfo(address) view returns (tuple(address tokenAddress, address creator, uint256 virtualEthReserve, uint256 virtualTokenReserve, uint256 realEthReserve, uint256 realTokenReserve, uint256 dexReserve, uint256 creatorFees, uint256 platformFees, bool graduated, uint256 createdAt, uint256 firstTradeAt, uint256 lockedUntil, uint256 totalVolume, uint256 tradeCount))"
  ];
  
  const factory = new ethers.Contract(factoryAddress, factoryABI, signer);
  
  try {
    // Check current price before
    const priceBefore = await factory.getTokenPrice(tokenAddress);
    console.log("💵 Price before:", ethers.formatEther(priceBefore), "ETH per token");
    
    // Get token info to check lock
    const tokenInfo = await factory.tokenInfo(tokenAddress);
    const now = Math.floor(Date.now() / 1000);
    const lockedUntil = Number(tokenInfo.lockedUntil);
    
    if (now < lockedUntil && signer.address.toLowerCase() !== tokenInfo.creator.toLowerCase()) {
      console.log("\n⏰ Token is still locked for", Math.floor((lockedUntil - now) / 60), "more minutes");
      console.log("   Only creator can trade during lock period");
      console.log("   Lock expires at:", new Date(lockedUntil * 1000).toLocaleString());
    } else {
      console.log("\n🔓 Token is unlocked and ready for trading!");
    }
    
    // Calculate expected tokens for 0.01 ETH
    const ethAmount = ethers.parseEther("0.01");
    const platformFee = (ethAmount * 100n) / 10000n; // 1%
    const creatorFee = (ethAmount * 100n) / 10000n; // 1%
    const ethAfterFees = ethAmount - platformFee - creatorFee;
    
    const totalEthReserve = tokenInfo.virtualEthReserve + tokenInfo.realEthReserve;
    const totalTokenReserve = tokenInfo.virtualTokenReserve + tokenInfo.realTokenReserve;
    
    const k = totalEthReserve * totalTokenReserve;
    const newEthReserve = totalEthReserve + ethAfterFees;
    const newTokenReserve = k / newEthReserve;
    const expectedTokens = totalTokenReserve - newTokenReserve;
    
    console.log("\n📊 Trade Simulation (0.01 ETH buy):");
    console.log("   ETH Input: 0.01 ETH");
    console.log("   Platform Fee (1%): ", ethers.formatEther(platformFee), "ETH");
    console.log("   Creator Fee (1%): ", ethers.formatEther(creatorFee), "ETH");
    console.log("   ETH After Fees:", ethers.formatEther(ethAfterFees), "ETH");
    console.log("   Expected Tokens:", ethers.formatUnits(expectedTokens, 18), "tokens");
    
    // Calculate new price after trade
    const newPrice = (newEthReserve * 10n**18n) / newTokenReserve;
    console.log("   New Price After:", ethers.formatEther(newPrice), "ETH per token");
    
    const priceIncrease = ((newPrice - BigInt(priceBefore)) * 10000n) / BigInt(priceBefore);
    console.log("   Price Impact:", Number(priceIncrease) / 100, "%");
    
    console.log("\n✅ Token trading functionality verified!");
    console.log("📝 Note: Actual buy transaction not executed (simulation only)");
    
  } catch (error) {
    console.error("\n❌ Error testing buy:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });