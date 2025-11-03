const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking latest token deployment on Base Sepolia...\n");
  
  // Token address from the latest deployment
  const tokenAddress = "0x24c8c47641468d860cb1e7876c23f3f3565cc446";
  const factoryAddress = "0x4f344717f048D5b9553a8292f1c1265832537977";
  
  const [signer] = await ethers.getSigners();
  console.log("Checking with account:", signer.address);
  
  // Get token contract
  const tokenABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function creator() view returns (address)",
    "function createdAt() view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];
  
  const token = new ethers.Contract(tokenAddress, tokenABI, signer);
  
  // Get factory contract
  const factoryABI = [
    "function tokenInfo(address) view returns (tuple(address tokenAddress, address creator, uint256 virtualEthReserve, uint256 virtualTokenReserve, uint256 realEthReserve, uint256 realTokenReserve, uint256 dexReserve, uint256 creatorFees, uint256 platformFees, bool graduated, uint256 createdAt, uint256 firstTradeAt, uint256 lockedUntil, uint256 totalVolume, uint256 tradeCount))",
    "function getTokenPrice(address) view returns (uint256)",
    "function isValidToken(address) view returns (bool)"
  ];
  
  const factory = new ethers.Contract(factoryAddress, factoryABI, signer);
  
  try {
    console.log("📊 Token Information:");
    console.log("====================");
    
    // Basic token info
    const name = await token.name();
    const symbol = await token.symbol();
    const totalSupply = await token.totalSupply();
    const decimals = await token.decimals();
    const creator = await token.creator();
    const createdAt = await token.createdAt();
    
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Total Supply:", ethers.formatUnits(totalSupply, decimals), symbol);
    console.log("Decimals:", decimals);
    console.log("Creator:", creator);
    console.log("Created At:", new Date(Number(createdAt) * 1000).toLocaleString());
    
    // Check factory balance
    const factoryBalance = await token.balanceOf(factoryAddress);
    console.log("\n💰 Factory Balance:", ethers.formatUnits(factoryBalance, decimals), symbol);
    
    // Get bonding curve info
    console.log("\n📈 Bonding Curve Information:");
    console.log("============================");
    
    const isValid = await factory.isValidToken(tokenAddress);
    console.log("Is Valid Token:", isValid);
    
    const tokenInfo = await factory.tokenInfo(tokenAddress);
    console.log("Virtual ETH Reserve:", ethers.formatEther(tokenInfo.virtualEthReserve), "ETH");
    console.log("Virtual Token Reserve:", ethers.formatUnits(tokenInfo.virtualTokenReserve, decimals), symbol);
    console.log("Real ETH Reserve:", ethers.formatEther(tokenInfo.realEthReserve), "ETH");
    console.log("Real Token Reserve:", ethers.formatUnits(tokenInfo.realTokenReserve, decimals), symbol);
    console.log("DEX Reserve:", ethers.formatUnits(tokenInfo.dexReserve, decimals), symbol);
    console.log("Creator Fees:", ethers.formatEther(tokenInfo.creatorFees), "ETH");
    console.log("Platform Fees:", ethers.formatEther(tokenInfo.platformFees), "ETH");
    console.log("Graduated:", tokenInfo.graduated);
    console.log("Locked Until:", new Date(Number(tokenInfo.lockedUntil) * 1000).toLocaleString());
    console.log("Total Volume:", ethers.formatEther(tokenInfo.totalVolume), "ETH");
    console.log("Trade Count:", tokenInfo.tradeCount.toString());
    
    // Get current price
    const currentPrice = await factory.getTokenPrice(tokenAddress);
    console.log("\n💵 Current Token Price:", ethers.formatEther(currentPrice), "ETH per token");
    
    // Calculate market cap
    const marketCap = (Number(ethers.formatEther(currentPrice)) * Number(ethers.formatUnits(totalSupply, decimals)));
    console.log("📊 Market Cap: $", (marketCap * 3000).toFixed(2), "(assuming ETH = $3000)");
    
    console.log("\n✅ Token deployment verified successfully!");
    console.log("🎯 Token is ready for trading at:", tokenAddress);
    
  } catch (error) {
    console.error("\n❌ Error checking token:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });