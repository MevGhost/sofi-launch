'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import { LayoutShell, SectionHeader } from '@/components/alien/Layout';
import { Button } from '@/components/alien/Button';
import { Card } from '@/components/alien/Card';
import { Input } from '@/components/alien/Input';
import { apiRequest, API_ENDPOINTS } from '@/lib/api/config';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { TokenCardWithRealData } from '@/components/TokenCardWithRealData';
import { 
  FiSearch, 
  FiTrendingUp, 
  FiArrowUpRight,
  FiArrowDownRight,
  FiClock,
  FiUsers,
  FiZap,
  FiGrid,
  FiList,
  FiRefreshCw,
  FiActivity
} from 'react-icons/fi';

interface Token {
  address: string;
  name: string;
  symbol: string;
  marketCap: string;
  liquidity: string;
  bondingProgress: number;
  price: string;
  currentPrice?: string;
  holders: number;
  holdersCount?: number;
  change24h: number;
  volume24h: string;
  createdAt: string;
  totalSupply: string;
  imageUrl?: string;
  logo?: string;
}

export default function SimpleBrowsePage() {
  const router = useRouter();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'marketCap' | 'volume' | 'new' | 'trending'>('marketCap');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const itemsPerPage = 20;

  // Fetch tokens from backend
  const fetchTokens = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((page - 1) * itemsPerPage).toString(),
        sortBy: sortBy,
        search: searchTerm
      });

      const response = await apiRequest<{
        success: boolean;
        data: {
          tokens: Token[];
          total: number;
        }
      }>(`${API_ENDPOINTS.tokens.list}?${params}`);

      if (response.success) {
        setTokens(response.data.tokens);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [page, sortBy, searchTerm]);

  // Auto refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchTokens, 30000);
    return () => clearInterval(interval);
  }, [page, sortBy, searchTerm]);

  const handleTokenClick = (address: string) => {
    router.push(`/token/${address}`);
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <LayoutShell>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <SectionHeader 
            title="Browse Tokens" 
            subtitle={`Discover ${total} tokens on Base`}
          />
          <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
            <FiActivity className="text-primary" size={14} />
            <span>Live blockchain data • Updates every 30 seconds</span>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1); // Reset to first page on search
                }}
                placeholder="Search by name or symbol..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Sort Options */}
          <div className="flex gap-2">
            <Button
              variant={sortBy === 'marketCap' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('marketCap')}
              icon={<FiTrendingUp size={16} />}
            >
              Market Cap
            </Button>
            <Button
              variant={sortBy === 'volume' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('volume')}
              icon={<FiArrowUpRight size={16} />}
            >
              Volume
            </Button>
            <Button
              variant={sortBy === 'new' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('new')}
              icon={<FiClock size={16} />}
            >
              New
            </Button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-1 bg-surface2 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-primary text-white' 
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <FiGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list' 
                  ? 'bg-primary text-white' 
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <FiList size={18} />
            </button>
          </div>

          {/* Action Buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchTokens()}
            icon={<FiRefreshCw size={16} />}
            disabled={loading}
          >
            Refresh
          </Button>
          
          <Button
            variant="primary"
            onClick={() => router.push('/token/new')}
            icon={<FiZap size={16} />}
          >
            Launch Token
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-text-muted">Loading tokens...</span>
            </div>
          </div>
        ) : tokens.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-text-muted mb-4">No tokens found</p>
            <Button variant="primary" onClick={() => router.push('/token/new')}>
              Launch the first token
            </Button>
          </Card>
        ) : viewMode === 'grid' ? (
          // Grid View with Real Blockchain Data
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tokens.map((token) => (
              <TokenCardWithRealData
                key={token.address}
                token={token}
                onClick={handleTokenClick}
              />
            ))}
          </div>
        ) : (
          // List View
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Token</th>
                  <th className="text-right py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Price</th>
                  <th className="text-right py-3 px-4 text-xs text-text-muted uppercase tracking-wider">24h</th>
                  <th className="text-right py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Market Cap</th>
                  <th className="text-right py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Volume</th>
                  <th className="text-right py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Holders</th>
                  <th className="text-center py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Progress</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr
                    key={token.address}
                    className="border-b border-border hover:bg-surface2/50 cursor-pointer transition-colors"
                    onClick={() => handleTokenClick(token.address)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {/* Token Image */}
                        {(token.imageUrl || token.logo) && (
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-surface3 flex-shrink-0">
                            <img 
                              src={(() => {
                                const imgUrl = token.imageUrl || token.logo || '';
                                return imgUrl.startsWith('http') 
                                  ? imgUrl 
                                  : `http://localhost:5001${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
                              })()}
                              alt={token.symbol}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-text-primary">{token.symbol}</p>
                          <p className="text-xs text-text-muted">{token.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-mono text-sm text-text-primary">
                      ${parseFloat(token.currentPrice || token.price || '0.000001').toFixed(8)}
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={`text-sm font-medium flex items-center justify-end gap-1 ${
                        token.change24h >= 0 ? 'text-success' : 'text-danger'
                      }`}>
                        {token.change24h >= 0 ? <FiArrowUpRight size={14} /> : <FiArrowDownRight size={14} />}
                        {Math.abs(token.change24h || 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-text-primary">
                      {formatNumber(parseFloat(token.marketCap))}
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-text-primary">
                      {formatNumber(parseFloat(token.volume24h || '0'))}
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-text-primary">
                      {token.holdersCount || token.holders || 0}
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-20 mx-auto">
                        <div className="w-full h-1.5 bg-surface3 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                            style={{ width: `${Math.min(token.bondingProgress || 0, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-center text-text-muted mt-1">
                          {typeof token.bondingProgress === 'number' 
                            ? token.bondingProgress < 0.01 
                              ? '<0.01%' 
                              : `${token.bondingProgress.toFixed(2)}%`
                            : '0%'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            
            <div className="flex gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}