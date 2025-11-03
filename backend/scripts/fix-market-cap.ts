import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMarketCaps() {
  try {
    // Get all tokens with unreasonably high market caps
    const tokens = await prisma.token.findMany({
      where: {
        marketCap: {
          gte: '1000000000' // More than 1 billion seems wrong for new tokens
        }
      }
    });
    
    console.log(`Found ${tokens.length} tokens with high market caps to fix`);
    
    for (const token of tokens) {
      const currentMarketCap = parseFloat(token.marketCap);
      
      // If market cap is in the billions/trillions, it's probably in wei
      // Convert from wei to a reasonable value
      let newMarketCap: string;
      
      if (currentMarketCap > 1e15) {
        // Definitely in wei, convert to ETH and multiply by ETH price (~$2000)
        newMarketCap = (currentMarketCap / 1e18 * 2000).toFixed(2);
      } else if (currentMarketCap > 1e9) {
        // Probably needs scaling down
        newMarketCap = '1000.00'; // Default to $1000 for new tokens
      } else {
        continue; // Skip if already reasonable
      }
      
      console.log(`Fixing token ${token.symbol}: ${token.marketCap} -> ${newMarketCap}`);
      
      await prisma.token.update({
        where: { id: token.id },
        data: { marketCap: newMarketCap }
      });
    }
    
    console.log('Market cap fix completed');
  } catch (error) {
    console.error('Error fixing market caps:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMarketCaps();