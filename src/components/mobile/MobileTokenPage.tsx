'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { MobileLayout, MobileCard, MobileMetricCard } from './MobileLayout';
import { Button } from '@/components/alien/Button';
import { Input } from '@/components/alien/Input';
import { Tabs } from '@/components/alien/Layout';
import { useTokenInfo, useBondingCurveInfo } from '@/hooks/useContracts';
import { showToast } from '@/components/ToastProvider';
import {
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiActivity,
  FiUsers,
  FiShield,
  FiCopy,
  FiExternalLink,
  FiArrowUpRight,
  FiArrowDownRight,
  FiTwitter,
  FiGlobe,
  FiMessageCircle,
  FiChevronLeft,
  FiShare2
} from 'react-icons/fi';
import { cn } from '@/lib/utils';

interface MobileTokenPageProps {
  tokenAddress: string;
}

export function MobileTokenPage({ tokenAddress }: MobileTokenPageProps) {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [token, setToken] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [holders, setHolders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showTrade, setShowTrade] = useState(false);

  useEffect(() => {
    // TODO: Load real token data from blockchain
    // For now, show empty state
    setIsLoading(false);
  }, [tokenAddress]);

  const handleTrade = () => {
    if (!isConnected) {
      showToast.error('Please connect wallet');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      showToast.error('Enter valid amount');
      return;
    }
    
    showToast.success(`${tradeMode === 'buy' ? 'Bought' : 'Sold'} ${amount} tokens`);
    setAmount('');
    setShowTrade(false);
  };

  const copyAddress = () => {
    if (token?.address) {
      navigator.clipboard.writeText(token.address);
      showToast.copied('Address copied');
    }
  };

  const shareToken = () => {
    if (navigator.share) {
      navigator.share({
        title: token?.name,
        text: `Check out ${token?.name} on S4 Labs`,
        url: window.location.href,
      });
    }
  };

  if (isLoading || !token) {
    return (
      <MobileLayout showNav={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary text-sm">Loading...</p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout 
      showHeader={false}
      showNav={false}
    >
      {/* Custom Header */}
      <div className="sticky top-0 z-30 bg-surface1 border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-text-muted hover:text-text-primary transition-colors"
          >
            <FiChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={shareToken}
              className="p-2 text-text-muted hover:text-text-primary transition-colors"
            >
              <FiShare2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Token Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <span className="text-lg font-bold text-primary">
                {token.symbol[0]}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text-primary">{token.name}</h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">${token.symbol}</span>
                <button
                  onClick={copyAddress}
                  className="text-xs text-text-muted flex items-center gap-1"
                >
                  {token.address.slice(0, 6)}...{token.address.slice(-4)}
                  <FiCopy size={10} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Price Info */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold text-text-primary">
              ${token.price}
            </span>
            <span className={cn(
              "text-sm font-medium flex items-center gap-1",
              token.change24h > 0 ? "text-success" : "text-danger"
            )}>
              {token.change24h > 0 ? <FiTrendingUp size={14} /> : <FiTrendingDown size={14} />}
              {Math.abs(token.change24h).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <MobileMetricCard
            label="Market Cap"
            value={`$${token.marketCap}`}
            icon={<FiDollarSign size={16} />}
          />
          <MobileMetricCard
            label="Volume 24h"
            value={`$${token.volume24h}`}
            icon={<FiActivity size={16} />}
          />
          <MobileMetricCard
            label="Liquidity"
            value={`$${token.liquidity}`}
            icon={<FiShield size={16} />}
          />
          <MobileMetricCard
            label="Holders"
            value={token.holders}
            icon={<FiUsers size={16} />}
          />
        </div>

        {/* Trade Button */}
        <Button
          variant="primary"
          className="w-full justify-center mb-4"
          onClick={() => setShowTrade(true)}
          icon={<FiArrowUpRight size={16} />}
        >
          Trade {token.symbol}
        </Button>

        {/* Social Links */}
        <div className="flex gap-2 mb-4">
          <button className="flex-1 p-2 bg-surface2 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <FiTwitter size={18} />
          </button>
          <button className="flex-1 p-2 bg-surface2 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <FiMessageCircle size={18} />
          </button>
          <button className="flex-1 p-2 bg-surface2 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <FiGlobe size={18} />
          </button>
          <button className="flex-1 p-2 bg-surface2 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <FiExternalLink size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <Tabs
          tabs={[
            { value: 'overview', label: 'Overview' },
            { value: 'trades', label: 'Trades' },
            { value: 'holders', label: 'Holders' },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Tab Content */}
      <div className="px-4 pb-8">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <MobileCard>
              <h3 className="text-sm font-medium text-text-primary mb-3">Token Info</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Total Supply</span>
                  <span className="text-text-primary">1,000,000,000</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Tax</span>
                  <span className="text-text-primary">0% / 0%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Bonding</span>
                  <span className="text-text-primary">{token.bondingProgress || 65}%</span>
                </div>
              </div>
            </MobileCard>

            <MobileCard>
              <h3 className="text-sm font-medium text-text-primary mb-3">Security</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-success rounded-full" />
                  <span className="text-text-secondary">Contract Verified</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-success rounded-full" />
                  <span className="text-text-secondary">Liquidity Locked</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-success rounded-full" />
                  <span className="text-text-secondary">Ownership Renounced</span>
                </div>
              </div>
            </MobileCard>
          </div>
        )}

        {activeTab === 'trades' && (
          <div className="space-y-2">
            {trades.slice(0, 10).map((trade, i) => (
              <MobileCard key={i} padding="sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      trade.type === 'buy' ? "bg-success/10" : "bg-danger/10"
                    )}>
                      {trade.type === 'buy' ? 
                        <FiArrowUpRight className="text-success" size={16} /> : 
                        <FiArrowDownRight className="text-danger" size={16} />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {trade.type === 'buy' ? 'Buy' : 'Sell'}
                      </p>
                      <p className="text-xs text-text-muted">
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-text-primary">
                      {trade.amount}
                    </p>
                    <p className="text-xs text-text-muted">
                      ${trade.price}
                    </p>
                  </div>
                </div>
              </MobileCard>
            ))}
          </div>
        )}

        {activeTab === 'holders' && (
          <div className="space-y-2">
            {holders.slice(0, 10).map((holder, i) => (
              <MobileCard key={i} padding="sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-surface3 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-bold text-text-muted">
                        {i + 1}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-mono text-text-primary">
                        {holder.address.slice(0, 8)}...
                      </p>
                      <p className="text-xs text-text-muted">
                        {holder.percentage}% of supply
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-text-primary">
                      {holder.balance}
                    </p>
                  </div>
                </div>
              </MobileCard>
            ))}
          </div>
        )}
      </div>

      {/* Trade Modal */}
      {showTrade && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full bg-surface1 rounded-t-2xl p-4 animate-slideUp">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                Trade {token.symbol}
              </h2>
              <button
                onClick={() => setShowTrade(false)}
                className="p-2 text-text-muted hover:text-text-primary"
              >
                ×
              </button>
            </div>

            {/* Trade Mode */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button
                variant={tradeMode === 'buy' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setTradeMode('buy')}
                className="justify-center"
              >
                Buy
              </Button>
              <Button
                variant={tradeMode === 'sell' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setTradeMode('sell')}
                className="justify-center"
              >
                Sell
              </Button>
            </div>

            {/* Amount Input */}
            <div className="mb-4">
              <label className="text-xs text-text-muted mb-1 block">
                Amount ({tradeMode === 'buy' ? 'ETH' : token.symbol})
              </label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Quick Amounts */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {['0.1', '0.5', '1', 'MAX'].map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(val === 'MAX' ? '10' : val)}
                  className="py-2 text-xs font-medium bg-surface2 hover:bg-surface3 rounded-lg transition-colors"
                >
                  {val}
                </button>
              ))}
            </div>

            {/* Trade Button */}
            {isConnected ? (
              <Button
                variant="primary"
                className="w-full justify-center"
                onClick={handleTrade}
              >
                {tradeMode === 'buy' ? 'Buy' : 'Sell'} {token.symbol}
              </Button>
            ) : (
              <ConnectButton />
            )}
          </div>
        </div>
      )}
    </MobileLayout>
  );
}