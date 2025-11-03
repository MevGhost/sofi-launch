'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { MobileLayout, MobileCard, MobileMetricCard } from './MobileLayout';
import { Button } from '@/components/alien/Button';
import { Tabs, Chip } from '@/components/alien/Layout';
import { Input } from '@/components/alien/Input';
import { useEscrows, useDashboardStats } from '@/hooks/useEscrows';
import { formatTokenAmount } from '@/lib/format';
import {
  FiShield,
  FiDollarSign,
  FiActivity,
  FiAlertTriangle,
  FiPlus,
  FiSearch,
  FiFilter,
  FiClock,
  FiCheckCircle,
  FiX,
  FiEye,
  FiArrowRight
} from 'react-icons/fi';
import { cn } from '@/lib/utils';

type EscrowFilter = 'all' | 'active' | 'pending' | 'completed' | 'disputed';
type RoleFilter = 'all' | 'creator' | 'kol';

export default function MobileEscrowDashboard() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EscrowFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Fetch escrow data
  const { escrows, loading: escrowsLoading } = useEscrows(roleFilter === 'all' ? undefined : roleFilter);
  const { stats: escrowStats } = useDashboardStats();

  // Filter escrows
  const filteredEscrows = escrows.filter(escrow => {
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'disputed' && !(escrow as any).disputeActive) return false;
      if (statusFilter !== 'disputed' && escrow.status !== statusFilter.toUpperCase()) return false;
    }
    
    // Search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        escrow.id.toLowerCase().includes(search) ||
        (escrow as any).tokenSymbol.toLowerCase().includes(search)
      );
    }
    
    return true;
  });

  if (!isConnected) {
    return (
      <MobileLayout title="Escrows">
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiShield className="text-primary" size={24} />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Connect Wallet
            </h2>
            <p className="text-sm text-text-secondary mb-6">
              Connect your wallet to manage escrows
            </p>
            <ConnectButton />
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Escrows">
      {/* Stats Section */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <MobileMetricCard
            label="Total Escrows"
            value={escrowStats?.totalEscrows || 0}
            icon={<FiShield size={16} />}
          />
          <MobileMetricCard
            label="Active"
            value={escrowStats?.activeEscrows || 0}
            change={{ value: '12', positive: true }}
            icon={<FiActivity size={16} />}
          />
          <MobileMetricCard
            label="Total Volume"
            value={escrowStats ? `$${(parseInt(escrowStats.totalValue) / 1000000).toFixed(2)}M` : '$0'}
            icon={<FiDollarSign size={16} />}
          />
          <MobileMetricCard
            label="Disputes"
            value={escrowStats?.disputes || 0}
            change={{ value: '2', positive: false }}
            icon={<FiAlertTriangle size={16} />}
          />
        </div>

        {/* Create Button */}
        <Button
          variant="primary"
          className="w-full justify-center mb-4"
          onClick={() => router.push('/escrow/new')}
          icon={<FiPlus size={16} />}
        >
          Create New Escrow
        </Button>

        {/* Search and Filters */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search escrows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<FiSearch size={18} />}
              className="h-10"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(true)}
            className="px-3"
            icon={<FiFilter size={18} />}
          />
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
          {(['all', 'active', 'pending', 'completed', 'disputed'] as EscrowFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                statusFilter === filter
                  ? 'bg-primary text-white'
                  : 'bg-surface2 text-text-muted hover:text-text-secondary'
              )}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Escrow List */}
      <div className="px-4 pb-8">
        <div className="space-y-3">
          {filteredEscrows.map((escrow) => {
            const progress = ((escrow.milestones || []).filter((m: any) => m.status === 'approved').length / (escrow.milestones || []).length) * 100 || 0;
            const isCreator = escrow.creator === address;
            
            return (
              <MobileCard
                key={escrow.id}
                className="cursor-pointer"
                onClick={() => router.push(`/escrow/${escrow.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-mono text-text-muted">
                        #{escrow.id.slice(-8)}
                      </p>
                      <Chip 
                        variant={
                          escrow.status === 'active' ? 'success' :
                          (escrow as any).disputeActive ? 'danger' :
                          escrow.status === 'completed' ? 'primary' :
                          'default'
                        }
                      >
                        {(escrow as any).disputeActive ? 'Disputed' : escrow.status}
                      </Chip>
                    </div>
                    <p className="text-sm font-medium text-text-primary">
                      {formatTokenAmount((escrow as any).totalAmount, (escrow as any).tokenDecimals)} {(escrow as any).tokenSymbol}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-muted mb-1">
                      {isCreator ? 'Creator' : 'KOL'}
                    </p>
                    <FiEye size={14} className="text-text-muted ml-auto" />
                  </div>
                </div>

                {/* Milestones Progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-muted">Milestones</span>
                    <span className="text-text-primary">
                      {(escrow.milestones || []).filter((m: any) => m.status === 'approved').length}/{(escrow.milestones || []).length}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface3 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-text-muted">
                    <div className="flex items-center gap-1">
                      <FiClock size={12} />
                      <span>
                        {new Date(escrow.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/escrow/${escrow.id}`);
                    }}
                    className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                  >
                    <span>View</span>
                    <FiArrowRight size={12} />
                  </button>
                </div>
              </MobileCard>
            );
          })}
        </div>

        {filteredEscrows.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-muted text-sm mb-4">No escrows found</p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push('/escrow/new')}
            >
              Create First Escrow
            </Button>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 bg-canvas">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 text-text-muted hover:text-text-primary transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Filter Options */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Role Filter */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-text-primary mb-3">Role</h3>
                <div className="space-y-2">
                  {[
                    { value: 'all', label: 'All Roles' },
                    { value: 'creator', label: 'As Creator' },
                    { value: 'kol', label: 'As KOL' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setRoleFilter(option.value as RoleFilter)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-lg transition-colors',
                        roleFilter === option.value
                          ? 'bg-primary/10 text-primary'
                          : 'text-text-secondary hover:bg-surface2'
                      )}
                    >
                      <span className="text-sm">{option.label}</span>
                      {roleFilter === option.value && (
                        <FiCheckCircle size={16} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <h3 className="text-sm font-medium text-text-primary mb-3">Status</h3>
                <div className="space-y-2">
                  {[
                    { value: 'all', label: 'All Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'disputed', label: 'Disputed' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setStatusFilter(option.value as EscrowFilter)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-lg transition-colors',
                        statusFilter === option.value
                          ? 'bg-primary/10 text-primary'
                          : 'text-text-secondary hover:bg-surface2'
                      )}
                    >
                      <span className="text-sm">{option.label}</span>
                      {statusFilter === option.value && (
                        <FiCheckCircle size={16} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Apply Button */}
            <div className="p-4 border-t border-border">
              <Button
                variant="primary"
                className="w-full justify-center"
                onClick={() => setShowFilters(false)}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}