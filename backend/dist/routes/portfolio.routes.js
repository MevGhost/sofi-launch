"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const database_service_1 = require("../services/database.service");
const cache_service_1 = require("../services/cache.service");
const router = (0, express_1.Router)();
// Cache keys
const CACHE_KEYS = {
    PORTFOLIO: 'portfolio:',
    PORTFOLIO_TOKENS: 'portfolio:tokens:',
    PORTFOLIO_ESCROWS: 'portfolio:escrows:',
    PORTFOLIO_ACTIVITIES: 'portfolio:activities:',
    PORTFOLIO_PNL: 'portfolio:pnl:',
};
/**
 * GET /api/portfolio
 * Get user's portfolio overview
 */
router.get('/', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userAddress = req.user.address;
        // Try cache first
        const cacheKey = `${CACHE_KEYS.PORTFOLIO}${userAddress}`;
        const cached = await cache_service_1.escrowCache.get(cacheKey);
        if (cached) {
            return res.json({ success: true, data: cached });
        }
        // Fetch portfolio data
        const [tokens, escrows, trades] = await Promise.all([
            // Get user's token holdings
            database_service_1.db.tokenHolder.findMany({
                where: {
                    userId: req.user.userId,
                    balance: { gt: '0' }
                },
                include: {
                    token: {
                        select: {
                            address: true,
                            name: true,
                            symbol: true,
                            marketCap: true,
                            bondingProgress: true,
                            change24h: true,
                            totalSupply: true,
                        }
                    }
                }
            }),
            // Get user's escrows
            database_service_1.db.escrow.findMany({
                where: {
                    OR: [
                        { projectAddress: userAddress },
                        { kolAddress: userAddress }
                    ]
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
            // Get recent trades
            database_service_1.db.trade.findMany({
                where: { trader: userAddress },
                orderBy: { timestamp: 'desc' },
                take: 20,
            })
        ]);
        // Calculate portfolio metrics
        const totalValue = tokens.reduce((sum, holding) => {
            const price = parseFloat(holding.token.marketCap) / parseFloat(holding.token.totalSupply || '1000000000');
            const value = parseFloat(holding.balance) * price;
            return sum + value;
        }, 0);
        const totalPnL = tokens.reduce((sum, holding) => {
            const price = parseFloat(holding.token.marketCap) / parseFloat(holding.token.totalSupply || '1000000000');
            const currentValue = parseFloat(holding.balance) * price;
            const costBasis = parseFloat(holding.totalBought) - parseFloat(holding.totalSold);
            return sum + (currentValue - costBasis);
        }, 0);
        const portfolio = {
            totalValue: totalValue.toString(),
            totalPnL: totalPnL.toString(),
            totalPnLPercent: totalValue > 0 ? ((totalPnL / totalValue) * 100).toFixed(2) : '0',
            holdingsCount: tokens.length,
            escrowsCount: escrows.length,
            tradesCount: trades.length,
            tokens: tokens.slice(0, 10), // Top 10 holdings
            recentEscrows: escrows.slice(0, 5),
            recentTrades: trades.slice(0, 10),
        };
        // Cache for 1 minute
        await cache_service_1.escrowCache.set(cacheKey, portfolio, 60);
        res.json({ success: true, data: portfolio });
    }
    catch (error) {
        console.error('Portfolio fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch portfolio'
        });
    }
});
/**
 * GET /api/portfolio/tokens
 * Get user's token holdings (public endpoint with address parameter)
 */
router.get('/tokens', async (req, res) => {
    try {
        // Get address from query parameter for public access
        const userAddress = req.query.address || req.user?.address;
        if (!userAddress) {
            return res.status(400).json({
                success: false,
                error: 'Address parameter is required'
            });
        }
        const { limit = '50', offset = '0', sortBy = 'value' } = req.query;
        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);
        // Try cache first
        const cacheKey = `${CACHE_KEYS.PORTFOLIO_TOKENS}${userAddress}:${sortBy}:${limit}:${offset}`;
        const cached = await cache_service_1.escrowCache.get(cacheKey);
        if (cached) {
            return res.json({ success: true, data: cached });
        }
        // Get user from database
        const user = await database_service_1.db.getUserByAddress(userAddress);
        if (!user) {
            return res.json({ success: true, data: { tokens: [], stats: null } });
        }
        // Fetch token holdings
        const holdings = await database_service_1.db.tokenHolder.findMany({
            where: {
                userId: user.id,
                balance: { gt: '0' }
            },
            include: {
                token: true
            },
            skip: offsetNum,
            take: limitNum,
        });
        // Sort based on sortBy parameter
        const sortedHoldings = holdings.sort((a, b) => {
            switch (sortBy) {
                case 'value':
                    const valueA = parseFloat(a.balance) * parseFloat(a.token.marketCap);
                    const valueB = parseFloat(b.balance) * parseFloat(b.token.marketCap);
                    return valueB - valueA;
                case 'balance':
                    return parseFloat(b.balance) - parseFloat(a.balance);
                case 'pnl':
                    const pnlA = (parseFloat(a.balance) * parseFloat(a.token.marketCap)) - (parseFloat(a.totalBought) - parseFloat(a.totalSold));
                    const pnlB = (parseFloat(b.balance) * parseFloat(b.token.marketCap)) - (parseFloat(b.totalBought) - parseFloat(b.totalSold));
                    return pnlB - pnlA;
                default:
                    return 0;
            }
        });
        const total = await database_service_1.db.tokenHolder.count({
            where: {
                userId: user.id,
                balance: { gt: '0' }
            }
        });
        // Calculate stats for the portfolio
        const totalValue = sortedHoldings.reduce((sum, holding) => {
            const price = parseFloat(holding.token.marketCap) / parseFloat(holding.token.totalSupply || '1000000000');
            const value = parseFloat(holding.balance) * price;
            return sum + value;
        }, 0);
        const totalPnL = sortedHoldings.reduce((sum, holding) => {
            const price = parseFloat(holding.token.marketCap) / parseFloat(holding.token.totalSupply || '1000000000');
            const currentValue = parseFloat(holding.balance) * price;
            const costBasis = parseFloat(holding.totalBought) - parseFloat(holding.totalSold);
            return sum + (currentValue - costBasis);
        }, 0);
        // Transform holdings to match frontend expectations
        const formattedTokens = sortedHoldings.map(holding => {
            // Use market cap as a proxy for price (marketCap / totalSupply)
            const price = parseFloat(holding.token.marketCap) / parseFloat(holding.token.totalSupply || '1000000000');
            const currentValue = parseFloat(holding.balance) * price;
            const costBasis = parseFloat(holding.totalBought) - parseFloat(holding.totalSold);
            const pnl = currentValue - costBasis;
            const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
            const allocation = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
            return {
                address: holding.token.address,
                name: holding.token.name,
                symbol: holding.token.symbol,
                logo: holding.token.imageUrl,
                balance: parseFloat(holding.balance),
                value: currentValue.toString(),
                cost: costBasis.toString(),
                pnl: pnl.toString(),
                pnlPercent: pnlPercent.toString(),
                allocation: allocation.toString(),
                change24h: holding.token.change24h || 0,
                volume24h: holding.token.volume24h || '0',
            };
        });
        const result = {
            tokens: formattedTokens,
            stats: {
                totalValue: totalValue.toString(),
                totalPnL: totalPnL.toString(),
                totalPnLPercent: totalValue > 0 ? ((totalPnL / totalValue) * 100) : 0,
                tokensHeld: total
            },
            total,
            limit: limitNum,
            offset: offsetNum,
        };
        // Cache for 30 seconds
        await cache_service_1.escrowCache.set(cacheKey, result, 30);
        res.json({ success: true, data: result });
    }
    catch (error) {
        console.error('Portfolio tokens error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch token holdings'
        });
    }
});
/**
 * GET /api/portfolio/escrows
 * Get user's escrows
 */
router.get('/escrows', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userAddress = req.user.address;
        const { limit = '20', offset = '0', status = 'all' } = req.query;
        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);
        const whereClause = {
            OR: [
                { projectAddress: userAddress },
                { kolAddress: userAddress }
            ]
        };
        if (status !== 'all') {
            whereClause.status = status;
        }
        const [escrows, total] = await Promise.all([
            database_service_1.db.escrow.findMany({
                where: whereClause,
                include: {
                    milestones: true,
                    projectUser: {
                        select: {
                            address: true,
                            name: true,
                        }
                    },
                    kolUser: {
                        select: {
                            address: true,
                            name: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: offsetNum,
                take: limitNum,
            }),
            database_service_1.db.escrow.count({ where: whereClause })
        ]);
        res.json({
            success: true,
            data: {
                escrows,
                total,
                limit: limitNum,
                offset: offsetNum,
            }
        });
    }
    catch (error) {
        console.error('Portfolio escrows error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch escrows'
        });
    }
});
/**
 * GET /api/portfolio/activities
 * Get user's recent activities
 */
router.get('/activities', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userAddress = req.user.address;
        const { limit = '50', offset = '0' } = req.query;
        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);
        // Fetch both trades and escrow activities
        const [trades, activities] = await Promise.all([
            database_service_1.db.trade.findMany({
                where: { trader: userAddress },
                include: {
                    token: {
                        select: {
                            name: true,
                            symbol: true,
                            address: true,
                        }
                    }
                },
                orderBy: { timestamp: 'desc' },
                skip: offsetNum,
                take: limitNum,
            }),
            database_service_1.db.activity.findMany({
                where: { userAddress },
                orderBy: { createdAt: 'desc' },
                skip: offsetNum,
                take: limitNum,
            })
        ]);
        // Combine and sort by date
        const allActivities = [
            ...trades.map(t => ({
                type: 'trade',
                subtype: t.type,
                timestamp: t.timestamp,
                data: t,
            })),
            ...activities.map(a => ({
                type: 'activity',
                subtype: a.action,
                timestamp: a.createdAt,
                data: a,
            }))
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limitNum);
        res.json({
            success: true,
            data: {
                activities: allActivities,
                limit: limitNum,
                offset: offsetNum,
            }
        });
    }
    catch (error) {
        console.error('Portfolio activities error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activities'
        });
    }
});
/**
 * GET /api/portfolio/pnl
 * Get user's profit/loss data
 */
router.get('/pnl', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userAddress = req.user.address;
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
        // Fetch trades within period
        const trades = await database_service_1.db.trade.findMany({
            where: {
                trader: userAddress,
                timestamp: { gte: startDate }
            },
            include: {
                token: {
                    select: {
                        symbol: true,
                        marketCap: true,
                    }
                }
            },
            orderBy: { timestamp: 'asc' }
        });
        // Calculate PnL
        const pnlByToken = {};
        let totalBought = 0;
        let totalSold = 0;
        trades.forEach(trade => {
            const tokenId = trade.tokenId;
            if (!pnlByToken[tokenId]) {
                pnlByToken[tokenId] = {
                    symbol: trade.token.symbol,
                    bought: 0,
                    sold: 0,
                    currentPrice: parseFloat(trade.token.marketCap),
                    trades: []
                };
            }
            if (trade.type === 'BUY') {
                pnlByToken[tokenId].bought += parseFloat(trade.totalCost || '0');
                totalBought += parseFloat(trade.totalCost || '0');
            }
            else {
                pnlByToken[tokenId].sold += parseFloat(trade.totalReceived || '0');
                totalSold += parseFloat(trade.totalReceived || '0');
            }
            pnlByToken[tokenId].trades.push(trade);
        });
        // Calculate realized and unrealized PnL
        let realizedPnL = 0;
        let unrealizedPnL = 0;
        for (const tokenId in pnlByToken) {
            const token = pnlByToken[tokenId];
            const netCost = token.bought - token.sold;
            if (netCost < 0) {
                // Fully sold - realized PnL
                realizedPnL += Math.abs(netCost);
            }
            else {
                // Still holding - unrealized PnL
                const holding = await database_service_1.db.tokenHolder.findFirst({
                    where: {
                        tokenId,
                        userId: req.user.userId
                    }
                });
                if (holding) {
                    const currentValue = parseFloat(holding.balance) * token.currentPrice;
                    unrealizedPnL += currentValue - netCost;
                }
            }
        }
        const totalPnL = realizedPnL + unrealizedPnL;
        const roi = totalBought > 0 ? ((totalPnL / totalBought) * 100) : 0;
        res.json({
            success: true,
            data: {
                totalPnL: totalPnL.toString(),
                realizedPnL: realizedPnL.toString(),
                unrealizedPnL: unrealizedPnL.toString(),
                roi: roi.toFixed(2),
                totalBought: totalBought.toString(),
                totalSold: totalSold.toString(),
                period,
                byToken: Object.values(pnlByToken),
            }
        });
    }
    catch (error) {
        console.error('Portfolio PnL error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate PnL'
        });
    }
});
exports.default = router;
//# sourceMappingURL=portfolio.routes.js.map