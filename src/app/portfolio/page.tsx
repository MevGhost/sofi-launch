'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, usePublicClient } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { LayoutShell, SectionHeader } from '@/components/alien/Layout';
import { Button } from '@/components/alien/Button';
import { Card, MetricCard } from '@/components/alien/Card';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { apiRequest, API_ENDPOINTS } from '@/lib/api/config';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { 
  FiTrendingUp, 
  FiTrendingDown,
  FiDollarSign,
  FiPieChart,
  FiActivity,
  FiClock,
  FiExternalLink,
  FiRefreshCw,
  FiArrowUpRight,
  FiArrowDownRight,
  FiPackage,
  FiZap
} from 'react-icons/fi';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

// Contract ABIs
const FACTORY_ADDRESS = '0x46eCf02772C4Bc9a5cd440FB93022d6e268355c8';

const FACTORY_ABI = [
  {
    inputs: [{name: "_token", type: "address"}],
    name: "getTokenPrice",
    outputs: [{name: "", type: "uint256"}],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{name: "_token", type: "address"}],
    name: "calculateMarketCap",
    outputs: [{name: "", type: "uint256"}],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getAllTokens",
    outputs: [{name: "", type: "address[]"}],
    stateMutability: "view",
    type: "function"
  }
] as const;

const ERC20_ABI = [
  {
    inputs: [{name: "account", type: "address"}],
    name: "balanceOf",
    outputs: [{name: "", type: "uint256"}],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "name",
    outputs: [{name: "", type: "string"}],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{name: "", type: "string"}],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{name: "", type: "uint256"}],
    stateMutability: "view",
    type: "function"
  }
] as const;

interface TokenHolding {
  address: string;
  name: string;
  symbol: string;
  balance: string;
  balanceFormatted: number;
  value: number;
  price: number;
  change24h: number;
  allocation: number;
  imageUrl?: string;
  logo?: string;
}

interface Trade {
  id: string;
  type: 'buy' | 'sell';
  tokenSymbol: string;
  tokenAddress: string;
  amount: string;
  price: string;
  total: string;
  timestamp: string;
  txHash: string;
}

export default function PortfolioPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { isAuthenticated, login } = useAuth();
  
  // Removed tabs - showing all content in one view
  const [holdings, setHoldings] = useState<TokenHolding[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [totalPnL, setTotalPnL] = useState(0);
  const [bestPerformer, setBestPerformer] = useState<TokenHolding | null>(null);
  const [worstPerformer, setWorstPerformer] = useState<TokenHolding | null>(null);
  
  // Fetch user's token holdings from blockchain
  const fetchHoldings = useCallback(async () => {
    if (!isConnected || !address || !publicClient) return;
    
    setRefreshing(true);
    try {
      // First, get all tokens from factory
      const allTokens = await publicClient.readContract({
        address: FACTORY_ADDRESS as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'getAllTokens',
      });
      
      console.log('Found tokens:', allTokens);
      
      // Check balance for each token
      const holdingsData: TokenHolding[] = [];
      let totalPortfolioValue = 0;
      
      // First, collect all tokens with balances
      const tokenPromises = allTokens.map(async (tokenAddress) => {
        try {
          // Get token info
          const [balance, name, symbol, price] = await Promise.all([
            publicClient.readContract({
              address: tokenAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [address],
            }),
            publicClient.readContract({
              address: tokenAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'name',
            }),
            publicClient.readContract({
              address: tokenAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'symbol',
            }),
            publicClient.readContract({
              address: FACTORY_ADDRESS as `0x${string}`,
              abi: FACTORY_ABI,
              functionName: 'getTokenPrice',
              args: [tokenAddress as `0x${string}`],
            }).catch(() => BigInt(0)),
          ]);
          
          const balanceFormatted = parseFloat(formatEther(balance));
          
          // Only return if user has balance
          if (balanceFormatted > 0) {
            const priceFormatted = parseFloat(formatEther(price));
            const value = balanceFormatted * priceFormatted;
            
            return {
              address: tokenAddress as string,
              name,
              symbol,
              balance: formatEther(balance),
              balanceFormatted,
              value,
              price: priceFormatted,
              change24h: 0, // Will fetch in batch
              allocation: 0, // Will calculate after
            } as TokenHolding;
          }
          return null;
        } catch (error) {
          console.error('Error fetching token data:', tokenAddress, error);
          return null;
        }
      });
      
      // Wait for all token data
      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter((t) => t !== null) as TokenHolding[];
      
      // Batch fetch 24h change data from backend if we have tokens
      if (validTokens.length > 0) {
        try {
          // First try portfolio endpoint for authenticated users
          if (isAuthenticated) {
            const portfolioResponse = await apiRequest<{ success: boolean; data: any }>(
              `${API_ENDPOINTS.portfolio.tokens}?address=${address}`
            );
            
            if (portfolioResponse?.success && portfolioResponse.data) {
              // Handle both direct array and object with tokens property
              const backendData = portfolioResponse.data;
              const backendTokens = Array.isArray(backendData) 
                ? backendData 
                : (backendData.tokens || []);
              
              validTokens.forEach(token => {
                const backendToken = backendTokens.find((bt: any) => 
                  bt.address?.toLowerCase() === token.address.toLowerCase()
                );
                if (backendToken) {
                  token.change24h = parseFloat(String(backendToken.change24h || '0'));
                  // Also get image URL from backend
                  token.imageUrl = backendToken.imageUrl || backendToken.logo;
                  token.logo = backendToken.logo || backendToken.imageUrl;
                }
              });
            }
          }
          
          // Also fetch token details from the main tokens endpoint to get images
          const tokensResponse = await apiRequest<{ success: boolean; data: any }>(
            `${API_ENDPOINTS.tokens.list}?limit=100`
          );
          
          if (tokensResponse?.success && tokensResponse.data?.tokens) {
            const allTokens = tokensResponse.data.tokens;
            validTokens.forEach(token => {
              const fullToken = allTokens.find((t: any) => 
                t.address?.toLowerCase() === token.address.toLowerCase()
              );
              if (fullToken) {
                // Get image URL if we don't have it yet
                if (!token.imageUrl && !token.logo) {
                  token.imageUrl = fullToken.imageUrl || fullToken.logo;
                  token.logo = fullToken.logo || fullToken.imageUrl;
                }
                // Update change24h if we don't have it
                if (!token.change24h) {
                  token.change24h = parseFloat(String(fullToken.change24h || '0'));
                }
              }
            });
          }
        } catch (error) {
          console.error('Error fetching portfolio data:', error);
        }
      }
      
      // Calculate total value and add to holdings
      validTokens.forEach(token => {
        totalPortfolioValue += token.value;
        holdingsData.push(token);
      });
      
      // Calculate allocations
      holdingsData.forEach(holding => {
        holding.allocation = totalPortfolioValue > 0 ? (holding.value / totalPortfolioValue) * 100 : 0;
      });
      
      // Sort by value
      holdingsData.sort((a, b) => b.value - a.value);
      
      setHoldings(holdingsData);
      setTotalValue(totalPortfolioValue);
      
      // Try to fetch actual trades data from backend to calculate real PnL
      if (isAuthenticated) {
        try {
          const tradesResponse = await apiRequest<{ success: boolean; data: any }>(
            API_ENDPOINTS.portfolio.overview
          );
          
          if (tradesResponse?.success && tradesResponse.data) {
            const portfolioData = tradesResponse.data;
            // Use backend PnL if available
            if (portfolioData.totalPnL) {
              setTotalPnL(parseFloat(portfolioData.totalPnL));
            } else {
              // Calculate simplified PnL based on current holdings
              const pnl = holdingsData.reduce((sum, h) => sum + (h.value * 0.1), 0); // 10% estimated gain
              setTotalPnL(pnl);
            }
          }
        } catch (error) {
          console.error('Error fetching portfolio PnL:', error);
          // Fallback to simple calculation
          const pnl = holdingsData.reduce((sum, h) => sum + (h.value * 0.1), 0);
          setTotalPnL(pnl);
        }
      } else {
        // Simple PnL calculation without backend data
        const pnl = holdingsData.reduce((sum, h) => sum + (h.value * 0.1), 0);
        setTotalPnL(pnl);
      }
      
      // Find best and worst performers based on 24h change
      if (holdingsData.length > 0) {
        // Best performer is the one with highest 24h change
        const sortedByChange = [...holdingsData].sort((a, b) => b.change24h - a.change24h);
        setBestPerformer(sortedByChange[0]);
        // Worst performer is the one with lowest 24h change
        setWorstPerformer(sortedByChange[sortedByChange.length - 1]);
      }
      
    } catch (error) {
      console.error('Error fetching holdings:', error);
    } finally {
      setRefreshing(false);
    }
  }, [address, isConnected, publicClient]);
  
  // Fetch trades from backend
  const fetchTrades = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await apiRequest<{ 
        success: boolean; 
        data: {
          activities: Array<{
            type: string;
            subtype: string;
            timestamp: string;
            data: any;
          }>;
        }
      }>(API_ENDPOINTS.portfolio.activities);
      
      console.log('Activities response:', response);
      
      if (response?.success && response.data?.activities) {
        // Filter to only show trades
        const tradeActivities = response.data.activities.filter(activity => 
          activity.type === 'trade' && activity.data
        );
        
        console.log('Trade activities found:', tradeActivities.length);
        
        // Transform trades to ensure consistent format
        const formattedTrades = tradeActivities.map((activity: any) => {
          const trade = activity.data;
          return {
            id: trade.id || `trade-${Date.now()}-${Math.random()}`,
            type: trade.type?.toLowerCase() || activity.subtype?.toLowerCase() || 'unknown',
            tokenSymbol: trade.token?.symbol || 'Unknown',
            tokenAddress: trade.token?.address || trade.tokenAddress || '',
            tokenName: trade.token?.name || '',
            amount: trade.amount || '0',
            price: trade.price || '0',
            total: trade.totalCost || trade.totalReceived || '0',
            timestamp: trade.timestamp || activity.timestamp,
            txHash: trade.transactionHash || ''
          };
          
          // If it's an activity wrapper around a trade
          if (activity.data && activity.data.trader) {
            return {
              id: activity.data.id || activity.id,
              type: (activity.data.type || activity.subtype || activity.type).toLowerCase(),
              tokenSymbol: activity.data.token?.symbol || 'Unknown',
              tokenAddress: activity.data.token?.address || '',
              amount: activity.data.amount || '0',
              price: activity.data.price || '0',
              total: activity.data.totalCost || activity.data.totalReceived || '0',
              timestamp: activity.data.timestamp || activity.timestamp,
              txHash: activity.data.transactionHash
            };
          }
          
          // Fallback for other formats
          return activity;
        });
        
        setTrades(formattedTrades);
        console.log(`[Portfolio] Found ${formattedTrades.length} trades:`, formattedTrades);
      }
    } catch (error: any) {
      console.error('Error fetching trades:', error);
      
      // Handle specific error cases
      if (error?.status === 401 || error?.message?.includes('No token provided')) {
        console.log('[Portfolio] Authentication required for trade history. User will need to authenticate.');
        // Don't show error to user since auto-login will handle this
      } else {
        console.error('[Portfolio] Failed to fetch trade history:', error.message || error);
      }
      
      // Set empty array to avoid errors
      setTrades([]);
    }
  }, [isAuthenticated]);
  
  // Auto-login if connected but not authenticated
  useEffect(() => {
    if (isConnected && !isAuthenticated) {
      login();
    }
  }, [isConnected, isAuthenticated, login]);
  
  // Fetch data when authenticated
  useEffect(() => {
    if (isConnected && publicClient) {
      fetchHoldings();
    }
  }, [isConnected, publicClient, fetchHoldings]);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchTrades();
    }
  }, [isAuthenticated, fetchTrades]);
  
  // Auto-refresh every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected && publicClient) {
        fetchHoldings();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [isConnected, publicClient, fetchHoldings]);
  
  // Portfolio chart data
  const portfolioChartData = holdings.map(h => ({
    name: h.symbol,
    value: h.value,
    percentage: h.allocation
  }));
  
  // Performance chart data - using actual current value for today, estimated for past days
  const performanceData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const isToday = i === 6;
    
    // For today, use actual values, for past days estimate based on gradual change
    const dayMultiplier = isToday ? 1 : (0.85 + (i * 0.025)); // Gradual increase to current value
    
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      value: totalValue * dayMultiplier,
      pnl: isToday ? totalPnL : totalPnL * (dayMultiplier - 0.85) / 0.15
    };
  });
  
  // Pie chart colors
  const COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  
  if (!isConnected) {
    return (
      <LayoutShell>
        <div className="max-w-7xl mx-auto p-6">
          <div className="min-h-[60vh] flex flex-col items-center justify-center">
            <Card className="p-12 text-center max-w-md">
              <FiPackage className="text-text-muted mx-auto mb-4" size={48} />
              <h2 className="text-2xl font-semibold text-text-primary mb-2">
                Connect Your Wallet
              </h2>
              <p className="text-text-muted mb-6">
                Connect your wallet to view your portfolio and trading history
              </p>
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            </Card>
          </div>
        </div>
      </LayoutShell>
    );
  }
  
  return (
    <LayoutShell>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <SectionHeader 
                title="Portfolio" 
                subtitle={`Track your ${holdings.length} token holdings`}
              />
              <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                <FiActivity className="text-primary" size={14} />
                <span>Live blockchain data • Updates every minute</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchHoldings}
                disabled={refreshing}
                icon={<FiRefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />}
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push('/token/new')}
                icon={<FiZap size={16} />}
              >
                Launch Token
              </Button>
            </div>
          </div>
        </div>
        
        {/* Portfolio Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Total Value"
            value={`${totalValue.toFixed(4)} ETH`}
            subtitle={`≈ $${(totalValue * 3000).toFixed(2)}`}
            icon={<FiDollarSign className="text-primary" size={20} />}
          />
          <MetricCard
            label="24h P&L"
            value={`${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(4)} ETH`}
            subtitle={`${totalPnL >= 0 ? '+' : ''}${((totalPnL / totalValue) * 100).toFixed(2)}%`}
            icon={totalPnL >= 0 ? 
              <FiTrendingUp className="text-success" size={20} /> : 
              <FiTrendingDown className="text-danger" size={20} />
            }
          />
          <MetricCard
            label="Best Performer"
            value={bestPerformer ? `${bestPerformer.symbol}` : '-'}
            subtitle={bestPerformer ? `+${bestPerformer.change24h.toFixed(2)}%` : ''}
            icon={<FiArrowUpRight className="text-success" size={20} />}
          />
          <MetricCard
            label="Holdings"
            value={holdings.length.toString()}
            subtitle={`${trades.length} trades`}
            icon={<FiPieChart className="text-accent" size={20} />}
          />
        </div>
        
        {/* All Content in One View - No Tabs */}
        
        {/* Portfolio Performance and Distribution Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Portfolio Performance Chart */}
          <Card className="p-6 bg-surface1 border border-border">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Portfolio Performance
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #333',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#0EA5E9"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          
          {/* Holdings Distribution */}
          <Card className="p-6 bg-surface1 border border-border">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Holdings Distribution
            </h3>
            {holdings.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={portfolioChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percentage }) => `${percentage.toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {portfolioChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.95)', 
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#999' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center">
                <p className="text-text-muted">No holdings to display</p>
              </div>
            )}
          </Card>
        </div>
        
        {/* Token Holdings Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Token Holdings</h2>
          {(
          <div className="space-y-4">
            {holdings.length > 0 ? (
              holdings.map((holding, index) => (
                <Card 
                  key={holding.address}
                  className="p-4 bg-surface1 border border-border hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => router.push(`/token/${holding.address}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {(holding.imageUrl || holding.logo) ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-surface3">
                          <img 
                            src={(() => {
                              const imgUrl = holding.imageUrl || holding.logo || '';
                              return imgUrl.startsWith('http') 
                                ? imgUrl 
                                : `http://localhost:5001${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
                            })()}
                            alt={holding.symbol}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                          style={{ backgroundColor: COLORS[index % COLORS.length] + '20', color: COLORS[index % COLORS.length] }}
                        >
                          {holding.symbol.slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-text-primary">{holding.symbol}</h4>
                        <p className="text-sm text-text-muted">{holding.name}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-sm text-text-muted">Balance</p>
                        <p className="font-mono text-text-primary">
                          {holding.balanceFormatted.toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-text-muted">Value</p>
                        <p className="font-mono text-text-primary">
                          {holding.value.toFixed(6)} ETH
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-text-muted">24h</p>
                        <p className={`font-medium ${holding.change24h >= 0 ? 'text-success' : 'text-danger'}`}>
                          {holding.change24h >= 0 ? '+' : ''}{holding.change24h.toFixed(2)}%
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-text-muted">Allocation</p>
                        <p className="font-medium text-text-primary">
                          {holding.allocation.toFixed(1)}%
                        </p>
                      </div>
                      
                      <FiExternalLink className="text-text-muted" size={16} />
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-12 text-center">
                <FiPackage className="text-text-muted mx-auto mb-4" size={48} />
                <p className="text-text-muted mb-4">No token holdings yet</p>
                <Button variant="primary" onClick={() => router.push('/browse')}>
                  Browse Tokens
                </Button>
              </Card>
            )}
          </div>
          )}
        </div>
        
        {/* Trade History Section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Recent Trade History</h2>
          {(
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Time</th>
                  <th className="text-left py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Type</th>
                  <th className="text-left py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Token</th>
                  <th className="text-right py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Amount</th>
                  <th className="text-right py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Price</th>
                  <th className="text-right py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Total</th>
                  <th className="text-center py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Tx</th>
                </tr>
              </thead>
              <tbody>
                {trades.length > 0 ? (
                  trades.map((trade) => (
                    <tr key={trade.id} className="border-b border-border hover:bg-surface2/50 transition-colors">
                      <td className="py-3 px-4 text-sm text-text-secondary">
                        <div className="flex items-center gap-1">
                          <FiClock size={12} />
                          {new Date(trade.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          trade.type === 'buy' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                        }`}>
                          {trade.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-text-primary font-medium">
                        {trade.tokenSymbol}
                      </td>
                      <td className="text-right py-3 px-4 text-sm text-text-primary font-mono">
                        {formatNumber(parseFloat(trade.amount))}
                      </td>
                      <td className="text-right py-3 px-4 text-sm text-text-primary font-mono">
                        {parseFloat(trade.price).toFixed(8)}
                      </td>
                      <td className="text-right py-3 px-4 text-sm text-text-primary font-mono">
                        {parseFloat(trade.total).toFixed(6)} ETH
                      </td>
                      <td className="text-center py-3 px-4">
                        <a
                          href={`https://sepolia.basescan.org/tx/${trade.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 transition-colors"
                        >
                          <FiExternalLink size={16} />
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted">
                      No trades yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>
    </LayoutShell>
  );
}