'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/alien/Card';
import { usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  SingleValueData,
  Time,
  ColorType,
  LineStyle,
  PriceScaleMode,
  CrosshairMode,
} from 'lightweight-charts';

interface TradingViewChartProps {
  tokenAddress: string;
  tokenSymbol: string;
  currentPrice?: number;
  marketCap?: number;
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

export function TradingViewChart({ tokenAddress, tokenSymbol, currentPrice = 0.000001, marketCap = 4512 }: TradingViewChartProps) {
  const publicClient = usePublicClient();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const baselineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const dataRef = useRef<SingleValueData[]>([]);
  const intervalRef = useRef<NodeJS.Timeout>();
  
  const [currentMarketCap, setCurrentMarketCap] = useState(marketCap);
  const [percentChange, setPercentChange] = useState(0);
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h'>('5m');
  const [high24h, setHigh24h] = useState(marketCap);
  const [low24h, setLow24h] = useState(marketCap);
  const [isLoading, setIsLoading] = useState(true);
  
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
  
  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    // Create chart with dark theme
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9CA3AF',
        fontSize: 12,
      },
      grid: {
        vertLines: {
          color: 'rgba(42, 46, 57, 0.5)',
          style: LineStyle.Dotted,
        },
        horzLines: {
          color: 'rgba(42, 46, 57, 0.5)',
          style: LineStyle.Dotted,
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#0EA5E9',
          width: 1,
          style: LineStyle.Solid,
          labelBackgroundColor: '#0EA5E9',
        },
        horzLine: {
          color: '#0EA5E9',
          width: 1,
          style: LineStyle.Solid,
          labelBackgroundColor: '#0EA5E9',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(42, 46, 57, 0.5)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
        mode: PriceScaleMode.Normal,
      },
      timeScale: {
        borderColor: 'rgba(42, 46, 57, 0.5)',
        timeVisible: true,
        secondsVisible: true,
        tickMarkFormatter: (time: any) => {
          const date = new Date(time * 1000);
          return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
        },
      },
      localization: {
        priceFormatter: (price: number) => {
          if (price >= 1000000) {
            return `$${(price / 1000000).toFixed(2)}M`;
          } else if (price >= 1000) {
            return `$${(price / 1000).toFixed(1)}k`;
          }
          return `$${price.toFixed(0)}`;
        },
      },
    });
    
    // Create line series for market cap
    const lineSeries = (chart as any).addLineSeries({
      color: '#0EA5E9',
      lineWidth: 3,
      lineStyle: LineStyle.Solid,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 6,
      crosshairMarkerBorderColor: '#ffffff',
      crosshairMarkerBackgroundColor: '#0EA5E9',
      priceLineVisible: true,
      lastValueVisible: true,
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => {
          if (price >= 1000000) {
            return `$${(price / 1000000).toFixed(2)}M`;
          } else if (price >= 1000) {
            return `$${(price / 1000).toFixed(1)}k`;
          }
          return `$${price.toFixed(0)}`;
        },
      },
    });
    
    // Create volume series
    const volumeSeries = (chart as any).addHistogramSeries({
      color: 'rgba(14, 165, 233, 0.3)',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    
    chartRef.current = chart;
    baselineSeriesRef.current = lineSeries;
    volumeSeriesRef.current = volumeSeries;
    
    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, []);
  
  // Initialize data and start updates
  useEffect(() => {
    if (!baselineSeriesRef.current || !volumeSeriesRef.current) return;
    
    const initializeData = async () => {
      setIsLoading(true);
      
      // Get initial market cap
      const initialMC = await fetchMarketCap();
      setCurrentMarketCap(initialMC);
      setHigh24h(initialMC);
      setLow24h(initialMC);
      
      // Initial market cap stored for reference
      // (Area series doesn't have baseValue like baseline series)
      
      // Generate initial historical data
      const now = Math.floor(Date.now() / 1000);
      const dataPoints: SingleValueData[] = [];
      const volumeData: any[] = [];
      
      // Determine number of points based on timeframe
      let numPoints: number;
      let interval: number; // in seconds
      
      switch (timeframe) {
        case '1m':
          numPoints = 60;
          interval = 1;
          break;
        case '5m':
          numPoints = 60;
          interval = 5;
          break;
        case '15m':
          numPoints = 90;
          interval = 10;
          break;
        case '1h':
          numPoints = 120;
          interval = 30;
          break;
        default:
          numPoints = 60;
          interval = 5;
      }
      
      // Create historical data points
      for (let i = numPoints - 1; i >= 0; i--) {
        const time = (now - (i * interval)) as Time;
        dataPoints.push({
          time,
          value: initialMC,
        });
        volumeData.push({
          time,
          value: 0,
          color: 'rgba(14, 165, 233, 0.3)',
        });
      }
      
      dataRef.current = dataPoints;
      baselineSeriesRef.current?.setData(dataPoints);
      volumeSeriesRef.current?.setData(volumeData);
      
      // Fit content
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
      
      setIsLoading(false);
    };
    
    initializeData();
  }, [timeframe, tokenAddress]);
  
  // Real-time updates every second
  useEffect(() => {
    if (!baselineSeriesRef.current || !volumeSeriesRef.current || isLoading) return;
    
    const updateChart = async () => {
      const newMC = await fetchMarketCap();
      const now = Math.floor(Date.now() / 1000);
      
      // Update current market cap
      setCurrentMarketCap(newMC);
      
      // Update high/low
      setHigh24h(prev => Math.max(prev, newMC));
      setLow24h(prev => Math.min(prev, newMC));
      
      // Calculate percent change
      if (dataRef.current.length > 0) {
        const firstValue = dataRef.current[0].value;
        const change = ((newMC - firstValue) / firstValue) * 100;
        setPercentChange(change);
      }
      
      // Add new data point
      const newPoint: SingleValueData = {
        time: now as Time,
        value: newMC,
      };
      
      // Update or add the data point
      if (dataRef.current.length > 0 && dataRef.current[dataRef.current.length - 1].time === now) {
        // Update existing point for the same second
        dataRef.current[dataRef.current.length - 1] = newPoint;
        baselineSeriesRef.current?.update(newPoint);
      } else {
        // Add new point
        dataRef.current.push(newPoint);
        baselineSeriesRef.current?.update(newPoint);
        
        // Add volume data (simulate some volume on price changes)
        const lastValue = dataRef.current.length > 1 ? dataRef.current[dataRef.current.length - 2].value : newMC;
        const volumeValue = Math.abs(newMC - lastValue) * 100; // Simulate volume based on price change
        
        volumeSeriesRef.current?.update({
          time: now as Time,
          value: volumeValue,
          color: newMC > lastValue ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
        });
      }
      
      // Remove old data points based on timeframe
      let maxAge: number; // in seconds
      switch (timeframe) {
        case '1m':
          maxAge = 60;
          break;
        case '5m':
          maxAge = 300;
          break;
        case '15m':
          maxAge = 900;
          break;
        case '1h':
          maxAge = 3600;
          break;
        default:
          maxAge = 300;
      }
      
      const cutoffTime = now - maxAge;
      dataRef.current = dataRef.current.filter(d => (d.time as number) > cutoffTime);
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
  }, [isLoading, timeframe, tokenAddress, publicClient]);
  
  return (
    <Card className="p-6 bg-surface1 border border-border">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-text-primary">
              {tokenSymbol}/USD
            </h3>
            <span className="text-xs text-text-muted bg-surface2 px-2 py-1 rounded">
              Market Cap
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div>
              <span className="text-2xl font-bold text-text-primary">
                ${currentMarketCap.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
              <span className={`ml-2 text-sm font-medium ${percentChange >= 0 ? 'text-success' : 'text-danger'}`}>
                {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%
              </span>
            </div>
            
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-text-muted">24h High:</span>
                <span className="text-text-secondary ml-1">${high24h.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
              <div>
                <span className="text-text-muted">24h Low:</span>
                <span className="text-text-secondary ml-1">${low24h.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Timeframe selector */}
        <div className="flex gap-1">
          {(['1m', '5m', '15m', '1h'] as const).map((tf) => (
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
      
      {/* Chart container */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface1 z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-text-muted text-sm">Loading chart...</span>
            </div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full" />
      </div>
      
      {/* Footer info */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
        <div className="text-xs text-text-muted">
          Real-time data • Updates every second
        </div>
        <div className="text-xs text-text-muted">
          Powered by TradingView Lightweight Charts
        </div>
      </div>
    </Card>
  );
}