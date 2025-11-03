'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { showToast } from '@/components/ToastProvider';
import { API_ENDPOINTS, apiRequest, getAuthHeaders } from '@/lib/api/config';
import { useAuth } from '@/hooks/useAuth';

// Bonding Curve ABI
const BONDING_CURVE_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "_token", "type": "address"},
      {"internalType": "uint256", "name": "_minTokensOut", "type": "uint256"}
    ],
    "name": "buyTokens",
    "outputs": [{"internalType": "uint256", "name": "tokensOut", "type": "uint256"}],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "_token", "type": "address"},
      {"internalType": "uint256", "name": "_tokenAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "_minEthOut", "type": "uint256"}
    ],
    "name": "sellTokens",
    "outputs": [{"internalType": "uint256", "name": "ethOut", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_token", "type": "address"}],
    "name": "getTokenPrice",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_token", "type": "address"}],
    "name": "calculateMarketCap",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_token", "type": "address"}],
    "name": "bondingProgress",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "_token", "type": "address"},
      {"internalType": "uint256", "name": "_ethAmount", "type": "uint256"}
    ],
    "name": "calculateBuyReturn",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "_token", "type": "address"},
      {"internalType": "uint256", "name": "_tokenAmount", "type": "uint256"}
    ],
    "name": "calculateSellReturn",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// ERC20 ABI for token approval
const ERC20_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Use DevBondingCurve factory address from env or config
const BONDING_CURVE_ADDRESS = (process.env.NEXT_PUBLIC_DEV_BONDING_FACTORY_ADDRESS || '0x46eCf02772C4Bc9a5cd440FB93022d6e268355c8') as `0x${string}`;

export interface TokenMetrics {
  price: string;
  marketCap: string;
  liquidity: string;
  bondingProgress: number;
  holders: number;
  volume24h: string;
}

export function useBondingCurve(tokenAddress?: string) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<TokenMetrics | null>(null);
  const { isAuthenticated, login, token: authToken } = useAuth();
  const mountedRef = useRef(true);
  
  console.log('[useBondingCurve] Hook initialized:', {
    tokenAddress,
    isConnected,
    hasAddress: !!address,
    hasPublicClient: !!publicClient,
    hasWalletClient: !!walletClient,
    isAuthenticated
  });

  // Clean up on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Fetch token metrics with rate limit protection
  const fetchMetrics = useCallback(async () => {
    if (!tokenAddress) return;

    console.log('[useBondingCurve] Fetching metrics for:', tokenAddress);
    
    try {
      // Always prioritize backend data to reduce RPC calls
      const response = await apiRequest<{ success: boolean; data: any }>(
        API_ENDPOINTS.tokens.details(tokenAddress)
      );
      
      console.log('[useBondingCurve] Backend response:', response);
      
      if (response?.success && response.data) {
        // Use backend data as primary source
        // Convert price from wei if it's a large number
        let price = response.data.currentPrice || response.data.price || '0.000001';
        if (price && price.length > 10 && !price.includes('.')) {
          // Likely in wei, convert to ETH
          price = formatEther(BigInt(price));
        }
        
        const newMetrics = {
          price: price,
          marketCap: response.data.marketCap || '1000',
          liquidity: response.data.liquidity || '1000',
          bondingProgress: response.data.bondingProgress || 1,
          holders: response.data.holdersCount || 1,
          volume24h: response.data.volume24h || '0',
        };
        
        console.log('[useBondingCurve] Setting metrics:', newMetrics);
        setMetrics(newMetrics);
        
        // Skip blockchain calls entirely if we have backend data to avoid rate limits
        // Backend already fetches from blockchain periodically
        console.log('[useBondingCurve] Using backend data, skipping blockchain calls to avoid rate limits');
      }
    } catch (error: any) {
      // Only log error if it's not a 404 (token doesn't exist yet)
      if (error?.status !== 404) {
        console.error('Error fetching token metrics:', error);
      }
      
      // Don't spam with retries if rate limited
      if (!error?.message?.includes('429') && error?.status !== 404) {
        // Set default values if not rate limited or 404
        setMetrics({
          price: '0.000001',
          marketCap: '1000',
          liquidity: '1000',
          bondingProgress: 1,
          holders: 1,
          volume24h: '0',
        });
      } else if (error?.status === 404) {
        // For 404, set placeholder values - token will be synced automatically by the page
        console.log('[useBondingCurve] Token not found (404), will be synced automatically');
        setMetrics({
          price: '0.000001',
          marketCap: '1000',
          liquidity: '1000',
          bondingProgress: 1,
          holders: 1,
          volume24h: '0',
        });
      }
    }
  }, [tokenAddress, publicClient]);

  // Buy tokens through bonding curve
  const buyTokens = useCallback(async (ethAmount: string, slippage: number = 0.01) => {
    console.log('[buyTokens] Starting buy with amount:', ethAmount, 'slippage:', slippage);
    
    if (!isConnected || !address || !tokenAddress) {
      console.error('[buyTokens] Missing requirements - connected:', isConnected, 'address:', address, 'token:', tokenAddress);
      showToast.error('Please connect your wallet');
      return null;
    }

    // Check wallet client availability
    if (!walletClient) {
      console.error('[buyTokens] No wallet client');
      showToast.error('Wallet not ready. Please try again.');
      return null;
    }

    // Check public client availability
    if (!publicClient) {
      console.error('[buyTokens] No public client');
      showToast.error('Connection not ready. Please try again.');
      return null;
    }

    // Ensure user is authenticated for backend tracking
    if (!isAuthenticated) {
      console.log('[buyTokens] Not authenticated, logging in...');
      showToast.info('Authenticating...');
      const loginSuccess = await login();
      if (!loginSuccess) {
        console.error('[buyTokens] Login failed');
        showToast.error('Authentication required for trading');
        return null;
      }
    }

    // Check if component is still mounted
    if (!mountedRef.current) {
      console.log('[buyTokens] Component unmounted');
      return null;
    }

    setIsLoading(true);
    
    try {
      console.log('[buyTokens] Calculating buy return for', ethAmount, 'ETH');
      // Calculate expected tokens with slippage
      const ethAmountWei = parseEther(ethAmount);
      console.log('[buyTokens] ETH amount in wei:', ethAmountWei.toString());
      
      const expectedTokens = await publicClient.readContract({
        address: BONDING_CURVE_ADDRESS,
        abi: BONDING_CURVE_ABI,
        functionName: 'calculateBuyReturn',
        args: [tokenAddress as `0x${string}`, ethAmountWei],
      });
      
      console.log('[buyTokens] Expected tokens:', expectedTokens.toString());

      const minTokensOut = expectedTokens * BigInt(Math.floor((1 - slippage) * 10000)) / BigInt(10000);

      showToast.loading('Please confirm the transaction in your wallet...');

      // Execute buy transaction
      const { request } = await publicClient.simulateContract({
        account: address,
        address: BONDING_CURVE_ADDRESS,
        abi: BONDING_CURVE_ABI,
        functionName: 'buyTokens',
        args: [tokenAddress as `0x${string}`, minTokensOut],
        value: ethAmountWei,
      });

      // Check wallet client is still valid before writing
      if (!walletClient || !mountedRef.current) {
        throw new Error('Wallet disconnected');
      }
      
      const hash = await walletClient.writeContract(request);
      
      // Check if component is still mounted
      if (!mountedRef.current) return null;
      
      showToast.loading('Buying tokens...');
      
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });
      
      // Check if component is still mounted after waiting
      if (!mountedRef.current) return null;

      // Record trade in backend for analytics and portfolio tracking
      try {
        console.log(`[buyTokens] Recording trade in backend: ${hash}`);
        
        const tradeResponse = await apiRequest(API_ENDPOINTS.tokens.buy, {
          method: 'POST',
          body: JSON.stringify({
            tokenAddress,
            amount: ethAmount,
            transactionHash: hash,
            slippage,
            tokensReceived: formatEther(expectedTokens),
          }),
        });
        
        console.log(`[buyTokens] Trade recorded successfully:`, tradeResponse);
      } catch (backendError: any) {
        // Log specific error details for debugging
        console.error('[buyTokens] Failed to record trade in backend:', {
          error: backendError.message || backendError,
          status: backendError.status,
          tokenAddress,
          hash,
          isAuthenticated
        });
        
        // Don't fail the transaction - blockchain succeeded
        if (backendError.status === 401) {
          console.warn('[buyTokens] Trade recording failed: Authentication required. Trade will not appear in portfolio until next login.');
        }
      }

      showToast.success(`Successfully bought tokens!`);
      
      // Refresh metrics
      await fetchMetrics();

      return {
        transactionHash: hash,
        tokensReceived: formatEther(expectedTokens),
      };
    } catch (error: any) {
      console.error('Buy tokens error:', error);
      
      if (error.message?.includes('User rejected')) {
        showToast.error('Transaction cancelled');
      } else if (error.message?.includes('Insufficient funds')) {
        showToast.error('Insufficient ETH balance');
      } else if (error.message?.includes('disconnected') || error.message?.includes('disposed')) {
        showToast.error('Wallet disconnected. Please reconnect and try again.');
      } else {
        showToast.error(error.message || 'Failed to buy tokens');
      }
      
      return null;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [address, isConnected, walletClient, publicClient, tokenAddress, fetchMetrics, isAuthenticated, login]);

  // Sell tokens through bonding curve
  const sellTokens = useCallback(async (tokenAmount: string, slippage: number = 0.01) => {
    if (!isConnected || !address || !tokenAddress) {
      showToast.error('Please connect your wallet');
      return null;
    }

    // Check wallet client availability
    if (!walletClient) {
      showToast.error('Wallet not ready. Please try again.');
      return null;
    }

    // Check public client availability  
    if (!publicClient) {
      showToast.error('Connection not ready. Please try again.');
      return null;
    }

    // Ensure user is authenticated for backend tracking
    if (!isAuthenticated) {
      showToast.info('Authenticating...');
      const loginSuccess = await login();
      if (!loginSuccess) {
        showToast.error('Authentication required for trading');
        return null;
      }
    }

    // Check if component is still mounted
    if (!mountedRef.current) return null;

    setIsLoading(true);
    
    try {
      // Calculate expected ETH with slippage
      const tokenAmountWei = parseEther(tokenAmount);
      const expectedEth = await publicClient.readContract({
        address: BONDING_CURVE_ADDRESS,
        abi: BONDING_CURVE_ABI,
        functionName: 'calculateSellReturn',
        args: [tokenAddress as `0x${string}`, tokenAmountWei],
      });

      const minEthOut = expectedEth * BigInt(Math.floor((1 - slippage) * 10000)) / BigInt(10000);

      // First approve tokens
      showToast.loading('Approving tokens...');
      
      const { request: approveRequest } = await publicClient.simulateContract({
        account: address,
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [BONDING_CURVE_ADDRESS, tokenAmountWei],
      });

      // Check wallet client is still valid before writing
      if (!walletClient || !mountedRef.current) {
        throw new Error('Wallet disconnected');
      }
      
      const approveHash = await walletClient.writeContract(approveRequest);
      
      // Check if component is still mounted
      if (!mountedRef.current) return null;
      
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      showToast.loading('Please confirm the sell transaction...');

      // Execute sell transaction
      const { request } = await publicClient.simulateContract({
        account: address,
        address: BONDING_CURVE_ADDRESS,
        abi: BONDING_CURVE_ABI,
        functionName: 'sellTokens',
        args: [tokenAddress as `0x${string}`, tokenAmountWei, minEthOut],
      });

      // Check wallet client is still valid before writing
      if (!walletClient || !mountedRef.current) {
        throw new Error('Wallet disconnected');
      }
      
      const hash = await walletClient.writeContract(request);
      
      // Check if component is still mounted
      if (!mountedRef.current) return null;
      
      showToast.loading('Selling tokens...');
      
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });
      
      // Check if component is still mounted after waiting
      if (!mountedRef.current) return null;

      // Record trade in backend for analytics and portfolio tracking
      try {
        console.log(`[sellTokens] Recording trade in backend: ${hash}`);
        
        const tradeResponse = await apiRequest(API_ENDPOINTS.tokens.sell, {
          method: 'POST',
          body: JSON.stringify({
            tokenAddress,
            amount: tokenAmount,
            transactionHash: hash,
            slippage,
            ethReceived: formatEther(expectedEth),
          }),
        });
        
        console.log(`[sellTokens] Trade recorded successfully:`, tradeResponse);
      } catch (backendError: any) {
        // Log specific error details for debugging
        console.error('[sellTokens] Failed to record trade in backend:', {
          error: backendError.message || backendError,
          status: backendError.status,
          tokenAddress,
          hash,
          isAuthenticated
        });
        
        // Don't fail the transaction - blockchain succeeded
        if (backendError.status === 401) {
          console.warn('[sellTokens] Trade recording failed: Authentication required. Trade will not appear in portfolio until next login.');
        }
      }

      showToast.success(`Successfully sold tokens!`);
      
      // Refresh metrics
      await fetchMetrics();

      return {
        transactionHash: hash,
        ethReceived: formatEther(expectedEth),
      };
    } catch (error: any) {
      console.error('Sell tokens error:', error);
      
      if (error.message?.includes('User rejected')) {
        showToast.error('Transaction cancelled');
      } else if (error.message?.includes('disconnected') || error.message?.includes('disposed')) {
        showToast.error('Wallet disconnected. Please reconnect and try again.');
      } else {
        showToast.error(error.message || 'Failed to sell tokens');
      }
      
      return null;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [address, isConnected, walletClient, publicClient, tokenAddress, fetchMetrics, isAuthenticated, login]);

  // Get user's token balance
  const getBalance = useCallback(async () => {
    if (!address || !publicClient || !tokenAddress) return '0';

    try {
      const balance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      });

      return formatEther(balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
      return '0';
    }
  }, [address, publicClient, tokenAddress]);

  // Auto-fetch metrics with rate limit protection
  useEffect(() => {
    fetchMetrics();
    // Only refresh every 60 seconds to avoid rate limits
    const interval = setInterval(fetchMetrics, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return {
    buyTokens,
    sellTokens,
    getBalance,
    fetchMetrics,
    metrics,
    isLoading,
  };
}