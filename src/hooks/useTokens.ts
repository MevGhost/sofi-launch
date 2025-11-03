'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { API_ENDPOINTS, apiRequest, wsManager, WS_EVENTS } from '@/lib/api/config';

export interface Token {
  address: string;
  name: string;
  symbol: string;
  logo?: string;
  description?: string;
  marketCap: string;
  liquidity: string;
  bondingProgress: number;
  launchTime: string;
  totalSupply: string;
  holders: number;
  change24h: number;
  volume24h: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  creator?: {
    address: string;
    name?: string;
    avatar?: string;
  };
  trades?: any[];
}

export interface TokenFilters {
  search?: string;
  category?: string;
  minMarketCap?: number;
  maxMarketCap?: number;
  showVerified?: boolean;
  minHolders?: number;
  maxAge?: number;
  status?: 'all' | 'active' | 'graduated';
}

/**
 * Hook for fetching tokens from the backend API
 */
export function useTokens(filters?: TokenFilters, sortBy: string = 'marketCap', limit: number = 50, offset: number = 0) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());
      params.append('sortBy', sortBy);
      
      if (filters?.search) params.append('search', filters.search);
      if (filters?.status) params.append('status', filters.status);
      
      const url = `${API_ENDPOINTS.tokens.list}?${params}`;
      const response = await apiRequest<{ 
        success: boolean; 
        data: { 
          tokens: Token[]; 
          total: number;
          limit: number;
          offset: number;
        } 
      }>(url);
      
      if (response.success) {
        setTokens(response.data.tokens);
        setTotal(response.data.total);
      } else {
        throw new Error('Failed to fetch tokens');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tokens';
      setError(errorMessage);
      console.error('Error fetching tokens:', err);
      setTokens([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy, limit, offset]);

  // Subscribe to WebSocket events for real-time updates
  useEffect(() => {
    if (!wsManager) return;

    const unsubscribeCreated = wsManager.on(WS_EVENTS.TOKEN_CREATED, (data: Token) => {
      setTokens(prev => [data, ...prev]);
      setTotal(prev => prev + 1);
    });

    const unsubscribeTrade = wsManager.on(WS_EVENTS.TOKEN_TRADE, (data: any) => {
      setTokens(prev => prev.map(token => 
        token.address === data.tokenAddress 
          ? { ...token, ...data.updates }
          : token
      ));
    });

    const unsubscribeGraduated = wsManager.on(WS_EVENTS.TOKEN_GRADUATED, (data: any) => {
      setTokens(prev => prev.map(token => 
        token.address === data.tokenAddress 
          ? { ...token, bondingProgress: 100, status: 'graduated' }
          : token
      ));
    });

    return () => {
      unsubscribeCreated();
      unsubscribeTrade();
      unsubscribeGraduated();
    };
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return { tokens, loading, error, total, refetch: fetchTokens };
}

/**
 * Hook for fetching a single token
 */
export function useToken(address: string) {
  const [token, setToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest<{ success: boolean; data: Token }>(
        API_ENDPOINTS.tokens.details(address)
      );
      
      if (response.success) {
        setToken(response.data);
      } else {
        throw new Error('Token not found');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch token';
      setError(errorMessage);
      console.error('Error fetching token:', err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Subscribe to WebSocket events for this specific token
  useEffect(() => {
    if (!wsManager || !address) return;

    const unsubscribeTrade = wsManager.on(WS_EVENTS.TOKEN_TRADE, (data: any) => {
      if (data.tokenAddress === address) {
        fetchToken(); // Refetch to get updated data
      }
    });

    const unsubscribePriceUpdate = wsManager.on(WS_EVENTS.TOKEN_PRICE_UPDATE, (data: any) => {
      if (data.tokenAddress === address && token) {
        setToken(prev => prev ? { ...prev, ...data.updates } : prev);
      }
    });

    return () => {
      unsubscribeTrade();
      unsubscribePriceUpdate();
    };
  }, [address, fetchToken, token]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  return { token, loading, error, refetch: fetchToken };
}

/**
 * Hook for token trading operations
 */
export function useTokenTrading() {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buyTokens = useCallback(async (
    tokenAddress: string,
    amount: string,
    slippage: number = 0.01
  ) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest<{ 
        success: boolean; 
        data: { 
          trade: any;
          transactionHash: string;
        } 
      }>(API_ENDPOINTS.tokens.buy, {
        method: 'POST',
        body: JSON.stringify({
          tokenAddress,
          amount,
          slippage
        }),
      });
      
      if (!response.success) {
        throw new Error('Failed to buy tokens');
      }
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to buy tokens';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address]);

  const sellTokens = useCallback(async (
    tokenAddress: string,
    amount: string,
    slippage: number = 0.01
  ) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest<{ 
        success: boolean; 
        data: { 
          trade: any;
          transactionHash: string;
        } 
      }>(API_ENDPOINTS.tokens.sell, {
        method: 'POST',
        body: JSON.stringify({
          tokenAddress,
          amount,
          slippage
        }),
      });
      
      if (!response.success) {
        throw new Error('Failed to sell tokens');
      }
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sell tokens';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address]);

  const createToken = useCallback(async (params: {
    name: string;
    symbol: string;
    description?: string;
    imageUrl?: string;
    twitter?: string;
    telegram?: string;
    website?: string;
    totalSupply?: string;
    bondingCurveType?: string;
  }) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest<{ 
        success: boolean; 
        data: Token 
      }>(API_ENDPOINTS.tokens.create, {
        method: 'POST',
        body: JSON.stringify(params),
      });
      
      if (!response.success) {
        throw new Error('Failed to create token');
      }
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create token';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address]);

  return {
    buyTokens,
    sellTokens,
    createToken,
    loading,
    error
  };
}

/**
 * Hook for token chart data
 */
export function useTokenChart(address: string, interval: string = '1h', period: string = '24h') {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    const fetchChartData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams({
          interval,
          period
        });
        
        const response = await apiRequest<{ success: boolean; data: any[] }>(
          `${API_ENDPOINTS.tokens.chart(address)}?${params}`
        );
        
        if (response.success) {
          setChartData(response.data);
        }
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch chart data');
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [address, interval, period]);

  return { chartData, loading, error };
}

/**
 * Hook for user's token portfolio
 */
export function useTokenPortfolio() {
  const { address } = useAccount();
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setPortfolio([]);
      setStats(null);
      setLoading(false);
      return;
    }

    const fetchPortfolio = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await apiRequest<{ 
          success: boolean; 
          data: {
            tokens: any[];
            stats: any;
          }
        }>(`${API_ENDPOINTS.portfolio.tokens}?address=${address}`);
        
        if (response.success) {
          setPortfolio(response.data.tokens);
          setStats(response.data.stats);
        }
      } catch (err) {
        console.error('Error fetching portfolio:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch portfolio');
        
        // Fallback to empty portfolio
        setPortfolio([]);
        setStats({
          totalValue: '0',
          totalPnL: '0',
          totalPnLPercent: 0,
          tokensHeld: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [address]);

  return { portfolio, stats, loading, error };
}