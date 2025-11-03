import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { authenticate } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { db } from '../services/database.service';
import { emitWebSocketEvent } from '../services/websocket.service';
import { escrowCache as cacheService } from '../services/cache.service';

const router = Router();

// Token cache key prefixes
const CACHE_KEYS = {
  TOKEN_LIST: 'tokens:list',
  TOKEN_DETAIL: 'token:detail:',
  TOKEN_CHART: 'token:chart:',
  TOKEN_HOLDERS: 'token:holders:',
  TOKEN_TRADES: 'token:trades:',
  PLATFORM_STATS: 'stats:platform',
};

/**
 * POST /api/tokens/create
 * Register a token that was deployed on-chain by the user
 */
router.post('/create', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      symbol,
      description,
      imageUrl,
      twitter,
      telegram,
      website,
      totalSupply = '1000000000',
      bondingCurveType = 'constant',
      tokenAddress, // Required - the deployed token address
      deploymentTx, // Required - the deployment transaction hash
      bondingCurveAddress, // Required - the bonding curve address
    } = req.body;

    // Validate required fields
    if (!name || !symbol || !tokenAddress || !deploymentTx) {
      return res.status(400).json({
        success: false,
        error: 'Name, symbol, tokenAddress, and deploymentTx are required'
      });
    }

    // Validate Ethereum addresses
    if (!ethers.isAddress(tokenAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token address'
      });
    }

    // Validate symbol doesn't already exist
    const existingToken = await db.token.findFirst({
      where: { 
        OR: [
          { symbol: symbol.toUpperCase() },
          { address: tokenAddress }
        ]
      }
    });

    if (existingToken) {
      return res.status(400).json({
        success: false,
        error: 'Token symbol or address already exists'
      });
    }

    // Get or create user in database
    const user = await db.user.findUnique({
      where: { address: req.user!.address }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found in database'
      });
    }

    // Save token to database
    const token = await db.token.create({
      data: {
        address: tokenAddress,
        name,
        symbol: symbol.toUpperCase(),
        description: description || '',
        imageUrl: imageUrl || '',
        twitter: twitter || '',
        telegram: telegram || '',
        website: website || '',
        totalSupply,
        bondingCurveType,
        bondingCurveAddress: bondingCurveAddress || '0x227cB6E946B5Fd3f8e82215C6f0a9460f13FEeCE',
        status: 'ACTIVE',
        marketCap: '0',
        liquidity: '0',
        bondingProgress: 0,
        holdersCount: 1,
        volume24h: '0',
        change24h: 0,
        creatorId: user.id,
        deploymentTx,
        chainId: process.env.CHAIN_ID || '84532', // Base Sepolia
      }
    });

    // Emit WebSocket event
    emitWebSocketEvent('token:created', {
      token,
      creator: req.user!.address,
    });

    // Clear token list cache
    await cacheService.clearPattern(`${CACHE_KEYS.TOKEN_LIST}:*`);

    res.json({
      success: true,
      data: token
    });
  } catch (error) {
    console.error('Error registering token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register token'
    });
  }
});

// Re-export other routes from the original file
export { router as tokenRoutesV2 };