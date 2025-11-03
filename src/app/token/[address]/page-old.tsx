'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, usePublicClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { LayoutShell, SectionHeader, Tabs, Chip } from '@/components/alien/Layout';
import { Button } from '@/components/alien/Button';
import { Card, MetricCard } from '@/components/alien/Card';
import { Input } from '@/components/alien/Input';
import { showToast } from '@/components/ToastProvider';
import { useIsMobile } from '@/hooks/useIsMobile';
import { 
  usePriceCalculator,
  useTransactionStatus 
} from '@/hooks/useContracts';
import { useBondingCurve } from '@/hooks/useBondingCurve';
import { wsManager, WS_EVENTS, API_ENDPOINTS, apiRequest } from '@/lib/api/config';
import { formatEther, parseEther } from 'viem';
import { getTokenImageUrl } from '@/lib/image-utils';
import dynamic from 'next/dynamic';
import {
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiActivity,
  FiUsers,
  FiShield,
  FiClock,
  FiArrowUpRight,
  FiArrowDownRight,
  FiCopy,
  FiExternalLink,
  FiBarChart2,
  FiPieChart,
  FiInfo,
  FiCheckCircle,
  FiAlertTriangle,
  FiTwitter,
  FiGlobe,
  FiMessageCircle,
  FiZap,
  FiLock,
  FiUnlock,
  FiEye,
  FiRefreshCw,
  FiSettings,
  FiPercent,
  FiRepeat
} from 'react-icons/fi';

// Dynamically import heavy components
const TradingViewChart = dynamic(
  () => import('@/components/TradingViewChart').then(mod => ({ default: mod.TradingViewChart })),
  { 
    loading: () => <div className="bg-surface2 rounded-lg h-96 animate-pulse" />,
    ssr: false 
  }
);

const TokenTrading = dynamic(
  () => import('@/components/TokenTrading').then(mod => ({ default: mod.TokenTrading })),
  { 
    loading: () => <div className="bg-surface2 rounded-lg h-96 animate-pulse" />,
    ssr: false 
  }
);

const MobileTokenPage = dynamic(
  () => import('@/components/mobile/MobileTokenPage').then(mod => ({ default: mod.MobileTokenPage })),
  { 
    loading: () => <div className="min-h-screen bg-canvas" />,
    ssr: false 
  }
);

const VolumeChart = dynamic(
  () => import('@/components/charts/VolumeChart').then(mod => ({ default: mod.VolumeChart })),
  { 
    loading: () => <div className="bg-surface2 rounded-lg h-[150px] animate-pulse" />,
    ssr: false 
  }
);

interface TokenData {
  address: string;
  name: string;
  symbol: string;
  price: string;
  change24h: number;
  marketCap: string;
  volume24h: string;
  liquidity: string;
  holders: number;
  totalSupply: string;
  bondingProgress: number;
  verified?: boolean;
  category?: string;
  age?: number;
}

interface TradeData {
  type: 'buy' | 'sell';
  amount: string;
  price: string;
  timestamp: number;
  txHash: string;
  from: string;
}

export default function TokenDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isConnected, address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const isMobile = useIsMobile();
  
  // Get token address from params
  const tokenAddress = params.address as string;
  
  // State for backend-fetched token data
  const [backendToken, setBackendToken] = useState<any>(null);
  const [isLoadingBackend, setIsLoadingBackend] = useState(true);
  
  // Get bonding curve metrics and functions
  const { metrics, fetchMetrics, buyTokens: buyTokensCurve, sellTokens: sellTokensCurve } = useBondingCurve(tokenAddress);
  
  // Fetch token data from backend API
  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        const response = await apiRequest<{ success: boolean; data: any }>(
          API_ENDPOINTS.tokens.details(tokenAddress)
        );
        
        if (response.success && response.data) {
          setBackendToken(response.data);
          
          // If token exists but has no trades, trigger a sync
          const tradesResponse = await apiRequest<{ success: boolean; data: { trades: any[], total: number } }>(
            API_ENDPOINTS.tokens.trades(tokenAddress) + '?limit=1'
          );
          
          if (tradesResponse.success && tradesResponse.data?.total === 0) {
            // Trigger background trade sync (fire and forget)
            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/tokens/${tokenAddress}/sync-trades`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            }).catch(err => {
              console.log('Could not trigger trade sync:', err);
            });
          }
        }
      } catch (error: any) {
        console.error('Failed to fetch token from backend:', error);
        
        // If token not found (404), try to sync it from blockchain
        if (error?.status === 404) {
          console.log('Token not found in database, syncing from blockchain...');
          try {
            const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/tokens/${tokenAddress}/sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            });
            
            const syncResult = await syncResponse.json();
            if (syncResult.success) {
              console.log('Token synced successfully, fetching data...');
              // Retry fetching token data
              const retryResponse = await apiRequest<{ success: boolean; data: any }>(
                API_ENDPOINTS.tokens.details(tokenAddress)
              );
              if (retryResponse.success && retryResponse.data) {
                setBackendToken(retryResponse.data);
              }
            } else {
              console.error('Failed to sync token:', syncResult.error);
            }
          } catch (syncError) {
            console.error('Error syncing token:', syncError);
          }
        }
      } finally {
        setIsLoadingBackend(false);
      }
    };
    
    if (tokenAddress) {
      fetchTokenData();
    }
  }, [tokenAddress]);
  
  // Disabled to prevent excessive RPC calls - data comes from useBondingCurve
  // const { bondingCurve, creator, createdAt, graduated, isLoading: tokenInfoLoading } = useTokenInfo(tokenAddress);
  // const { 
  //   currentPrice, 
  //   marketCap, 
  //   isGraduated, 
  //   virtualEth, 
  //   virtualTokens 
  // } = useBondingCurveInfo(bondingCurve || '');
  
  // Use placeholder values - actual data comes from metrics and backendToken
  const bondingCurve = backendToken?.bondingCurveAddress || null;
  const tokenInfoLoading = false;
  
  // Trading hooks are now obtained above with metrics
  const { calculateBuyAmount, calculateSellAmount } = usePriceCalculator(bondingCurve || '');
  
  // Disabled automatic balance fetching to reduce RPC calls
  // Balances are fetched on-demand when needed for trading
  const ethBalance = null;
  const tokenBalance = null;
  
  // State
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [holders, setHolders] = useState<any[]>([]);
  const [volumeData, setVolumeData] = useState<any[]>([]);
  const [showMA, setShowMA] = useState(false);
  const [live, setLive] = useState(true);
  
  // Fetch trades and holder data from backend
  useEffect(() => {
    const fetchAdditionalData = async () => {
      try {
        // Fetch trades
        const tradesResponse = await apiRequest<{ success: boolean; data: { trades: any[], total: number } }>(
          API_ENDPOINTS.tokens.trades(tokenAddress)
        );
        if (tradesResponse.success && tradesResponse.data?.trades) {
          setTrades(tradesResponse.data.trades.map((trade: any) => ({
            type: trade.type,
            amount: trade.amount,
            price: trade.price,
            timestamp: new Date(trade.timestamp).getTime(),
            txHash: trade.transactionHash || trade.txHash || '0x',
            from: trade.trader || trade.from || trade.buyer || trade.seller || '0x0000...0000'
          })));
        }
        
        // Fetch holders
        const holdersResponse = await apiRequest<{ success: boolean; data: { holders: any[], total: number } }>(
          API_ENDPOINTS.tokens.holders(tokenAddress)
        );
        if (holdersResponse.success && holdersResponse.data?.holders) {
          setHolders(holdersResponse.data.holders.map((holder: any) => ({
            address: holder.user?.address || holder.tokenAddress || '0x0000...0000',
            balance: holder.balance,
            percentage: holder.percentOwned || ((parseFloat(holder.balance) / 1000000000) * 100).toFixed(2)
          })));
        }
      } catch (error) {
        console.error('Failed to fetch additional token data:', error);
      }
    };
    
    if (tokenAddress && backendToken) {
      fetchAdditionalData();
    }
  }, [tokenAddress, backendToken]);
  
  // Trading state
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('1');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  
  // Transaction status
  const { isConfirming, isConfirmed } = useTransactionStatus(txHash);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('overview');
  const [chartTimeframe, setChartTimeframe] = useState('24h');

  // Create a token object for UI compatibility - prefer backend data, fallback to blockchain
  const token = backendToken ? {
    address: tokenAddress,
    name: backendToken.name || 'Unknown Token',
    symbol: backendToken.symbol || 'TOKEN',
    price: backendToken.currentPrice || '0.000001',
    change24h: backendToken.priceChange24h || 0,
    marketCap: backendToken.marketCap || '0',
    volume24h: backendToken.volume24h || '0',
    liquidity: backendToken.liquidity || '0',
    holders: backendToken.holders || 0,
    totalSupply: backendToken.totalSupply || '1,000,000,000',
    bondingProgress: backendToken.bondingProgress || 0,
    verified: backendToken.verified || false,
    category: backendToken.category || 'meme',
    age: backendToken.createdAt ? Math.floor((Date.now() - new Date(backendToken.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
    description: backendToken.description,
    imageUrl: backendToken.imageUrl,
    twitter: backendToken.twitter,
    telegram: backendToken.telegram,
    website: backendToken.website
  } : metrics ? {
    address: tokenAddress,
    name: 'Loading...', // Fallback
    symbol: 'TOKEN', // Fallback
    price: metrics.price,
    change24h: 0,
    marketCap: metrics.marketCap,
    volume24h: metrics.volume24h,
    liquidity: metrics.liquidity,
    holders: metrics.holders,
    totalSupply: '1,000,000,000',
    bondingProgress: metrics.bondingProgress,
    verified: false,
    category: 'meme',
    age: 0
  } : null;

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!bondingCurve || !wsManager) return;

    // Connect WebSocket
    wsManager.connect();

    // Subscribe to token events
    const unsubTrade = wsManager.on(WS_EVENTS.TOKEN_TRADE, (data: any) => {
      if (data.token === tokenAddress) {
        const newTrade: TradeData = {
          type: data.type,
          amount: data.amount,
          price: data.price,
          timestamp: data.timestamp,
          txHash: data.txHash,
          from: data.buyer || data.seller
        };
        setTrades(prev => [newTrade, ...prev].slice(0, 100));
      }
    });

    const unsubPrice = wsManager.on(WS_EVENTS.TOKEN_PRICE_UPDATE, (data: any) => {
      if (data.token === tokenAddress) {
        // Price updates are handled by the bonding curve info hook
      }
    });

    return () => {
      unsubTrade();
      unsubPrice();
    };
  }, [bondingCurve, tokenAddress]);


  const handleTrade = async () => {
    if (!isConnected) {
      showToast.error('Please connect your wallet');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      showToast.error('Please enter a valid amount');
      return;
    }

    if (!bondingCurve) {
      showToast.error('Token contract not found');
      return;
    }
    
    try {
      let hash: string | null = null;
      
      if (tradeMode === 'buy') {
        // Balance check removed - handled by the transaction itself
        // Execute buy transaction using curve hook (sends transaction via wallet, records to backend)
        const res = await buyTokensCurve(amount, parseFloat(slippage) / 100);
        hash = res?.transactionHash || null;
      } else {
        // Balance check removed - handled by the transaction itself
        
        // Approve tokens first if needed
        showToast.info('Approving tokens...');
        // Execute sell transaction using curve hook (handles approval internally)
        const res = await sellTokensCurve(amount, parseFloat(slippage) / 100);
        hash = res?.transactionHash || null;
      }
      
      if (hash) {
        setTxHash(hash as `0x${string}`);
        showToast.success(`Transaction submitted: ${hash.slice(0, 10)}...`);
        setAmount('');
        
        // Add optimistic trade update
        const newTrade: TradeData = {
          type: tradeMode,
          amount: amount,
          price: metrics?.price || '0.000001',
          timestamp: Date.now(),
          txHash: hash,
          from: address || '0x0000'
        };
        setTrades([newTrade, ...trades]);
      }
    } catch (error) {
      console.error('Trade failed:', error);
      showToast.error('Transaction failed');
    }
  };

  const copyAddress = () => {
    if (tokenAddress) {
      navigator.clipboard.writeText(tokenAddress);
      showToast.copied('Token address copied');
    }
  };

  const [expectedOutput, setExpectedOutput] = useState('0');

  // Calculate expected output when amount changes
  useEffect(() => {
    const calculate = async () => {
      if (!amount || parseFloat(amount) <= 0) {
        setExpectedOutput('0');
        return;
      }
      
      try {
        if (tradeMode === 'buy') {
          const tokensOut = await calculateBuyAmount(amount);
          setExpectedOutput(parseFloat(tokensOut).toLocaleString());
        } else {
          const ethOut = await calculateSellAmount(amount);
          setExpectedOutput(parseFloat(ethOut).toFixed(6));
        }
      } catch {
        setExpectedOutput('0');
      }
    };
    
    calculate();
  }, [amount, tradeMode, calculateBuyAmount, calculateSellAmount]);

  const getPriceImpact = () => {
    if (!amount || parseFloat(amount) <= 0) return 0;
    // Simulate price impact calculation
    const impact = parseFloat(amount) * 0.05;
    return Math.min(impact, 10);
  };

  // Right panel content - Trading Terminal
  // Pass the metrics and functions from the parent's useBondingCurve to avoid duplicate instances
  const rightPanel = token ? (
    <TokenTrading 
      tokenAddress={tokenAddress}
      tokenSymbol={token.symbol}
      tokenName={token.name}
      metrics={metrics}
      buyTokens={buyTokensCurve}
      sellTokens={sellTokensCurve}
      isLoading={false}
      getBalance={async () => {
        if (!address || !publicClient || !tokenAddress) return '0';
        try {
          const balance = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: [{
              "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
              "name": "balanceOf",
              "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
              "stateMutability": "view",
              "type": "function"
            }],
            functionName: 'balanceOf',
            args: [address],
          });
          return formatEther(balance);
        } catch {
          return '0';
        }
      }}
    />
  ) : null;

  if (isMobile) {
    return <MobileTokenPage tokenAddress={params.address as string} />;
  }

  // Show loading state while fetching data
  if ((isLoadingBackend && tokenInfoLoading) || (!token && isLoadingBackend)) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">Loading token data...</p>
          </div>
        </div>
      </LayoutShell>
    );
  }
  
  // Show error if token not found
  if (!isLoadingBackend && !token) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-text-primary mb-2">Token Not Found</h2>
            <p className="text-text-secondary mb-4">The token {tokenAddress} does not exist or has been removed.</p>
            <Button onClick={() => router.push('/browse')} variant="primary">
              Browse Tokens
            </Button>
          </div>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell rightPanel={rightPanel} collapsibleRightPanel={true}>
      <div className="p-6">
        {/* Token Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* Token Avatar */}
              {token?.imageUrl ? (
                <img 
                  src={getTokenImageUrl(token.imageUrl)} 
                  alt={token.symbol}
                  className="w-16 h-16 rounded-xl object-cover"
                  onError={(e) => {
                    // Fallback to letter if image fails
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ${token?.imageUrl ? 'hidden' : ''}`}>
                <span className="text-2xl font-bold text-text-primary">{token?.symbol?.[0] || '?'}</span>
              </div>
              
              {/* Token Info */}
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-text-primary">{token?.name || 'Unknown Token'}</h1>
                  <span className="text-lg text-text-secondary">${token?.symbol || 'TOKEN'}</span>
                  {token?.verified && (
                    <FiCheckCircle className="text-success" size={20} />
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <button
                    onClick={copyAddress}
                    className="font-orbitron text-text-muted hover:text-text-primary transition-colors flex items-center gap-1"
                  >
                    {token?.address?.slice(0, 6) || '0x0000'}...{token?.address?.slice(-4) || '0000'}
                    <FiCopy size={12} />
                  </button>
                  <Chip variant="default">{token?.category || 'meme'}</Chip>
                  <span className="text-text-muted">{token?.age || 0}d old</span>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-2">
              {token?.twitter && (
                <a 
                  href={token.twitter && token.twitter.startsWith('http') ? token.twitter : `https://twitter.com/${token.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-surface2 hover:bg-surface3 rounded-lg transition-colors"
                >
                  <FiTwitter size={18} className="text-text-secondary hover:text-primary" />
                </a>
              )}
              {token?.telegram && (
                <a 
                  href={token.telegram && token.telegram.startsWith('http') ? token.telegram : `https://t.me/${token.telegram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-surface2 hover:bg-surface3 rounded-lg transition-colors"
                >
                  <FiMessageCircle size={18} className="text-text-secondary hover:text-primary" />
                </a>
              )}
              {token?.website && (
                <a 
                  href={token.website && token.website.startsWith('http') ? token.website : `https://${token.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-surface2 hover:bg-surface3 rounded-lg transition-colors"
                >
                  <FiGlobe size={18} className="text-text-secondary hover:text-primary" />
                </a>
              )}
            </div>
          </div>

          {/* Price & Stats */}
          <div className="grid grid-cols-6 gap-4">
            <MetricCard
              label="Price"
              value={`$${metrics?.price ? parseFloat(metrics.price).toFixed(8) : (backendToken?.currentPrice ? parseFloat(backendToken.currentPrice).toFixed(8) : '0.00000100')}`}
              change={{ 
                value: `${Math.abs(backendToken?.change24h || 0).toFixed(2)}%`, 
                positive: (backendToken?.change24h || 0) >= 0 
              }}
              icon={<FiDollarSign size={20} />}
            />
            <MetricCard
              label="Market Cap"
              value={`$${metrics?.marketCap ? parseFloat(metrics.marketCap).toFixed(0) : (backendToken?.marketCap ? parseFloat(backendToken.marketCap).toFixed(0) : '1000')}`}
              icon={<FiTrendingUp size={20} />}
            />
            <MetricCard
              label="24h Volume"
              value={`$${metrics?.volume24h || backendToken?.volume24h || '0'}`}
              icon={<FiActivity size={20} />}
            />
            <MetricCard
              label="Liquidity"
              value={`$${metrics?.liquidity || backendToken?.liquidity || '1000'}`}
              icon={<FiShield size={20} />}
            />
            <MetricCard
              label="Holders"
              value={(metrics?.holders || backendToken?.holdersCount || 1).toLocaleString()}
              icon={<FiUsers size={20} />}
            />
            <MetricCard
              label="Bonding"
              value={`${metrics?.bondingProgress || backendToken?.bondingProgress || 1}%`}
              icon={<FiZap size={20} />}
            />
          </div>
        </div>

        {/* Main Content */}
        <SectionHeader
          title="Token Analytics"
          subtitle="Real-time data and insights"
          actions={
            <Tabs
              tabs={[
                { value: 'overview', label: 'Overview' },
                { value: 'trades', label: 'Recent Trades' },
                { value: 'analytics', label: 'Analytics' }
              ]}
              value={activeTab}
              onChange={setActiveTab}
            />
          }
        />

        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.15 }}
            >
              <div className="grid grid-cols-2 gap-6">
                {/* TradingView Price Chart */}
                <div className="col-span-2">
                  <TradingViewChart
                    tokenAddress={tokenAddress}
                    tokenSymbol={token?.symbol || backendToken?.symbol || 'TOKEN'}
                    currentPrice={parseFloat(metrics?.price || '0.000001')}
                  />
                </div>

                {/* Token Details */}
                <Card>
                  <div className="p-4 border-b border-border">
                    <h3 className="text-sm font-semibold text-text-primary">Token Details</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Total Supply</span>
                      <span className="font-orbitron text-text-primary">1,000,000,000</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Circulating Supply</span>
                      <span className="font-orbitron text-text-primary">
                        800,000,000
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Max Transaction</span>
                      <span className="font-orbitron text-text-primary">No limit</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Platform/Creator Tax</span>
                      <span className="font-orbitron text-text-primary">1% / 1%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Bonding Progress</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-surface3 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${metrics?.bondingProgress || 1}%` }}
                          />
                        </div>
                        <span className="font-orbitron text-text-primary text-xs">{metrics?.bondingProgress || 1}%</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Top Holders */}
                <Card>
                  <div className="p-4 border-b border-border">
                    <h3 className="text-sm font-semibold text-text-primary">Top Holders</h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      {holders.length > 0 ? holders.slice(0, 5).map((holder, index) => (
                        <div key={index} className="flex items-center justify-between p-2 hover:bg-surface2 rounded-lg transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                              index === 1 ? 'bg-gray-400/20 text-gray-400' :
                              index === 2 ? 'bg-orange-500/20 text-orange-500' :
                              'bg-surface2 text-text-muted'
                            }`}>
                              {index + 1}
                            </div>
                            <span className="font-orbitron text-xs text-text-secondary">
                              {holder.address ? `${holder.address.slice(0, 6)}...${holder.address.slice(-4)}` : '0x0000...0000'}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-text-primary">{holder.percentage}%</div>
                            <div className="text-xs text-text-muted">{holder.balance}</div>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-4 text-sm text-text-muted">
                          No holder data available
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Trades Tab */}
          {activeTab === 'trades' && (
            <motion.div
              key="trades"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.15 }}
            >
              <Card padding="lg">
                <div className="overflow-x-auto">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-text-secondary">Recent trades</div>
                    <label className="text-xs text-text-muted flex items-center gap-2">
                      <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
                      Live
                    </label>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 text-micro uppercase tracking-wide text-text-muted font-medium">Type</th>
                        <th className="text-left py-3 text-micro uppercase tracking-wide text-text-muted font-medium">Amount</th>
                        <th className="text-left py-3 text-micro uppercase tracking-wide text-text-muted font-medium">Price</th>
                        <th className="text-left py-3 text-micro uppercase tracking-wide text-text-muted font-medium">Total</th>
                        <th className="text-left py-3 text-micro uppercase tracking-wide text-text-muted font-medium">From</th>
                        <th className="text-left py-3 text-micro uppercase tracking-wide text-text-muted font-medium">Time</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.slice(0, 20).map((trade, index) => (
                        <tr 
                          key={index}
                          className="border-t border-border hover:bg-surface3 transition-colors"
                        >
                          <td className="py-3">
                            <Chip variant={trade.type === 'buy' ? 'success' : 'danger'}>
                              {trade.type}
                            </Chip>
                          </td>
                          <td className="py-3">
                            <span className="font-orbitron text-sm text-text-secondary">
                              {trade.amount} {token?.symbol || 'TOKEN'}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="font-orbitron text-sm text-text-secondary">
                              ${trade.price}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="font-orbitron text-sm text-text-primary">
                              ${(parseFloat(trade.amount) * parseFloat(trade.price)).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="font-orbitron text-sm text-text-muted">
                              {trade.from ? `${trade.from.slice(0, 6)}...${trade.from.slice(-4)}` : 'Unknown'}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="text-sm text-text-muted">
                              {new Date(trade.timestamp).toLocaleTimeString()}
                            </span>
                          </td>
                          <td className="py-3">
                            <a
                              href={`https://basescan.org/tx/${trade.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-text-muted hover:text-text-primary transition-colors"
                            >
                              <FiExternalLink size={14} />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.15 }}
            >
              <div className="grid grid-cols-2 gap-6">
                {/* Whale Activity */}
                <Card>
                  <div className="p-4 border-b border-border">
                    <h3 className="text-sm font-semibold text-text-primary">Whale Activity</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {trades.filter(t => {
                      const amount = parseFloat(t.amount) * parseFloat(t.price);
                      return amount > 1000; // Filter for whale trades > $1000
                    }).slice(0, 5).map((trade, i) => {
                      const amount = parseFloat(trade.amount) * parseFloat(trade.price);
                      const timeAgo = Math.floor((Date.now() - trade.timestamp) / 60000);
                      return (
                        <div key={i} className="flex items-center justify-between p-3 bg-surface2 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FiAlertTriangle className="text-warning" size={16} />
                            <div>
                              <p className="text-sm font-medium text-text-primary">
                                Large {trade.type === 'buy' ? 'Buy' : 'Sell'} Order
                              </p>
                              <p className="text-xs text-text-muted">
                                ${amount.toFixed(0)}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-text-muted">
                            {timeAgo < 60 ? `${timeAgo} min ago` : `${Math.floor(timeAgo / 60)}h ago`}
                          </span>
                        </div>
                      );
                    })}
                    {(trades.length === 0 || trades.filter(t => parseFloat(t.amount) * parseFloat(t.price) > 1000).length === 0) && (
                      <div className="text-center py-4 text-sm text-text-muted">
                        No whale activity detected
                      </div>
                    )}
                  </div>
                </Card>

                {/* Trading Metrics */}
                <Card>
                  <div className="p-4 border-b border-border">
                    <h3 className="text-sm font-semibold text-text-primary">Trading Metrics</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-muted">Buy/Sell Ratio</span>
                        <span className="text-text-primary">
                          {(() => {
                            const buyCount = trades.filter(t => t.type === 'buy').length;
                            const totalTrades = trades.length || 1;
                            const buyRatio = Math.round((buyCount / totalTrades) * 100);
                            return `${buyRatio}/${100 - buyRatio}`;
                          })()}
                        </span>
                      </div>
                      <div className="h-2 bg-surface3 rounded-full overflow-hidden">
                        <div className="h-full bg-success" style={{ 
                          width: `${trades.length > 0 ? (trades.filter(t => t.type === 'buy').length / trades.length * 100) : 50}%` 
                        }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-muted">Holder Distribution</span>
                        <span className="text-text-primary">
                          {holders.length > 0 && holders[0].percentage < 50 ? 'Healthy' : 
                           holders.length > 0 && holders[0].percentage < 75 ? 'Concentrated' : 'Fair'}
                        </span>
                      </div>
                      <div className="h-2 bg-surface3 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ 
                          width: holders.length > 0 ? `${100 - holders[0].percentage}%` : '100%' 
                        }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-muted">Liquidity Score</span>
                        <span className="text-text-primary">
                          {(() => {
                            const liquidityScore = Math.min(100, Math.round((parseFloat(backendToken?.liquidity || metrics?.liquidity || '0') / parseFloat(backendToken?.marketCap || metrics?.marketCap || '1')) * 100));
                            return `${liquidityScore}/100`;
                          })()}
                        </span>
                      </div>
                      <div className="h-2 bg-surface3 rounded-full overflow-hidden">
                        <div className="h-full bg-warning" style={{ 
                          width: `${Math.min(100, Math.round((parseFloat(backendToken?.liquidity || metrics?.liquidity || '0') / parseFloat(backendToken?.marketCap || metrics?.marketCap || '1')) * 100))}%` 
                        }} />
                      </div>
                    </div>
                    <div className="pt-3 border-t border-border">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-3 bg-surface2 rounded-lg">
                          <p className="text-xs text-text-muted mb-1">24h Transactions</p>
                          <p className="text-lg font-bold text-text-primary">{trades.length || 0}</p>
                        </div>
                        <div className="text-center p-3 bg-surface2 rounded-lg">
                          <p className="text-xs text-text-muted mb-1">Unique Traders</p>
                          <p className="text-lg font-bold text-text-primary">
                            {[...new Set(trades.map(t => t.from))].length || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LayoutShell>
  );
}