import { Router, Request, Response } from 'express';
import { db } from '../services/database.service';
import { escrowCache as cacheService } from '../services/cache.service';

const router = Router();

// Cache keys
const CACHE_KEYS = {
  PLATFORM_STATS: 'stats:platform',
  TOKEN_STATS: 'stats:tokens',
  ESCROW_STATS: 'stats:escrows',
  VOLUME_STATS: 'stats:volume:',
};

/**
 * GET /api/stats
 * Get overall platform statistics
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Try cache first
    const cached = await cacheService.get(CACHE_KEYS.PLATFORM_STATS);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    // Fetch platform stats
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [
      totalTokens,
      activeTokens,
      graduatedTokens,
      totalEscrows,
      activeEscrows,
      completedEscrows,
      totalUsers,
      totalTrades,
      totalVolume24h,
      newTokensToday,
      activeTraders24h,
      totalMarketCap,
    ] = await Promise.all([
      db.token.count(),
      db.token.count({ where: { status: 'ACTIVE' } }),
      db.token.count({ where: { status: 'GRADUATED' } }),
      db.escrow.count(),
      db.escrow.count({ where: { status: 'ACTIVE' } }),
      db.escrow.count({ where: { status: 'COMPLETED' } }),
      db.user.count(),
      db.trade.count(),
      // Get 24h volume (fetch trades and calculate since fields are strings)
      db.trade.findMany({
        where: {
          timestamp: {
            gte: yesterday
          }
        },
        select: {
          totalCost: true,
          totalReceived: true,
        }
      }),
      // New tokens created today
      db.token.count({
        where: {
          createdAt: {
            gte: today
          }
        }
      }),
      // Count unique traders in last 24h
      db.trade.findMany({
        where: {
          timestamp: {
            gte: yesterday
          }
        },
        select: {
          trader: true
        },
        distinct: ['trader']
      }),
      // Get all tokens to calculate total market cap
      db.token.findMany({
        where: { status: 'ACTIVE' },
        select: {
          marketCap: true
        }
      })
    ]);

    const volume24h = totalVolume24h.reduce((sum, trade) => {
      return sum + parseFloat(trade.totalCost || '0') + parseFloat(trade.totalReceived || '0');
    }, 0);
    
    const marketCapTotal = totalMarketCap.reduce((sum, token) => {
      return sum + parseFloat(token.marketCap || '0');
    }, 0);
    
    const uniqueTraders24h = activeTraders24h.length;

    const stats = {
      tokens: {
        total: totalTokens,
        active: activeTokens,
        graduated: graduatedTokens,
        newToday: newTokensToday,
        graduationRate: totalTokens > 0 ? ((graduatedTokens / totalTokens) * 100).toFixed(2) : '0',
      },
      escrows: {
        total: totalEscrows,
        active: activeEscrows,
        completed: completedEscrows,
        completionRate: totalEscrows > 0 ? ((completedEscrows / totalEscrows) * 100).toFixed(2) : '0',
      },
      users: {
        total: totalUsers,
        active24h: uniqueTraders24h,
      },
      trading: {
        totalTrades,
        volume24h: volume24h.toFixed(2),
        marketCapTotal: marketCapTotal.toFixed(2),
        activeTraders24h: uniqueTraders24h,
        avgTradeSize: totalTrades > 0 ? (volume24h / totalTrades).toFixed(2) : '0',
      },
      timestamp: new Date().toISOString(),
    };

    // Cache for 5 minutes
    await cacheService.set(CACHE_KEYS.PLATFORM_STATS, stats, 300);

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Platform stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch platform statistics' 
    });
  }
});

/**
 * GET /api/stats/tokens
 * Get token-specific statistics
 */
router.get('/tokens', async (req: Request, res: Response) => {
  try {
    const { period = '24h' } = req.query;
    
    // Calculate time range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case '1h':
        startDate.setHours(now.getHours() - 1);
        break;
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
    }

    // Try cache first
    const cacheKey = `${CACHE_KEYS.TOKEN_STATS}:${period}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    // Fetch token stats
    const [
      newTokens,
      topGainers,
      topLosers,
      mostTraded,
      nearGraduation,
    ] = await Promise.all([
      // New tokens in period
      db.token.count({
        where: {
          createdAt: { gte: startDate }
        }
      }),
      
      // Top gainers
      db.token.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { change24h: 'desc' },
        take: 10,
        select: {
          address: true,
          name: true,
          symbol: true,
          change24h: true,
          marketCap: true,
        }
      }),
      
      // Top losers
      db.token.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { change24h: 'asc' },
        take: 10,
        select: {
          address: true,
          name: true,
          symbol: true,
          change24h: true,
          marketCap: true,
        }
      }),
      
      // Most traded
      db.token.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { volume24h: 'desc' },
        take: 10,
        select: {
          address: true,
          name: true,
          symbol: true,
          volume24h: true,
          marketCap: true,
        }
      }),
      
      // Near graduation (>80% bonding progress)
      db.token.findMany({
        where: {
          status: 'ACTIVE',
          bondingProgress: { gte: 80 }
        },
        orderBy: { bondingProgress: 'desc' },
        take: 10,
        select: {
          address: true,
          name: true,
          symbol: true,
          bondingProgress: true,
          marketCap: true,
        }
      }),
    ]);

    const stats = {
      period,
      newTokens,
      topGainers,
      topLosers,
      mostTraded,
      nearGraduation,
      timestamp: new Date().toISOString(),
    };

    // Cache for 1 minute
    await cacheService.set(cacheKey, stats, 60);

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Token stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch token statistics' 
    });
  }
});

/**
 * GET /api/stats/escrows
 * Get escrow-specific statistics
 */
router.get('/escrows', async (req: Request, res: Response) => {
  try {
    const { period = '7d' } = req.query;
    
    // Calculate time range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'all':
        startDate = new Date(0);
        break;
    }

    // Try cache first
    const cacheKey = `${CACHE_KEYS.ESCROW_STATS}:${period}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    // Fetch escrow stats
    const [
      newEscrows,
      completedEscrows,
      disputedEscrows,
      totalValue,
      releasedValue,
      topKOLs,
      topProjects,
    ] = await Promise.all([
      // New escrows in period
      db.escrow.count({
        where: {
          createdAt: { gte: startDate }
        }
      }),
      
      // Completed in period
      db.escrow.count({
        where: {
          status: 'COMPLETED',
          updatedAt: { gte: startDate }
        }
      }),
      
      // Disputed in period
      db.escrow.count({
        where: {
          status: 'DISPUTED',
          updatedAt: { gte: startDate }
        }
      }),
      
      // Total value locked (fetch and calculate since fields are strings)
      db.escrow.findMany({
        where: {
          status: 'ACTIVE'
        },
        select: {
          totalAmount: true
        }
      }),
      
      // Released value in period (fetch and calculate since fields are strings)
      db.escrow.findMany({
        where: {
          status: 'COMPLETED',
          updatedAt: { gte: startDate }
        },
        select: {
          releasedAmount: true
        }
      }),
      
      // Top KOLs by escrow count
      db.escrow.groupBy({
        by: ['kolAddress'],
        _count: true,
        orderBy: {
          _count: {
            kolAddress: 'desc'
          }
        },
        take: 10,
      }),
      
      // Top projects by escrow count
      db.escrow.groupBy({
        by: ['projectAddress'],
        _count: true,
        orderBy: {
          _count: {
            projectAddress: 'desc'
          }
        },
        take: 10,
      }),
    ]);

    // Get user details for top KOLs and projects
    const kolAddresses = topKOLs.map(k => k.kolAddress);
    const projectAddresses = topProjects.map(p => p.projectAddress);
    
    const [kolUsers, projectUsers] = await Promise.all([
      db.user.findMany({
        where: { address: { in: kolAddresses } },
        select: { address: true, name: true }
      }),
      db.user.findMany({
        where: { address: { in: projectAddresses } },
        select: { address: true, name: true }
      }),
    ]);

    const kolMap = new Map(kolUsers.map(u => [u.address, u]));
    const projectMap = new Map(projectUsers.map(u => [u.address, u]));

    const stats = {
      period,
      newEscrows,
      completedEscrows,
      disputedEscrows,
      totalValueLocked: totalValue.reduce((sum, e) => sum + parseFloat(e.totalAmount || '0'), 0).toString(),
      releasedValue: releasedValue.reduce((sum, e) => sum + parseFloat(e.releasedAmount || '0'), 0).toString(),
      successRate: (newEscrows + completedEscrows) > 0 
        ? ((completedEscrows / (newEscrows + completedEscrows)) * 100).toFixed(2) 
        : '0',
      topKOLs: topKOLs.map(k => ({
        address: k.kolAddress,
        name: kolMap.get(k.kolAddress)?.name || 'Unknown',
        escrowCount: k._count,
      })),
      topProjects: topProjects.map(p => ({
        address: p.projectAddress,
        name: projectMap.get(p.projectAddress)?.name || 'Unknown',
        escrowCount: p._count,
      })),
      timestamp: new Date().toISOString(),
    };

    // Cache for 5 minutes
    await cacheService.set(cacheKey, stats, 300);

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Escrow stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch escrow statistics' 
    });
  }
});

/**
 * GET /api/stats/volume
 * Get trading volume statistics
 */
router.get('/volume', async (req: Request, res: Response) => {
  try {
    const { period = '7d', interval = 'daily' } = req.query;
    
    // Calculate time range
    const now = new Date();
    let startDate = new Date();
    let groupBy: 'hour' | 'day' | 'week' = 'day';
    
    switch (period) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        groupBy = 'hour';
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        groupBy = 'day';
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        groupBy = interval === 'daily' ? 'day' : 'week';
        break;
    }

    // Try cache first
    const cacheKey = `${CACHE_KEYS.VOLUME_STATS}${period}:${interval}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    // Fetch trades for period
    const trades = await db.trade.findMany({
      where: {
        timestamp: { gte: startDate }
      },
      select: {
        timestamp: true,
        type: true,
        totalCost: true,
        totalReceived: true,
      },
      orderBy: { timestamp: 'asc' }
    });

    // Group by interval
    const volumeData: Record<string, { buy: number; sell: number; total: number }> = {};
    
    trades.forEach(trade => {
      let key: string;
      const date = new Date(trade.timestamp);
      
      if (groupBy === 'hour') {
        key = `${date.toISOString().slice(0, 13)}:00`;
      } else if (groupBy === 'day') {
        key = date.toISOString().slice(0, 10);
      } else {
        // Week
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().slice(0, 10);
      }
      
      if (!volumeData[key]) {
        volumeData[key] = { buy: 0, sell: 0, total: 0 };
      }
      
      if (trade.type === 'BUY') {
        const amount = parseFloat(trade.totalCost || '0');
        volumeData[key].buy += amount;
        volumeData[key].total += amount;
      } else {
        const amount = parseFloat(trade.totalReceived || '0');
        volumeData[key].sell += amount;
        volumeData[key].total += amount;
      }
    });

    // Convert to array and sort
    const volumeArray = Object.entries(volumeData)
      .map(([timestamp, data]) => ({
        timestamp,
        ...data,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Calculate totals
    const totals = volumeArray.reduce((acc, curr) => ({
      buy: acc.buy + curr.buy,
      sell: acc.sell + curr.sell,
      total: acc.total + curr.total,
    }), { buy: 0, sell: 0, total: 0 });

    const stats = {
      period,
      interval: groupBy,
      data: volumeArray,
      totals,
      timestamp: new Date().toISOString(),
    };

    // Cache for 5 minutes
    await cacheService.set(cacheKey, stats, 300);

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Volume stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch volume statistics' 
    });
  }
});

export default router;