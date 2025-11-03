'use client';

import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { formatEther } from 'viem';

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
  },
  {
    inputs: [{name: "_token", type: "address"}],
    name: "tokenInfo",
    outputs: [
      {name: "creator", type: "address"},
      {name: "reserve0", type: "uint256"},
      {name: "reserve1", type: "uint256"},
      {name: "totalSupply", type: "uint256"}
    ],
    stateMutability: "view",
    type: "function"
  }
] as const;

const ERC20_ABI = [
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{name: "", type: "uint256"}],
    stateMutability: "view",
    type: "function"
  }
] as const;

interface BlockchainData {
  price: string;
  marketCap: string;
  bondingProgress: number;
  reserves: {
    eth: string;
    token: string;
  };
}

export function useBlockchainData(tokenAddress: string | undefined) {
  const publicClient = usePublicClient();
  const [data, setData] = useState<BlockchainData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tokenAddress || !publicClient) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data in parallel
        const [price, marketCap, bondingProgress, tokenInfo] = await Promise.all([
          publicClient.readContract({
            address: FACTORY_ADDRESS as `0x${string}`,
            abi: FACTORY_ABI,
            functionName: 'getTokenPrice',
            args: [tokenAddress as `0x${string}`],
          }).catch(() => BigInt(0)),
          
          publicClient.readContract({
            address: FACTORY_ADDRESS as `0x${string}`,
            abi: FACTORY_ABI,
            functionName: 'calculateMarketCap',
            args: [tokenAddress as `0x${string}`],
          }).catch(() => BigInt(0)),
          
          publicClient.readContract({
            address: FACTORY_ADDRESS as `0x${string}`,
            abi: FACTORY_ABI,
            functionName: 'bondingProgress',
            args: [tokenAddress as `0x${string}`],
          }).catch(() => BigInt(0)),
          
          publicClient.readContract({
            address: FACTORY_ADDRESS as `0x${string}`,
            abi: FACTORY_ABI,
            functionName: 'tokenInfo',
            args: [tokenAddress as `0x${string}`],
          }).catch(() => null),
        ]);

        setData({
          price: formatEther(price),
          marketCap: formatEther(marketCap),
          bondingProgress: Number(bondingProgress),
          reserves: {
            eth: tokenInfo ? formatEther(tokenInfo[1]) : '0',
            token: tokenInfo ? formatEther(tokenInfo[2]) : '0',
          }
        });
      } catch (error) {
        console.error('Error fetching blockchain data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [tokenAddress, publicClient]);

  return { data, loading };
}