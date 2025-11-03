'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEscrows, useDashboardStats } from '@/hooks/useEscrows';
import { formatTokenAmount, calculateEscrowProgress } from '@/lib/format';
import { useTokenPortfolio } from '@/hooks/useTokens';
import { useIsMobile } from '@/hooks/useIsMobile';
import { getTokenImageUrl } from '@/lib/image-utils';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { LayoutShell, SectionHeader, Tabs, Chip } from '@/components/alien/Layout';
import { Button } from '@/components/alien/Button';
import { Card, MetricCard } from '@/components/alien/Card';
import { Input } from '@/components/alien/Input';
import {
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiShield,
  FiArrowUpRight,
  FiArrowDownRight,
  FiPieChart,
  FiPlus,
  FiActivity,
  FiAlertTriangle,
  FiSearch,
  FiGrid,
  FiList,
  FiClock,
  FiCheckCircle,
  FiEdit3,
  FiEye,
  FiArrowRight,
  FiLock,
  FiUnlock,
  FiUsers,
  FiStar,
  FiBarChart2,
  FiCopy,
  FiCheck
} from 'react-icons/fi';

// Import recharts for data visualization
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, PieChart, Pie, Cell, LineChart, Line, BarChart, Bar } from 'recharts';

// Dynamically import mobile component
const MobilePortfolio = dynamic(
  () => import('@/components/mobile/MobilePortfolioV2'),
  { 
    loading: () => <div className="min-h-screen bg-canvas" />,
    ssr: false 
  }
);

interface PortfolioToken {
  token: {
    name: string;
    symbol: string;
    address: string;
    logo?: string;
  };
  balance: number;
  value: number;
  cost: number;
  profitLoss: number;
  profitLossPercentage: number;
  allocation: number;
  priceChange24h?: number;
  volume24h?: number;
}

export default function PortfolioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const isMobile = useIsMobile();
  const [portfolioHistory, setPortfolioHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'tokens' | 'escrows' | 'activity'>('tokens');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [checkingWallet, setCheckingWallet] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Use real portfolio API hook
  const { portfolio: portfolioData, stats: portfolioStats, loading: portfolioLoading, error: portfolioError } = useTokenPortfolio();
  
  // Process portfolio data for display
  const portfolio: PortfolioToken[] = portfolioData?.map(item => ({
    token: {
      name: item.name,
      symbol: item.symbol,
      address: item.address,
      logo: item.logo
    },
    balance: item.balance,
    value: parseFloat(item.value),
    cost: parseFloat(item.cost || '0'),
    profitLoss: parseFloat(item.pnl || '0'),
    profitLossPercentage: parseFloat(item.pnlPercent || '0'),
    allocation: parseFloat(item.allocation || '0'),
    priceChange24h: item.change24h || 0,
    volume24h: parseFloat(item.volume24h || '0')
  })) || [];

  const totalValue = parseFloat(portfolioStats?.totalValue || '0');
  const totalProfitLoss = parseFloat(portfolioStats?.totalPnL || '0');
  const totalProfitLossPercentage = portfolioStats?.totalPnLPercent || 0;
  const isLoading = portfolioLoading;
  
  // Handle URL parameter for tab switching
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'escrows') {
      setActiveTab('escrows');
    } else if (tab === 'tokens') {
      setActiveTab('tokens');
    } else if (tab === 'activity') {
      setActiveTab('activity');
    }
  }, [searchParams]);
  
  // Fetch escrow data
  const { escrows: creatorEscrows, loading: creatorLoading } = useEscrows('creator');
  const { escrows: kolEscrows, loading: kolLoading } = useEscrows('kol');
  const { stats: escrowStats } = useDashboardStats();

  useEffect(() => {
    // Give time for wallet connection to initialize
    const checkTimer = setTimeout(() => {
      setCheckingWallet(false);
    }, 500);

    return () => clearTimeout(checkTimer);
  }, []);

  useEffect(() => {
    if (!checkingWallet && !isConnected) {
      return;
    }
    
    if (!isConnected) {
      return;
    }

    // TODO: Fetch portfolio history from API when available
    // For now, show current value as a single data point
    const history = [{
      date: new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
      value: totalValue,
      volume: 0
    }];
    setPortfolioHistory(history);
  }, [isConnected, checkingWallet, totalValue]);

  const pieColors = ['#0EA5E9', '#06B6D4', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#3B82F6'];
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  // TODO: Fetch activity data from API
  // Will be populated from blockchain events and database
  const recentActivity: any[] = [];

  // Initialize particle effect  
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles: Array<{x: number, y: number, vx: number, vy: number, size: number, opacity: number}> = [];
    
    let seed = 12345;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: seededRandom() * canvas.width,
        y: seededRandom() * canvas.height,
        vx: (seededRandom() - 0.5) * 0.3,
        vy: (seededRandom() - 0.5) * 0.3,
        size: seededRandom() * 1.5 + 0.5,
        opacity: 0.05 + seededRandom() * 0.1
      });
    }
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(14, 165, 233, ${particle.opacity})`;
        ctx.fill();
      });
      
      requestAnimationFrame(animate);
    };
    
    animate();
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show wallet required message if not connected
  if (!checkingWallet && !isConnected) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <div className="w-24 h-24 mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-cyan-500 rounded-full blur-xl opacity-50 animate-pulse" />
                <div className="relative w-full h-full bg-canvas rounded-full border-2 border-primary flex items-center justify-center">
                  <FiLock size={40} className="text-primary" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-text-primary mb-4">Wallet Required</h2>
              <p className="text-text-secondary mb-6">Connect your wallet to access portfolio analytics</p>
              
              <div className="inline-block">
                <ConnectButton />
              </div>
            </motion.div>
          </div>
        </div>
      </LayoutShell>
    );
  }
  
  // Show loading while checking wallet status
  if (checkingWallet) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-text-primary">Checking wallet status...</div>
        </div>
      </LayoutShell>
    );
  }

  // Show mobile version if on mobile device
  if (isMobile) {
    return <MobilePortfolio />;
  }

  return (
    <LayoutShell>
      {/* Floating particles effect */}
      <canvas 
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{ zIndex: 1 }}
      />
      
      <div className="px-6 py-8 relative" style={{ zIndex: 10 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-text-primary mb-2 flex items-center gap-3">
                Portfolio
                <Chip variant="success">LIVE</Chip>
              </h1>
              {address && (
                <div className="relative group inline-flex items-center gap-2">
                  <p 
                    className={`cursor-pointer transition-all duration-200 select-none ${
                      copiedAddress ? 'text-text-primary' : 'text-text-secondary'
                    } group-hover:blur-none blur-sm`}
                    onClick={() => {
                      navigator.clipboard.writeText(address);
                      setCopiedAddress(true);
                      setTimeout(() => setCopiedAddress(false), 2000);
                    }}
                  >
                    {address}
                  </p>
                  <div className={`transition-all duration-200 ${copiedAddress ? 'text-success' : 'text-text-muted opacity-0 group-hover:opacity-100'}`}>
                    {copiedAddress ? (
                      <FiCheck size={14} className="animate-pulse" />
                    ) : (
                      <FiCopy size={14} />
                    )}
                  </div>
                  {copiedAddress && (
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-surface3 px-2 py-1 rounded text-success whitespace-nowrap">
                      Copied!
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-4">
              <div className="flex gap-1 p-1 bg-surface2 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'grid'
                      ? 'bg-primary text-white'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  <FiGrid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'table'
                      ? 'bg-primary text-white'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  <FiList size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <Tabs
            value={activeTab}
            onChange={(value) => {
              setActiveTab(value as any);
              const url = new URL(window.location.href);
              url.searchParams.set('tab', value);
              window.history.pushState({}, '', url);
            }}
            tabs={[
              { 
                value: 'tokens', 
                label: 'Token Holdings',
                icon: <FiDollarSign size={18} />,
                badge: portfolio.length > 0 ? portfolio.length.toString() : undefined
              },
              { 
                value: 'escrows', 
                label: 'Escrow Deals',
                icon: <FiShield size={18} />,
                badge: (creatorEscrows.length + kolEscrows.length) > 0 ? (creatorEscrows.length + kolEscrows.length).toString() : undefined
              },
              { 
                value: 'activity', 
                label: 'Activity',
                icon: <FiActivity size={18} />,
                badge: recentActivity.length > 0 ? recentActivity.length.toString() : undefined
              }
            ]}
          />
        </motion.div>

        {/* Content based on active tab */}
        {activeTab === 'tokens' && (
          <>
            {/* Portfolio Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 items-stretch">
              <div>
                <MetricCard
                  label="Total Value"
                  value={`$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  icon={<FiDollarSign />}
                  change={{ value: '+100%', positive: true }}
                  className="min-h-[120px]"
                />
              </div>

              <div>
                <MetricCard
                  label="Total P&L"
                  value={`${totalProfitLoss >= 0 ? '+' : ''}$${Math.abs(totalProfitLoss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  icon={totalProfitLoss >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                  change={{ 
                    value: `${totalProfitLoss >= 0 ? '+' : '-'}${Math.abs(totalProfitLossPercentage).toFixed(1)}%`, 
                    positive: totalProfitLoss >= 0 
                  }}
                  className="min-h-[120px]"
                />
              </div>

              <div>
                <MetricCard
                  label="Holdings"
                  value={(portfolioStats?.tokensHeld || portfolio.length).toString()}
                  icon={<FiPieChart />}
                  className="min-h-[120px]"
                />
              </div>

              <div>
                <MetricCard
                  label="Top Gainer"
                  value={portfolio.length > 0 ? `$${portfolio.sort((a, b) => b.profitLossPercentage - a.profitLossPercentage)[0].token.symbol}` : '-'}
                  icon={<FiStar />}
                  change={portfolio.length > 0 ? {
                    value: `+${portfolio.sort((a, b) => b.profitLossPercentage - a.profitLossPercentage)[0].profitLossPercentage.toFixed(1)}%`,
                    positive: true
                  } : undefined}
                  className="min-h-[120px]"
                />
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Portfolio Performance Chart */}
              <div className="lg:col-span-2">
                <Card className="h-[400px]">
                  <div className="p-6 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-text-primary">Performance</h3>
                        <Chip variant="success">STREAMING</Chip>
                      </div>
                      <div className="flex gap-1 p-1 bg-surface2 rounded-lg">
                        {['24h', '7d', '30d', 'all'].map(tf => (
                          <button
                            key={tf}
                            onClick={() => setSelectedTimeframe(tf)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                              selectedTimeframe === tf
                                ? 'bg-primary text-white'
                                : 'text-text-muted hover:text-text-secondary'
                            }`}
                          >
                            {tf.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {isLoading ? (
                      <div className="flex-1 min-h-[300px] flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={portfolioHistory}>
                            <defs>
                              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0052FF" stopOpacity={0.35}/>
                                <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis 
                              dataKey="date" 
                              stroke="#64748b"
                              tick={{ fontSize: 10, fill: '#64748b' }}
                            />
                            <YAxis 
                              stroke="#64748b"
                              tick={{ fontSize: 10, fill: '#64748b' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                fontSize: '12px'
                              }}
                              itemStyle={{ color: '#0EA5E9' }}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="#0EA5E9"
                              strokeWidth={2}
                              fill="url(#portfolioGradient)"
                              activeDot={{ r: 4, stroke: '#00D4FF', strokeWidth: 2, fill: '#0EA5E9' }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Allocation Pie Chart */}
              <div>
                <Card className="h-[400px]">
                  <div className="p-6 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-text-primary">Allocation</h3>
                      <Chip variant="primary">BALANCED</Chip>
                    </div>
                    
                    {isLoading ? (
                      <div className="flex-1 min-h-[300px] flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col">
                        <ResponsiveContainer width="100%" height={160}>
                          <PieChart>
                            <Pie
                              data={portfolio.slice(0, 5)}
                              dataKey="allocation"
                              nameKey="token.symbol"
                              cx="50%"
                              cy="50%"
                              outerRadius={activePieIndex !== null ? 72 : 64}
                              innerRadius={36}
                              label={false}
                              onMouseEnter={(_, idx) => setActivePieIndex(idx)}
                              onMouseLeave={() => setActivePieIndex(null)}
                            >
                              {portfolio.slice(0, 5).map((_, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={pieColors[index % pieColors.length]} 
                                  fillOpacity={activePieIndex === null || activePieIndex === index ? 1 : 0.45}
                                  stroke={activePieIndex === index ? '#FFFFFF' : 'none'}
                                  strokeWidth={activePieIndex === index ? 1 : 0}
                                  cursor="pointer"
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: any, name: any) => [`${(value as number).toFixed(2)}%`, `$${name}`]}
                              contentStyle={{ 
                                backgroundColor: 'rgba(2, 6, 23, 0.95)', 
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: '8px',
                                fontSize: '12px'
                              }}
                              itemStyle={{ color: '#E6F6FF' }}
                              labelStyle={{ color: '#A8D8FF' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        
                        {/* Legend */}
                        <div className="mt-4 grid grid-cols-2 gap-y-2">
                          {portfolio.slice(0, 6).map((token, index) => (
                            <div key={token.token.address} className="flex items-center justify-between pr-2">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: pieColors[index % pieColors.length] }}
                                />
                                <span className="text-sm text-text-secondary">${token.token.symbol}</span>
                              </div>
                              <span className="text-sm font-medium text-text-primary">{token.allocation.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>

            {/* Holdings Grid/Table */}
            {portfolio.length === 0 ? (
              <Card>
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-cyan-500 rounded-full blur-xl opacity-50 animate-pulse" />
                    <div className="relative w-full h-full bg-canvas rounded-full border-2 border-primary flex items-center justify-center">
                      <FiDollarSign size={40} className="text-primary" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-text-primary mb-2">No Token Holdings Yet</h3>
                  <p className="text-text-secondary mb-6">Start building your portfolio by buying tokens</p>
                  <Link href="/browse">
                    <Button variant="primary" icon={<FiArrowRight size={18} />}>
                      Browse Tokens
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : viewMode === 'grid' ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-text-primary">Top Holdings</h3>
                  <Chip>{portfolio.length} POSITIONS</Chip>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {portfolio.slice(0, 6).map((holding, index) => (
                    <div
                      key={holding.token.address}
                      onClick={() => router.push(`/token/${holding.token.address}`)}
                      className="cursor-pointer"
                    >
                      <Card hover>
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              {holding.token.logo ? (
                                <img 
                                  src={getTokenImageUrl(holding.token.logo)} 
                                  alt={holding.token.symbol}
                                  className="w-12 h-12 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-cyan-500/20 flex items-center justify-center font-bold text-text-primary">
                                  {holding.token.symbol[0]}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-text-primary">{holding.token.symbol}</p>
                                <p className="text-xs text-text-muted">{holding.allocation.toFixed(1)}% of portfolio</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-text-secondary">Value</span>
                              <span className="font-semibold text-text-primary">${holding.value.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-text-secondary">P&L</span>
                              <span className={`font-semibold ${holding.profitLoss >= 0 ? 'text-success' : 'text-danger'}`}>
                                {holding.profitLoss >= 0 ? '+' : ''}${Math.abs(holding.profitLoss).toFixed(2)}
                              </span>
                            </div>
                            <div className="pt-3 border-t border-border">
                              <Chip 
                                variant={holding.profitLossPercentage >= 0 ? 'success' : 'danger'}
                              >
                                {holding.profitLossPercentage >= 0 ? '↑' : '↓'} {Math.abs(holding.profitLossPercentage).toFixed(1)}%
                              </Chip>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Table View
              <div>
                <Card>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-text-primary">Asset Registry</h3>
                      <div className="flex items-center gap-3">
                        <Chip>{portfolio.length} POSITIONS</Chip>
                        <Button variant="ghost" size="sm" icon={<FiArrowDownRight size={16} />}>
                          Export
                        </Button>
                      </div>
                    </div>
                  
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-6 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Asset</th>
                            <th className="px-6 py-4 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Holdings</th>
                            <th className="px-6 py-4 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Value</th>
                            <th className="px-6 py-4 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Entry</th>
                            <th className="px-6 py-4 text-right text-xs font-medium text-text-muted uppercase tracking-wider">P&L</th>
                            <th className="px-6 py-4 text-right text-xs font-medium text-text-muted uppercase tracking-wider">24h</th>
                            <th className="px-6 py-4 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Weight</th>
                            <th className="px-6 py-4 text-center text-xs font-medium text-text-muted uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {portfolio.map((holding) => (
                            <tr
                              key={holding.token.address}
                              className="border-b border-border hover:bg-surface2/50 transition-all cursor-pointer"
                              onClick={() => router.push(`/token/${holding.token.address}`)}
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  {holding.token.logo ? (
                                    <img 
                                      src={getTokenImageUrl(holding.token.logo)} 
                                      alt={holding.token.symbol}
                                      className="w-10 h-10 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-cyan-500/20 flex items-center justify-center font-bold text-text-primary">
                                      {holding.token.symbol[0]}
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-semibold text-text-primary">{holding.token.symbol}</p>
                                    <p className="text-xs text-text-muted">{holding.token.address.slice(0, 6)}...{holding.token.address.slice(-4)}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <p className="text-text-primary">{holding.balance.toLocaleString()}</p>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <p className="font-semibold text-text-primary">${holding.value.toFixed(2)}</p>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <p className="text-text-secondary">${holding.cost.toFixed(2)}</p>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex flex-col items-end">
                                  <span className={`font-semibold ${holding.profitLoss >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {holding.profitLoss >= 0 ? '+' : ''}${Math.abs(holding.profitLoss).toFixed(2)}
                                  </span>
                                  <span className={`text-xs ${holding.profitLoss >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {holding.profitLossPercentage >= 0 ? '↑' : '↓'} {Math.abs(holding.profitLossPercentage).toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className={`text-sm ${holding.priceChange24h! >= 0 ? 'text-success' : 'text-danger'}`}>
                                  {holding.priceChange24h! >= 0 ? '+' : ''}{holding.priceChange24h!.toFixed(2)}%
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-end justify-end gap-2">
                                  <span className="text-text-secondary">{holding.allocation.toFixed(1)}%</span>
                                  <div className="w-12 h-4 bg-surface3 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-primary to-cyan-500"
                                      style={{ width: `${holding.allocation}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/token/${holding.token.address}`);
                                    }}
                                  >
                                    Trade
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}

        {/* Escrows Tab Content */}
        {activeTab === 'escrows' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-8"
          >
            {/* Escrow Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                label="Active Escrows"
                value={(creatorEscrows.filter(e => e.status === 'active').length + kolEscrows.filter(e => e.status === 'active').length).toString()}
                icon={<FiShield />}
              />
              
              <MetricCard
                label="Total Locked"
                value={`$${escrowStats ? formatTokenAmount(escrowStats.totalValue, 6) : '0.00'}`}
                icon={<FiLock />}
              />
              
              <MetricCard
                label="Claimable"
                value="$0.00"
                icon={<FiUnlock />}
              />
              
              <MetricCard
                label="Completion Rate"
                value={`${escrowStats?.completionRate || 0}%`}
                icon={<FiBarChart2 />}
                change={{ value: `+${escrowStats?.completionRate || 0}%`, positive: true }}
              />
            </div>

            {/* Escrow Lists */}
            {creatorEscrows.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                    <FiUsers /> Your Escrows (Creator)
                  </h3>
                  <Link href="/escrow/new">
                    <Button variant="primary" size="sm" icon={<FiPlus size={16} />}>
                      Create New
                    </Button>
                  </Link>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {creatorEscrows.map((escrow) => (
                    <motion.div
                      key={escrow.id}
                      whileHover={{ scale: 1.02 }}
                    >
                      <Card hover>
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="font-semibold text-text-primary text-lg">Escrow #{escrow.id.slice(-4)}</h4>
                              <p className="text-xs text-text-muted mt-1">
                                KOL: {escrow.kol.slice(0, 6)}...{escrow.kol.slice(-4)}
                              </p>
                            </div>
                            <Chip 
                              variant={
                                escrow.status === 'active' ? 'success' : 
                                escrow.status === 'completed' ? 'primary' : 'warning'
                              }
                            >
                              {escrow.status}
                            </Chip>
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-text-secondary">Total Amount</span>
                              <span className="font-semibold text-text-primary">
                                ${formatTokenAmount((escrow as any).totalAmount || escrow.amount, (escrow as any).tokenDecimals || 18)} {(escrow as any).tokenSymbol || 'USDC'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-text-secondary">Released</span>
                              <span className="font-semibold text-success">
                                ${formatTokenAmount((escrow as any).releasedAmount || '0', (escrow as any).tokenDecimals || 18)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-text-secondary">Milestones</span>
                              <span className="font-semibold text-text-primary">
                                {(escrow.milestones || []).filter((m: any) => m.status === 'approved').length}/{(escrow.milestones || []).length}
                              </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-4">
                              <div className="flex justify-between text-xs text-text-muted mb-1">
                                <span>Progress</span>
                                <span>{calculateEscrowProgress((escrow as any).releasedAmount || '0', (escrow as any).totalAmount || escrow.amount || '0')}%</span>
                              </div>
                              <div className="w-full h-2 bg-surface3 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-primary to-cyan-500 transition-all duration-500"
                                  style={{ width: `${calculateEscrowProgress((escrow as any).releasedAmount || '0', (escrow as any).totalAmount || escrow.amount || '0')}%` }}
                                />
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-4">
                              <Link href={`/escrow/${escrow.id}`} className="flex-1">
                                <Button variant="secondary" size="sm" className="w-full" icon={<FiEye size={16} />}>
                                  View Details
                                </Button>
                              </Link>
                              {escrow.status === 'active' && (
                                <Button variant="primary" size="sm" icon={<FiEdit3 size={16} />}>
                                  Manage
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {creatorEscrows.length === 0 && kolEscrows.length === 0 && (
              <Card>
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-cyan-500 rounded-full blur-xl opacity-50 animate-pulse" />
                    <div className="relative w-full h-full bg-canvas rounded-full border-2 border-primary flex items-center justify-center">
                      <FiShield size={40} className="text-primary" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-text-primary mb-2">No Escrow Deals Yet</h3>
                  <p className="text-text-secondary mb-6">Start your first escrow deal to secure your transactions</p>
                  <Link href="/escrow/new">
                    <Button variant="primary" icon={<FiPlus size={18} />}>
                      Create Your First Escrow
                    </Button>
                  </Link>
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {/* Activity Tab Content */}
        {activeTab === 'activity' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-text-primary">Recent Activity</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                    <span className="text-xs text-success">LIVE</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-surface2 rounded-lg hover:bg-surface3 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          activity.type === 'buy' ? 'bg-success/10 text-success' :
                          activity.type === 'sell' ? 'bg-danger/10 text-danger' :
                          'bg-primary/10 text-primary'
                        }`}>
                          {activity.type === 'buy' ? <FiArrowUpRight size={20} /> :
                           activity.type === 'sell' ? <FiArrowDownRight size={20} /> :
                           <FiShield size={20} />}
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">
                            {activity.type === 'escrow' ? activity.action : 
                             `${activity.type === 'buy' ? 'Bought' : 'Sold'} ${activity.amount} ${activity.token}`}
                          </p>
                          <p className="text-xs text-text-muted">{activity.time}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-text-primary">{activity.value}</p>
                        <p className="text-xs text-text-muted">{activity.txHash}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </LayoutShell>
  );
}