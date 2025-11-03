'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { MobileLayout, MobileCard, MobileMetricCard } from './MobileLayout';
import { Button } from '@/components/alien/Button';
import { Tabs } from '@/components/alien/Layout';
import { useEscrows, useDashboardStats } from '@/hooks/useEscrows';
import { formatTokenAmount } from '@/lib/format';
import { useTokenPortfolio } from '@/hooks/useTokens';
import {
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiActivity,
  FiShield,
  FiPlus,
  FiArrowRight,
  FiClock,
  FiCheckCircle,
  FiAlertTriangle
} from 'react-icons/fi';
import { cn } from '@/lib/utils';

interface PortfolioToken {
  token: {
    name: string;
    symbol: string;
    address: string;
  };
  balance: number;
  value: number;
  profitLoss: number;
  profitLossPercentage: number;
}

export default function MobilePortfolioV2() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'tokens' | 'escrows'>('tokens');

  // Use real portfolio API
  const { portfolio: portfolioData, stats: portfolioStats, loading: portfolioLoading } = useTokenPortfolio();
  
  // Fetch escrow data
  const { escrows } = useEscrows();
  const { stats: escrowStats } = useDashboardStats();

  // Process portfolio data for display
  const portfolio: PortfolioToken[] = portfolioData?.map(item => ({
    token: {
      name: item.name,
      symbol: item.symbol,
      address: item.address
    },
    balance: item.balance,
    value: parseFloat(item.value),
    profitLoss: parseFloat(item.pnl || '0'),
    profitLossPercentage: parseFloat(item.pnlPercent || '0')
  })) || [];

  const totalValue = parseFloat(portfolioStats?.totalValue || '0');
  const totalProfitLoss = parseFloat(portfolioStats?.totalPnL || '0');
  const isLoading = portfolioLoading;

  if (!isConnected) {
    return (
      <MobileLayout title="Portfolio">
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiDollarSign className="text-primary" size={24} />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Connect Wallet
            </h2>
            <p className="text-sm text-text-secondary mb-6">
              Connect your wallet to view your portfolio
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Portfolio">
      {/* Header Stats */}
      <div className="px-4 pt-4">
        {/* Total Value */}
        <div className="mb-4">
          <p className="text-xs text-text-muted mb-1">Total Value</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-text-primary">
              ${totalValue.toLocaleString()}
            </span>
            <span className={cn(
              "text-sm font-medium flex items-center gap-1",
              totalProfitLoss >= 0 ? "text-success" : "text-danger"
            )}>
              {totalProfitLoss >= 0 ? <FiTrendingUp size={14} /> : <FiTrendingDown size={14} />}
              {totalProfitLoss >= 0 ? '+' : ''}{totalProfitLoss.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {activeTab === 'tokens' ? (
            <>
              <MobileMetricCard
                label="24h P&L"
                value={`$${Math.abs(totalProfitLoss).toLocaleString()}`}
                change={{ 
                  value: `${((totalProfitLoss / totalValue) * 100).toFixed(2)}%`,
                  positive: totalProfitLoss >= 0 
                }}
                icon={totalProfitLoss >= 0 ? <FiTrendingUp size={16} /> : <FiTrendingDown size={16} />}
              />
              <MobileMetricCard
                label="Positions"
                value={portfolio.length}
                icon={<FiActivity size={16} />}
              />
            </>
          ) : (
            <>
              <MobileMetricCard
                label="Active"
                value={escrowStats?.activeEscrows || 0}
                icon={<FiActivity size={16} />}
              />
              <MobileMetricCard
                label="Total"
                value={escrowStats?.totalEscrows || 0}
                icon={<FiShield size={16} />}
              />
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs
          tabs={[
            { value: 'tokens', label: 'Tokens', badge: portfolio.length.toString() },
            { value: 'escrows', label: 'Escrows', badge: escrows.length.toString() },
          ]}
          value={activeTab}
          onChange={(tab) => setActiveTab(tab as 'tokens' | 'escrows')}
        />
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {activeTab === 'tokens' ? (
          <div className="space-y-3">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button
                variant="primary"
                size="sm"
                className="justify-center"
                onClick={() => router.push('/token/new')}
                icon={<FiPlus size={16} />}
              >
                Launch
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="justify-center"
                onClick={() => router.push('/browse')}
                icon={<FiArrowRight size={16} />}
              >
                Browse
              </Button>
            </div>

            {/* Token List */}
            {portfolio.map((item) => (
              <MobileCard
                key={item.token.address}
                className="cursor-pointer"
                onClick={() => router.push(`/token/${item.token.address}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {item.token.symbol[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {item.token.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {item.balance.toLocaleString()} {item.token.symbol}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-text-primary">
                      ${item.value.toLocaleString()}
                    </p>
                    <p className={cn(
                      "text-xs font-medium",
                      item.profitLoss >= 0 ? "text-success" : "text-danger"
                    )}>
                      {item.profitLoss >= 0 ? '+' : ''}{item.profitLossPercentage.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </MobileCard>
            ))}

            {portfolio.length === 0 && (
              <div className="text-center py-8">
                <p className="text-text-muted text-sm mb-4">No tokens yet</p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/browse')}
                >
                  Browse Tokens
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Quick Actions */}
            <Button
              variant="primary"
              className="w-full justify-center mb-4"
              onClick={() => router.push('/escrow/new')}
              icon={<FiPlus size={16} />}
            >
              Create Escrow
            </Button>

            {/* Escrow List */}
            {escrows.map((escrow) => {
              const progress = ((escrow.milestones || []).filter((m: any) => m.status === 'approved').length / (escrow.milestones || []).length) * 100 || 0;
              
              return (
                <MobileCard
                  key={escrow.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/escrow/${escrow.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs font-mono text-text-muted mb-1">
                        #{escrow.id.slice(-8)}
                      </p>
                      <p className="text-sm font-medium text-text-primary">
                        {formatTokenAmount((escrow as any).totalAmount || escrow.amount, (escrow as any).tokenDecimals || 18)} {(escrow as any).tokenSymbol || 'USDC'}
                      </p>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      escrow.status === 'active' ? "bg-success/10 text-success" :
                      escrow.status === 'completed' ? "bg-primary/10 text-primary" :
                      (escrow as any).disputeActive ? "bg-danger/10 text-danger" :
                      "bg-surface3 text-text-muted"
                    )}>
                      {(escrow as any).disputeActive ? 'Disputed' : escrow.status}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                    <FiClock size={12} />
                    <span>{(escrow.milestones || []).filter((m: any) => m.status === 'approved').length}/{(escrow.milestones || []).length} milestones</span>
                  </div>
                  
                  <div className="w-full h-1.5 bg-surface3 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </MobileCard>
              );
            })}

            {escrows.length === 0 && (
              <div className="text-center py-8">
                <p className="text-text-muted text-sm mb-4">No escrows yet</p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/escrow/new')}
                >
                  Create Escrow
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}