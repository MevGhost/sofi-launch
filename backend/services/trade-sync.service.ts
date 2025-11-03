import { ethers } from 'ethers';
import { db } from './database.service';
import logger from './logger.service';

const DevBondingCurveABI = require('../abis/DevBondingCurve.json');

export class TradeSyncService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  
  constructor() {
    const rpcUrl = process.env['BASE_SEPOLIA_RPC_URL'] || 'https://base-sepolia.g.alchemy.com/v2/XK8ZLRP2DVEi2di5M9Yz0';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const contractAddress = process.env['DEV_BONDING_FACTORY_ADDRESS'] || '0x46eCf02772C4Bc9a5cd440FB93022d6e268355c8';
    
    this.contract = new ethers.Contract(
      contractAddress,
      DevBondingCurveABI,
      this.provider
    );
  }

  /**
   * Sync historical trades for a token from blockchain events
   */
  async syncTokenTrades(tokenAddress: string, fromBlock?: number): Promise<number> {
    try {
      logger.info(`Syncing trades for token: ${tokenAddress}`);
      
      // Get token from database
      const token = await db.token.findUnique({
        where: { address: tokenAddress.toLowerCase() }
      });
      
      if (!token) {
        logger.warn(`Token ${tokenAddress} not found in database`);
        return 0;
      }
      
      // Determine starting block
      const startBlock = fromBlock || parseInt(process.env['FACTORY_START_BLOCK_SEPOLIA'] || '0');
      const currentBlock = await this.provider.getBlockNumber();
      
      // Create filters for buy and sell events
      const buyFilter = {
        address: this.contract.target,
        topics: [
          ethers.id("TokensPurchased(address,address,uint256,uint256,uint256)"),
          ethers.zeroPadValue(tokenAddress.toLowerCase(), 32)
        ]
      };
      
      const sellFilter = {
        address: this.contract.target,
        topics: [
          ethers.id("TokensSold(address,address,uint256,uint256,uint256)"),
          ethers.zeroPadValue(tokenAddress.toLowerCase(), 32)
        ]
      };
      
      let tradesImported = 0;
      
      // Process in batches to avoid RPC limits
      const batchSize = 500;
      for (let start = startBlock; start <= currentBlock; start += batchSize) {
        const end = Math.min(start + batchSize - 1, currentBlock);
        
        try {
          // Get buy events
          const buyEvents = await this.provider.getLogs({
            ...buyFilter,
            fromBlock: start,
            toBlock: end
          });
          
          // Get sell events  
          const sellEvents = await this.provider.getLogs({
            ...sellFilter,
            fromBlock: start,
            toBlock: end
          });
          
          // Process buy events
          for (const event of buyEvents) {
            try {
              const parsedLog = this.contract.interface.parseLog({
                topics: event.topics as string[],
                data: event.data
              });
              
              if (parsedLog) {
                const [tokenAddr, buyer, ethSpent, tokensReceived] = parsedLog.args;
                
                // Get block timestamp
                const block = await this.provider.getBlock(event.blockNumber);
                const timestamp = new Date(block!.timestamp * 1000);
                
                // Calculate price
                const ethAmount = Number(ethers.formatEther(ethSpent));
                const tokenAmount = Number(ethers.formatUnits(tokensReceived, 18));
                const price = ethAmount / tokenAmount;
                
                // Check if trade already exists
                const existingTrade = await db.trade.findFirst({
                  where: {
                    transactionHash: event.transactionHash,
                    tokenId: token.id
                  }
                });
                
                if (!existingTrade) {
                  await db.trade.create({
                    data: {
                      tokenId: token.id,
                      type: 'BUY',
                      trader: buyer.toLowerCase(),
                      amount: tokenAmount.toString(),
                      price: price.toString(),
                      totalCost: ethAmount.toString(),
                      transactionHash: event.transactionHash,
                      timestamp
                    }
                  });
                  tradesImported++;
                }
              }
            } catch (parseError) {
              logger.error(`Error parsing buy event: ${parseError}`);
            }
          }
          
          // Process sell events
          for (const event of sellEvents) {
            try {
              const parsedLog = this.contract.interface.parseLog({
                topics: event.topics as string[],
                data: event.data
              });
              
              if (parsedLog) {
                const [tokenAddr, seller, tokensSold, ethReceived] = parsedLog.args;
                
                // Get block timestamp
                const block = await this.provider.getBlock(event.blockNumber);
                const timestamp = new Date(block!.timestamp * 1000);
                
                // Calculate price
                const ethAmount = Number(ethers.formatEther(ethReceived));
                const tokenAmount = Number(ethers.formatUnits(tokensSold, 18));
                const price = ethAmount / tokenAmount;
                
                // Check if trade already exists
                const existingTrade = await db.trade.findFirst({
                  where: {
                    transactionHash: event.transactionHash,
                    tokenId: token.id
                  }
                });
                
                if (!existingTrade) {
                  await db.trade.create({
                    data: {
                      tokenId: token.id,
                      type: 'SELL',
                      trader: seller.toLowerCase(),
                      amount: tokenAmount.toString(),
                      price: price.toString(),
                      totalReceived: ethAmount.toString(),
                      transactionHash: event.transactionHash,
                      timestamp
                    }
                  });
                  tradesImported++;
                }
              }
            } catch (parseError) {
              logger.error(`Error parsing sell event: ${parseError}`);
            }
          }
          
        } catch (batchError) {
          logger.error(`Error processing batch ${start}-${end}: ${batchError}`);
        }
      }
      
      logger.info(`Imported ${tradesImported} trades for token ${tokenAddress}`);
      return tradesImported;
      
    } catch (error) {
      logger.error(`Error syncing trades for ${tokenAddress}: ${error}`);
      throw error;
    }
  }

  /**
   * Sync trades for all tokens
   */
  async syncAllTokenTrades(): Promise<number> {
    try {
      const tokens = await db.token.findMany({
        where: {
          bondingCurveAddress: this.contract.target as string
        }
      });
      
      let totalTrades = 0;
      
      for (const token of tokens) {
        const trades = await this.syncTokenTrades(token.address);
        totalTrades += trades;
      }
      
      return totalTrades;
      
    } catch (error) {
      logger.error(`Error syncing all token trades: ${error}`);
      throw error;
    }
  }
}

// Export singleton instance
export const tradeSyncService = new TradeSyncService();