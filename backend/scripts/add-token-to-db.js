const { PrismaClient } = require('@prisma/client');
const { ethers } = require('hardhat');

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Adding token to database...\n");
  
  const tokenAddress = "0x24c8c47641468d860cb1e7876c23f3f3565cc446";
  const factoryAddress = "0x4f344717f048D5b9553a8292f1c1265832537977";
  
  // Get token details from blockchain
  const tokenABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function creator() view returns (address)",
    "function createdAt() view returns (uint256)",
    "function imageUrl() view returns (string)",
    "function description() view returns (string)",
    "function twitter() view returns (string)",
    "function telegram() view returns (string)",
    "function website() view returns (string)"
  ];
  
  const [signer] = await ethers.getSigners();
  const token = new ethers.Contract(tokenAddress, tokenABI, signer);
  
  // Get factory contract to get price info
  const factoryABI = [
    "function getTokenPrice(address) view returns (uint256)",
    "function tokenInfo(address) view returns (tuple(address tokenAddress, address creator, uint256 virtualEthReserve, uint256 virtualTokenReserve, uint256 realEthReserve, uint256 realTokenReserve, uint256 dexReserve, uint256 creatorFees, uint256 platformFees, bool graduated, uint256 createdAt, uint256 firstTradeAt, uint256 lockedUntil, uint256 totalVolume, uint256 tradeCount))"
  ];
  
  const factory = new ethers.Contract(factoryAddress, factoryABI, signer);
  
  try {
    // Get token details
    const name = await token.name();
    const symbol = await token.symbol();
    const totalSupply = await token.totalSupply();
    const creator = await token.creator();
    const createdAt = await token.createdAt();
    const imageUrl = await token.imageUrl();
    const description = await token.description();
    const twitter = await token.twitter();
    const telegram = await token.telegram();
    const website = await token.website();
    
    // Get price and bonding curve info
    const currentPrice = await factory.getTokenPrice(tokenAddress);
    const tokenInfo = await factory.tokenInfo(tokenAddress);
    
    // Calculate market cap in USD (assuming ETH = $3000)
    const marketCapEth = Number(ethers.formatEther(currentPrice)) * Number(ethers.formatUnits(totalSupply, 18));
    const marketCapUsd = marketCapEth * 3000;
    
    console.log("Token Details:");
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Address:", tokenAddress);
    console.log("Creator:", creator);
    console.log("Market Cap:", "$" + marketCapUsd.toFixed(2));
    console.log("Graduated:", tokenInfo.graduated);
    
    // Add token to database
    const tokenData = await prisma.token.upsert({
      where: { address: tokenAddress.toLowerCase() },
      update: {
        name,
        symbol,
        totalSupply: totalSupply.toString(),
        circulatingSupply: (totalSupply - tokenInfo.realTokenReserve - tokenInfo.dexReserve).toString(),
        price: currentPrice.toString(),
        marketCap: marketCapUsd.toString(),
        priceChangePercent24h: 0,
        volumeUsd24h: Number(ethers.formatEther(tokenInfo.totalVolume)) * 3000,
        liquidityUsd: Number(ethers.formatEther(tokenInfo.realEthReserve)) * 3000,
        txCount24h: Number(tokenInfo.tradeCount),
        holders: 1,
        bondingCurveProgress: tokenInfo.graduated ? 100 : (marketCapUsd / 69000 * 100),
        status: tokenInfo.graduated ? 'graduated' : 'active',
        lastUpdated: new Date()
      },
      create: {
        address: tokenAddress.toLowerCase(),
        name,
        symbol,
        decimals: 18,
        totalSupply: totalSupply.toString(),
        circulatingSupply: (totalSupply - tokenInfo.realTokenReserve - tokenInfo.dexReserve).toString(),
        creator: creator.toLowerCase(),
        price: currentPrice.toString(),
        marketCap: marketCapUsd.toString(),
        priceChangePercent24h: 0,
        volumeUsd24h: Number(ethers.formatEther(tokenInfo.totalVolume)) * 3000,
        liquidityUsd: Number(ethers.formatEther(tokenInfo.realEthReserve)) * 3000,
        txCount24h: Number(tokenInfo.tradeCount),
        holders: 1,
        bondingCurveProgress: tokenInfo.graduated ? 100 : (marketCapUsd / 69000 * 100),
        status: tokenInfo.graduated ? 'graduated' : 'active',
        createdAt: new Date(Number(createdAt) * 1000),
        launchedAt: new Date(Number(createdAt) * 1000),
        lastUpdated: new Date(),
        chain: 'base-sepolia',
        bondingCurveType: 'constant-product',
        bondingCurveAddress: factoryAddress.toLowerCase(), // Using factory as bonding curve address
        factoryAddress: factoryAddress.toLowerCase(),
        imageUrl: imageUrl || '',
        description: description || '',
        twitter: twitter || '',
        telegram: telegram || '',
        website: website || ''
      }
    });
    
    console.log("\n✅ Token added to database successfully!");
    console.log("Database ID:", tokenData.id);
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });