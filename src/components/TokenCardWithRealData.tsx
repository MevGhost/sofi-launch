'use client';

import React, { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import { Card } from '@/components/alien/Card';
import { formatCurrency } from '@/lib/utils';
import { FiArrowUpRight, FiArrowDownRight, FiUsers, FiActivity } from 'react-icons/fi';

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
    inputs: [{name: "_token", type: "address"}],
    name: "bondingProgress",
    outputs: [{name: "", type: "uint256"}],
    stateMutability: "view",
    type: "function"
  }
] as const;

interface TokenCardProps {
  token: {
    address: string;
    name: string;
    symbol: string;
    marketCap: string;
    price: string;
    currentPrice?: string;
    bondingProgress: number;
    holdersCount?: number;
    holders?: number;
    volume24h?: string;
    change24h?: number;
    imageUrl?: string;
    logo?: string;
    description?: string;
  };
  onClick: (address: string) => void;
}

export function TokenCardWithRealData({ token, onClick }: TokenCardProps) {
  const publicClient = usePublicClient();
  const [blockchainData, setBlockchainData] = useState<{
    price: number;
    marketCap: number;
    bondingProgress: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicClient) return;

    const fetchBlockchainData = async () => {
      try {
        setLoading(true);
        const [price, marketCap, progress] = await Promise.all([
          publicClient.readContract({
            address: FACTORY_ADDRESS as `0x${string}`,
            abi: FACTORY_ABI,
            functionName: 'getTokenPrice',
            args: [token.address as `0x${string}`],
          }).catch(() => BigInt(0)),
          
          publicClient.readContract({
            address: FACTORY_ADDRESS as `0x${string}`,
            abi: FACTORY_ABI,
            functionName: 'calculateMarketCap',
            args: [token.address as `0x${string}`],
          }).catch(() => BigInt(0)),
          
          publicClient.readContract({
            address: FACTORY_ADDRESS as `0x${string}`,
            abi: FACTORY_ABI,
            functionName: 'bondingProgress',
            args: [token.address as `0x${string}`],
          }).catch(() => BigInt(0)),
        ]);

        // Fetch ETH price to convert market cap to USD
        // We'll assume $3000 for now on frontend (could add API call)
        const ETH_PRICE_USD = 3000;
        const marketCapInETH = parseFloat(formatEther(marketCap));
        const marketCapInUSD = marketCapInETH * ETH_PRICE_USD;
        
        // Only update if we got valid data (not 0)
        if (price > BigInt(0) || marketCap > BigInt(0)) {
          setBlockchainData({
            price: parseFloat(formatEther(price)) * ETH_PRICE_USD, // Convert to USD
            marketCap: marketCapInUSD, // Store in USD
            bondingProgress: Number(progress),
          });
        }
      } catch (error) {
        console.error('Error fetching blockchain data for', token.symbol, error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlockchainData();
  }, [publicClient, token.address]);

  // Use blockchain data if available, otherwise fall back to backend data
  const displayPrice = blockchainData?.price || parseFloat(token.currentPrice || token.price || '0.000001');
  const displayMarketCap = blockchainData?.marketCap || parseFloat(token.marketCap);
  // Calculate bonding progress based on market cap vs $69k if not from backend
  const displayProgress = token.bondingProgress || 
    (displayMarketCap > 0 ? Math.min((displayMarketCap / 69000) * 100, 100) : 0);
  const displayHolders = token.holdersCount || token.holders || 0;

  // Use actual 24h change from backend, or 0 if not available
  const displayChange = token.change24h || 0;

  return (
    <Card
      className="p-4 bg-surface1 border border-border hover:border-primary/50 cursor-pointer transition-all relative"
      onClick={() => onClick(token.address)}
    >
      {/* Loading indicator */}
      {loading && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        </div>
      )}

      {/* Blockchain data indicator */}
      {blockchainData && (
        <div className="absolute top-2 right-2" title="Live blockchain data">
          <FiActivity className="text-primary" size={12} />
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          {/* Token Image */}
          {(token.imageUrl || token.logo) && (
            <div className="w-10 h-10 rounded-full overflow-hidden bg-surface3 flex-shrink-0">
              <img 
                src={(() => {
                  const imgUrl = (token.imageUrl || token.logo || '');
                  return imgUrl.startsWith('http') 
                    ? imgUrl 
                    : `http://localhost:5001${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
                })()}
                alt={token.symbol}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Hide image if it fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-text-primary">{token.symbol}</h3>
            <p className="text-xs text-text-muted truncate max-w-[120px]">{token.name}</p>
          </div>
        </div>
        <div className={`text-sm font-medium flex items-center gap-1 ${
          displayChange >= 0 ? 'text-success' : 'text-danger'
        }`}>
          {displayChange >= 0 ? <FiArrowUpRight size={14} /> : <FiArrowDownRight size={14} />}
          {Math.abs(displayChange).toFixed(2)}%
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Price</span>
          <span className="text-text-primary font-mono">
            ${displayPrice.toFixed(8)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Market Cap</span>
          <span className="text-text-primary">
            {formatCurrency(displayMarketCap)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Holders</span>
          <span className="text-text-primary flex items-center gap-1">
            <FiUsers size={12} />
            {displayHolders}
          </span>
        </div>
        
        {/* Bonding Progress */}
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-muted">Bonding Progress</span>
            <span className="text-text-primary">
              {typeof displayProgress === 'number' 
                ? displayProgress < 0.01 
                  ? '<0.01%' 
                  : `${displayProgress.toFixed(2)}%`
                : '0%'}
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface3 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
              style={{ width: `${Math.min(displayProgress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-text-muted mt-1">
            {displayProgress >= 100 
              ? 'Graduated to DEX' 
              : displayProgress < 0.01 
                ? '<$0.01k / $69k'
                : `$${(69 * displayProgress / 100).toFixed(1)}k / $69k`}
          </p>
        </div>
      </div>
    </Card>
  );
}