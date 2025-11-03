'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MobileLayout, MobileCard } from './MobileLayout';
import { Input } from '@/components/alien/Input';
import { Button } from '@/components/alien/Button';
import { useTokens, TokenFilters } from '@/hooks/useTokens';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { getTokenImageUrl } from '@/lib/image-utils';
import {
  FiSearch,
  FiFilter,
  FiTrendingUp,
  FiClock,
  FiDollarSign,
  FiUsers,
  FiX,
  FiArrowUp,
  FiArrowDown
} from 'react-icons/fi';
import { cn } from '@/lib/utils';

type SortOption = 'trending' | 'newest' | 'volume' | 'marketCap';
type FilterOption = 'all' | 'new' | 'bonding' | 'graduated';

export function MobileBrowsePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('trending');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  // Build filters for API
  const filters: TokenFilters = useMemo(() => ({
    search: searchQuery,
    status: filterBy === 'graduated' ? 'graduated' : filterBy === 'bonding' ? 'active' : 'all',
  }), [searchQuery, filterBy]);

  // Use real API hook
  const { tokens, loading, error, total, refetch } = useTokens(
    filters,
    sortBy === 'newest' ? 'new' : sortBy,
    20,
    (page - 1) * 20
  );

  const totalPages = Math.ceil(total / 20);

  const handleLoadMore = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  return (
    <MobileLayout title="Browse">
      {/* Search Bar */}
      <div className="sticky top-14 z-20 bg-canvas border-b border-border">
        <div className="px-4 py-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search tokens..."
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
        </div>

        {/* Quick Filters */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {(['all', 'new', 'bonding', 'graduated'] as FilterOption[]).map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  setFilterBy(filter);
                  setPage(1); // Reset pagination
                }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  filterBy === filter
                    ? 'bg-primary text-white'
                    : 'bg-surface2 text-text-muted hover:text-text-secondary'
                )}
              >
                {filter === 'all' ? 'All' : 
                 filter === 'new' ? 'New' :
                 filter === 'bonding' ? 'Bonding' : 'Graduated'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Token List */}
      <div className="px-4 py-3">
        {loading && page === 1 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-text-muted">Loading tokens...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-danger text-sm">{error}</div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {tokens.map((token) => (
                <MobileCard
                  key={token.address}
                  className="cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => router.push(`/token/${token.address}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {token.logo ? (
                        <img 
                          src={getTokenImageUrl(token.logo)} 
                          alt={token.symbol}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">
                            {token.symbol?.charAt(0) || '?'}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {token.name}
                        </p>
                        <p className="text-xs text-text-muted">
                          ${token.symbol}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-sm font-medium flex items-center gap-1 justify-end",
                        token.change24h > 0 ? "text-success" : token.change24h < 0 ? "text-danger" : "text-text-primary"
                      )}>
                        {token.change24h > 0 ? (
                          <FiArrowUp size={12} />
                        ) : token.change24h < 0 ? (
                          <FiArrowDown size={12} />
                        ) : null}
                        {Math.abs(token.change24h).toFixed(2)}%
                      </p>
                      <p className="text-xs text-text-muted">
                        {token.launchTime}
                      </p>
                    </div>
                  </div>

                  {/* Token Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-text-muted">MCap</p>
                      <p className="text-text-primary font-medium">
                        {formatCurrency(parseFloat(token.marketCap))}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-muted">Volume</p>
                      <p className="text-text-primary font-medium">
                        {formatCurrency(parseFloat(token.volume24h))}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-muted">Holders</p>
                      <p className="text-text-primary font-medium">
                        {formatNumber(token.holders)}
                      </p>
                    </div>
                  </div>

                  {/* Bonding Progress */}
                  {token.bondingProgress !== undefined && token.bondingProgress < 100 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-text-muted">Bonding</span>
                        <span className="text-primary">{token.bondingProgress.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-surface3 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${token.bondingProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </MobileCard>
              ))}
            </div>

            {tokens.length === 0 && (
              <div className="text-center py-12">
                <p className="text-text-muted text-sm">No tokens found</p>
              </div>
            )}

            {/* Load More Button */}
            {page < totalPages && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="secondary"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Filter Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 bg-canvas">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 rounded-lg hover:bg-surface2 transition-colors"
              >
                <FiX size={20} className="text-text-muted" />
              </button>
            </div>

            {/* Filter Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {/* Sort By */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-text-primary mb-3">Sort By</h3>
                <div className="space-y-2">
                  {[
                    { value: 'trending', label: 'Trending', icon: FiTrendingUp },
                    { value: 'newest', label: 'Newest', icon: FiClock },
                    { value: 'volume', label: 'Volume', icon: FiDollarSign },
                    { value: 'marketCap', label: 'Market Cap', icon: FiUsers },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value as SortOption)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                        sortBy === option.value
                          ? 'bg-primary/10 text-primary'
                          : 'bg-surface2 text-text-secondary hover:bg-surface3'
                      )}
                    >
                      <option.icon size={18} />
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-border">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => {
                  setShowFilters(false);
                  setPage(1); // Reset pagination when filters change
                  refetch();
                }}
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