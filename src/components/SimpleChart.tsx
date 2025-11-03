'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/alien/Card';
import { usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface SimpleChartProps {
  tokenAddress: string;
  tokenSymbol: string;
  currentPrice?: number;
  marketCap?: number;
}

interface ChartDataPoint {
  time: string;
  marketCap: number;
  timestamp: number;
}

// V2 Factory ABI for fetching real-time data
const FACTORY_ABI = [
  {
    inputs: [{name: "_token", type: "address"}],
    name: "calculateMarketCap",
    outputs: [{name: "", type: "uint256"}],
    stateMutability: "view",
    type: "function"
  }
] as const;

const FACTORY_ADDRESS = '0x46eCf02772C4Bc9a5cd440FB93022d6e268355c8';
const ETH_PRICE_USD = 3614;

export function SimpleChart({ tokenAddress, tokenSymbol, currentPrice = 0.000001, marketCap = 4512 }: SimpleChartProps) {
  const publicClient = usePublicClient();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m'>('5m');
  const [currentMarketCap, setCurrentMarketCap] = useState(marketCap);
  const intervalRef = useRef<NodeJS.Timeout>();
  const chartDataRef = useRef<ChartDataPoint[]>([]);
  
  // Function to fetch current market cap from blockchain
  const fetchMarketCap = async () => {
    if (!publicClient || !tokenAddress) return marketCap;
    
    try {
      const mcValue = await publicClient.readContract({
        address: FACTORY_ADDRESS as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'calculateMarketCap',
        args: [tokenAddress as `0x${string}`],
      });
      
      const marketCapInETH = parseFloat(formatEther(mcValue));
      const marketCapInUSD = marketCapInETH * ETH_PRICE_USD;
      return marketCapInUSD;
    } catch (error) {
      console.error('Error fetching market cap:', error);
      return marketCap;
    }
  };
  
  // Initialize chart with historical data points
  useEffect(() => {
    const initializeChart = async () => {
      setLoading(true);
      
      // Clear existing data when timeframe changes
      chartDataRef.current = [];
      
      const initialMC = await fetchMarketCap();
      setCurrentMarketCap(initialMC);
      
      // Generate initial data points based on timeframe
      const now = Date.now();
      const points = timeframe === '1m' ? 60 : timeframe === '5m' ? 60 : 90; // 1min = 60 seconds, 5min = 60 points (5 sec each), 15min = 90 points (10 sec each)
      const interval = timeframe === '1m' ? 1000 : timeframe === '5m' ? 5000 : 10000;
      
      const initialData: ChartDataPoint[] = [];
      
      // Start with a flat line at current market cap for history
      for (let i = points - 1; i >= 0; i--) {
        const timestamp = now - (i * interval);
        initialData.push({
          time: new Date(timestamp).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: false 
          }),
          marketCap: initialMC,
          timestamp
        });
      }
      
      chartDataRef.current = initialData;
      setChartData(initialData);
      setLoading(false);
    };
    
    initializeChart();
  }, [tokenAddress, timeframe]);
  
  // Update chart every second
  useEffect(() => {
    if (loading) return;
    
    const updateChart = async () => {
      const newMC = await fetchMarketCap();
      setCurrentMarketCap(newMC);
      
      const now = Date.now();
      const newPoint: ChartDataPoint = {
        time: new Date(now).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit',
          hour12: false 
        }),
        marketCap: newMC,
        timestamp: now
      };
      
      // Keep only recent data based on timeframe
      const maxAge = timeframe === '1m' ? 60000 : timeframe === '5m' ? 300000 : 900000;
      const cutoffTime = now - maxAge;
      
      // Filter old data and add new point
      const updatedData = [...chartDataRef.current.filter(d => d.timestamp > cutoffTime), newPoint];
      
      chartDataRef.current = updatedData;
      setChartData(updatedData);
    };
    
    // Initial update
    updateChart();
    
    // Set up interval for updates every second
    intervalRef.current = setInterval(updateChart, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loading, tokenAddress, timeframe, publicClient]);
  
  const marketCapChange = chartData.length > 1 
    ? ((chartData[chartData.length - 1].marketCap - chartData[0].marketCap) / chartData[0].marketCap * 100)
    : 0;
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-surface2 border border-border rounded-lg p-3">
          <p className="text-xs text-text-muted">{label}</p>
          <p className="text-sm font-medium text-text-primary">
            ${payload[0].value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
        </div>
      );
    }
    return null;
  };
  
  // Find min and max for better scaling
  const minValue = Math.min(...chartData.map(d => d.marketCap));
  const maxValue = Math.max(...chartData.map(d => d.marketCap));
  const padding = (maxValue - minValue) * 0.1 || 100; // 10% padding or $100 if flat
  
  return (
    <Card className="p-6 bg-surface1 border border-border">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Live Market Cap
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold text-text-primary">
              ${currentMarketCap.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
            <span className={`text-sm font-medium ${marketCapChange >= 0 ? 'text-success' : 'text-danger'}`}>
              {marketCapChange >= 0 ? '+' : ''}{marketCapChange.toFixed(2)}%
            </span>
            <span className="text-xs text-text-muted ml-2">
              Updates every second
            </span>
          </div>
        </div>
        
        <div className="flex gap-1">
          {(['1m', '5m', '15m'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                timeframe === tf
                  ? 'bg-primary text-white'
                  : 'bg-surface2 text-text-secondary hover:bg-surface3'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      
      {loading ? (
        <div className="h-[300px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-text-muted text-sm">Loading chart...</span>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="time" 
              stroke="rgba(255,255,255,0.5)"
              fontSize={12}
              interval="preserveEnd"
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.5)"
              fontSize={12}
              tickFormatter={(value) => value >= 1000 ? `$${(value/1000).toFixed(1)}k` : `$${value.toFixed(0)}`}
              domain={[minValue - padding, maxValue + padding]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="marketCap"
              stroke="#0EA5E9"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPrice)"
              animationDuration={0}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}