'use client';

import React, { useEffect, useRef, memo, useState } from 'react';
import { Card } from '@/components/alien/Card';
import { usePublicClient } from 'wagmi';
import { formatEther } from 'viem';

interface TradingViewWidgetProps {
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

function TradingViewWidget({ tokenAddress, tokenSymbol, currentPrice = 0.000001, marketCap = 4512 }: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const publicClient = usePublicClient();
  const [currentMarketCap, setCurrentMarketCap] = useState(marketCap);
  const [percentChange, setPercentChange] = useState(0);
  const [timeframe, setTimeframe] = useState<'1' | '5' | '15' | '60'>('5');
  const [high24h, setHigh24h] = useState(marketCap);
  const [low24h, setLow24h] = useState(marketCap);
  const intervalRef = useRef<NodeJS.Timeout>();
  const initialMarketCap = useRef(marketCap);
  
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

  // Initialize and update market cap
  useEffect(() => {
    const initializeData = async () => {
      const initialMC = await fetchMarketCap();
      setCurrentMarketCap(initialMC);
      setHigh24h(initialMC);
      setLow24h(initialMC);
      initialMarketCap.current = initialMC;
    };
    
    initializeData();
  }, [tokenAddress]);

  // Real-time updates every second
  useEffect(() => {
    const updateMarketCap = async () => {
      const newMC = await fetchMarketCap();
      setCurrentMarketCap(newMC);
      
      // Update high/low
      setHigh24h(prev => Math.max(prev, newMC));
      setLow24h(prev => Math.min(prev, newMC));
      
      // Calculate percent change from initial
      const change = ((newMC - initialMarketCap.current) / initialMarketCap.current) * 100;
      setPercentChange(change);
    };
    
    // Update every second
    intervalRef.current = setInterval(updateMarketCap, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [tokenAddress, publicClient]);

  useEffect(() => {
    if (container.current) {
      container.current.innerHTML = '';
      
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        "autosize": true,
        "symbol": `CRYPTO:${tokenSymbol}USD`,
        "interval": timeframe,
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "allow_symbol_change": false,
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": false,
        "calendar": false,
        "hide_volume": false,
        "support_host": "https://www.tradingview.com",
        "backgroundColor": "rgba(0, 0, 0, 0)",
        "gridColor": "rgba(42, 46, 57, 0.5)",
        "toolbarBackground": "#000000",
        "studies": [],
        "container_id": "tradingview_chart",
        "show_popup_button": false,
        "popup_width": "1000",
        "popup_height": "650"
      });

      const widgetContainer = document.createElement("div");
      widgetContainer.className = "tradingview-widget-container";
      widgetContainer.style.height = "100%";
      widgetContainer.style.width = "100%";
      
      const widgetDiv = document.createElement("div");
      widgetDiv.id = "tradingview_chart";
      widgetDiv.style.height = "400px";
      widgetDiv.style.width = "100%";
      
      widgetContainer.appendChild(widgetDiv);
      widgetContainer.appendChild(script);
      
      if (container.current) {
        container.current.appendChild(widgetContainer);
      }
    }
    
    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, [tokenSymbol, timeframe]);

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
              Market Cap Chart
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
          {([
            { label: '1m', value: '1' },
            { label: '5m', value: '5' },
            { label: '15m', value: '15' },
            { label: '1h', value: '60' }
          ] as const).map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                timeframe === tf.value
                  ? 'bg-primary text-white'
                  : 'bg-surface2 text-text-secondary hover:bg-surface3'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* TradingView Widget Container */}
      <div ref={container} className="relative w-full" />
      
      {/* Footer info */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
        <div className="text-xs text-text-muted">
          Real-time market cap • Updates every second
        </div>
        <div className="text-xs text-text-muted">
          Powered by TradingView
        </div>
      </div>
    </Card>
  );
}

export default memo(TradingViewWidget);