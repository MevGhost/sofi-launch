import { ethers } from 'ethers';
import { db } from './database.service';
import logger from './logger.service';
import { priceService } from './price.service';

// Use V2 ABI for the new contract
const DevBondingCurveABI = require('../abis/DevBondingCurveV2ABI.json');

export class TokenImportService {
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
   * Import a token from the blockchain into the database
   */
  async importToken(tokenAddress: string, deploymentTxHash?: string): Promise<any> {
    try {
      logger.info(`Importing token: ${tokenAddress}`);
      
      // Validate token address
      if (!ethers.isAddress(tokenAddress)) {
        throw new Error('Invalid token address');
      }
      
      // Check if token already exists
      const existingToken = await db.token.findUnique({
        where: { address: tokenAddress.toLowerCase() }
      });
      
      if (existingToken) {
        logger.info(`Token ${tokenAddress} already exists, updating...`);
        return this.updateTokenData(tokenAddress);
      }
      
      // Get token info from factory contract
      const tokenInfo = await this.contract.tokenInfo(tokenAddress);
      
      // V2 contract returns struct: tokenAddress, creator, realEthReserve, realTokenReserve, k, ...
      const creator = tokenInfo.creator || tokenInfo[1];
      
      if (!tokenInfo || !creator || creator === ethers.ZeroAddress) {
        throw new Error('Token not found in factory');
      }
      
      // Check if token is valid
      const isValid = await this.contract.isValidToken(tokenAddress);
      if (!isValid) {
        throw new Error('Token is not valid in factory');
      }
      
      // Get token metadata
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function name() view returns (string)',
          'function symbol() view returns (string)',
          'function totalSupply() view returns (uint256)',
          'function imageUrl() view returns (string)',
          'function description() view returns (string)',
          'function twitter() view returns (string)',
          'function telegram() view returns (string)',
          'function website() view returns (string)',
          'function creator() view returns (address)'
        ],
        this.provider
      );
      
      // Fetch all token data
      const [name, symbol, totalSupply] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.totalSupply()
      ]);
      
      // Try to get optional metadata
      let description = '';
      let imageUrl = '';
      let twitter = '';
      let telegram = '';
      let website = '';
      
      try {
        description = await tokenContract.description();
      } catch (e) {}
      
      try {
        imageUrl = await tokenContract.imageUrl();
      } catch (e) {}
      
      try {
        twitter = await tokenContract.twitter();
      } catch (e) {}
      
      try {
        telegram = await tokenContract.telegram();
      } catch (e) {}
      
      try {
        website = await tokenContract.website();
      } catch (e) {}
      
      // Calculate market metrics
      const price = await this.contract.getTokenPrice(tokenAddress);
      const marketCap = await this.contract.calculateMarketCap(tokenAddress);
      const bondingProgress = await this.contract.bondingProgress(tokenAddress);
      
      // Get current ETH price from price service
      const ETH_PRICE_USD = await priceService.getETHPriceUSD();
      const marketCapInETH = parseFloat(ethers.formatEther(marketCap));
      const marketCapInUSD = marketCapInETH * ETH_PRICE_USD;
      
      // Ensure creator user exists
      const creatorAddress = creator.toLowerCase();
      let creatorUser = await db.user.findUnique({
        where: { address: creatorAddress }
      });
      
      if (!creatorUser) {
        creatorUser = await db.user.create({
          data: {
            address: creatorAddress,
            name: `User ${creatorAddress.slice(2, 8)}`
          }
        });
        logger.info(`Created user for token creator: ${creatorAddress}`);
      }
      
      // Get deployment transaction hash if not provided
      if (!deploymentTxHash) {
        // Try to find the TokenCreated event
        try {
          const filter = this.contract.filters.TokenCreated(tokenAddress);
          const events = await this.contract.queryFilter(filter, 0, 'latest');
          
          if (events.length > 0) {
            deploymentTxHash = events[0].transactionHash;
          }
        } catch (e) {
          logger.warn(`Could not find deployment transaction for ${tokenAddress}`);
          deploymentTxHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
        }
      }
      
      // Create token in database
      const newToken = await db.token.create({
        data: {
          address: tokenAddress.toLowerCase(),
          name: name || 'Unknown',
          symbol: symbol || 'UNKNOWN',
          description: description || '',
          imageUrl: imageUrl || '',
          twitter: twitter || '',
          telegram: telegram || '',
          website: website || '',
          totalSupply: ethers.formatEther(totalSupply),
          bondingCurveType: 'constant',
          bondingCurveAddress: this.contract.target as string,
          status: tokenInfo.graduated ? 'GRADUATED' : 'ACTIVE',
          marketCap: marketCapInUSD.toString(),  // Store in USD
          liquidity: (parseFloat(ethers.formatEther(tokenInfo.realEthReserve || tokenInfo[2] || 0)) * ETH_PRICE_USD).toString(), // Convert to USD
          bondingProgress: Number(bondingProgress) / 100, // Convert from percentage
          holdersCount: 1,
          volume24h: (parseFloat(ethers.formatEther(tokenInfo.totalVolume || 0)) * ETH_PRICE_USD).toString(), // Convert to USD
          change24h: 0,
          creatorId: creatorUser.id,
          deploymentTx: deploymentTxHash || '0x0000000000000000000000000000000000000000000000000000000000000000',
          chainId: process.env['CHAIN_ID'] || '84532',
          createdAt: tokenInfo.createdAt ? new Date(Number(tokenInfo.createdAt) * 1000) : new Date()
        }
      });
      
      logger.info(`Token ${tokenAddress} imported successfully with ID: ${newToken.id}`);
      
      // Also create/update cache entries
      await this.updateTokenCache(newToken);
      
      return newToken;
      
    } catch (error) {
      logger.error(`Error importing token ${tokenAddress}:`, error);
      throw error;
    }
  }

  /**
   * Update existing token data from blockchain
   */
  async updateTokenData(tokenAddress: string): Promise<any> {
    try {
      const tokenInfo = await this.contract.tokenInfo(tokenAddress);
      
      // V2 contract returns struct: tokenAddress, creator, realEthReserve, realTokenReserve, k, ...
      const creator = tokenInfo.creator || tokenInfo[1];
      
      if (!tokenInfo || !creator || creator === ethers.ZeroAddress) {
        throw new Error('Token not found in factory');
      }
      
      // Calculate current metrics
      const price = await this.contract.getTokenPrice(tokenAddress);
      const marketCap = await this.contract.calculateMarketCap(tokenAddress);
      const bondingProgress = await this.contract.bondingProgress(tokenAddress);
      
      // Get current ETH price from price service
      const ETH_PRICE_USD = await priceService.getETHPriceUSD();
      const marketCapInETH = parseFloat(ethers.formatEther(marketCap));
      const marketCapInUSD = marketCapInETH * ETH_PRICE_USD;
      
      // Update token in database
      const updatedToken = await db.token.update({
        where: { address: tokenAddress.toLowerCase() },
        data: {
          marketCap: marketCapInUSD.toString(), // Store in USD
          liquidity: (parseFloat(ethers.formatEther(tokenInfo.realEthReserve || tokenInfo[2] || 0)) * ETH_PRICE_USD).toString(), // Convert to USD
          bondingProgress: Number(bondingProgress) / 100,
          volume24h: (parseFloat(ethers.formatEther(tokenInfo.totalVolume || 0)) * ETH_PRICE_USD).toString(), // Convert to USD
          status: tokenInfo.graduated ? 'GRADUATED' : 'ACTIVE',
          updatedAt: new Date()
        }
      });
      
      logger.info(`Token ${tokenAddress} updated successfully`);
      
      // Update cache
      await this.updateTokenCache(updatedToken);
      
      return updatedToken;
      
    } catch (error) {
      logger.error(`Error updating token ${tokenAddress}:`, error);
      throw error;
    }
  }

  /**
   * Update token cache entries
   */
  private async updateTokenCache(token: any): Promise<void> {
    // Cache implementation would go here
    // For now, just log
    logger.debug(`Cache updated for token ${token.address}`);
  }

  /**
   * Import all tokens from the factory
   */
  async importAllTokens(): Promise<number> {
    try {
      logger.info('Starting bulk token import...');
      
      // Get all tokens from factory
      const allTokens = await this.contract.getAllTokens();
      
      logger.info(`Found ${allTokens.length} tokens in factory`);
      
      let imported = 0;
      let updated = 0;
      
      for (const tokenAddress of allTokens) {
        try {
          const existing = await db.token.findUnique({
            where: { address: tokenAddress.toLowerCase() }
          });
          
          if (existing) {
            await this.updateTokenData(tokenAddress);
            updated++;
          } else {
            await this.importToken(tokenAddress);
            imported++;
          }
        } catch (error) {
          logger.error(`Failed to import token ${tokenAddress}:`, error);
        }
      }
      
      logger.info(`Bulk import complete. Imported: ${imported}, Updated: ${updated}`);
      
      return imported + updated;
      
    } catch (error) {
      logger.error('Error in bulk import:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const tokenImportService = new TokenImportService();