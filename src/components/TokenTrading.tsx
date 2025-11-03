'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useBondingCurve } from '@/hooks/useBondingCurve';
import { Button } from '@/components/alien/Button';
import { Card } from '@/components/alien/Card';
import { Input } from '@/components/alien/Input';
import { showToast } from '@/components/ToastProvider';
import { 
  FiArrowUp, 
  FiArrowDown, 
  FiTrendingUp,
  FiAlertCircle,
  FiSettings
} from 'react-icons/fi';

interface TokenTradingProps {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  metrics?: any;
  buyTokens?: (amount: string, slippage: number) => Promise<any>;
  sellTokens?: (amount: string, slippage: number) => Promise<any>;
  isLoading?: boolean;
  getBalance?: () => Promise<string>;
}

export function TokenTrading({ 
  tokenAddress, 
  tokenSymbol, 
  tokenName,
  metrics: propMetrics,
  buyTokens: propBuyTokens,
  sellTokens: propSellTokens,
  isLoading: propIsLoading,
  getBalance: propGetBalance
}: TokenTradingProps) {
  const { address, isConnected } = useAccount();
  
  // Use props if provided, otherwise fall back to own hook
  const bondingCurveHook = useBondingCurve(tokenAddress);
  const buyTokens = propBuyTokens || bondingCurveHook.buyTokens;
  const sellTokens = propSellTokens || bondingCurveHook.sellTokens;
  const getBalance = propGetBalance || bondingCurveHook.getBalance;
  const metrics = propMetrics || bondingCurveHook.metrics;
  const isLoading = propIsLoading !== undefined ? propIsLoading : bondingCurveHook.isLoading;
  
  // Log connection state on every render
  useEffect(() => {
    console.log('[TokenTrading] Connection state changed:', {
      isConnected,
      address,
      tokenAddress,
      hasBuyFunction: !!buyTokens,
      hasSellFunction: !!sellTokens,
      metrics
    });
  }, [isConnected, address, tokenAddress, buyTokens, sellTokens, metrics]);
  
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(1); // 1% default
  const [customSlippage, setCustomSlippage] = useState('');
  const [showCustomSlippage, setShowCustomSlippage] = useState(false);
  const [estimatedOutput, setEstimatedOutput] = useState('0');
  const [userBalance, setUserBalance] = useState('0');

  // Fetch user balance
  useEffect(() => {
    if (isConnected) {
      getBalance().then(setUserBalance);
    }
  }, [isConnected, getBalance]);

  // Calculate estimated output
  useEffect(() => {
    if (!amount || !metrics) {
      setEstimatedOutput('0');
      return;
    }

    try {
      const inputAmount = parseFloat(amount);
      if (inputAmount <= 0) {
        setEstimatedOutput('0');
        return;
      }

      if (mode === 'buy') {
        // Estimate tokens received for ETH
        // Price from metrics is in USD, but we need ETH price per token
        // If price is something like "0.0000001" it's ETH, if it's like "1000" it's USD
        let ethPricePerToken = parseFloat(metrics.price || '0.000001');
        
        // If price seems to be in USD (> 1), convert to ETH assuming ETH = $3000
        if (ethPricePerToken > 1) {
          ethPricePerToken = ethPricePerToken / 3000;
        }
        
        const tokensOut = ethPricePerToken > 0 ? inputAmount / ethPricePerToken : 0;
        setEstimatedOutput(tokensOut > 0 ? tokensOut.toFixed(2) : '0');
      } else {
        // Estimate ETH received for tokens
        let ethPricePerToken = parseFloat(metrics.price || '0.000001');
        
        // If price seems to be in USD (> 1), convert to ETH
        if (ethPricePerToken > 1) {
          ethPricePerToken = ethPricePerToken / 3000;
        }
        
        const ethOut = inputAmount * ethPricePerToken;
        setEstimatedOutput(ethOut > 0 ? ethOut.toFixed(6) : '0');
      }
    } catch (error) {
      console.error('Error calculating output:', error);
      setEstimatedOutput('0');
    }
  }, [amount, mode, metrics]);

  const handleTrade = async () => {
    console.log('[TokenTrading] handleTrade called', { mode, amount, slippage });
    
    if (!amount || parseFloat(amount) <= 0) {
      console.log('[TokenTrading] Invalid amount:', amount);
      showToast.error('Please enter a valid amount');
      return;
    }

    if (!buyTokens) {
      console.error('[TokenTrading] buyTokens function is undefined!');
      showToast.error('Trading functions not loaded. Please refresh the page.');
      return;
    }

    console.log('[TokenTrading] Starting trade:', { mode, amount, slippage });
    
    try {
      if (mode === 'buy') {
        console.log('[TokenTrading] Calling buyTokens with:', amount, slippage / 100);
        const result = await buyTokens(amount, slippage / 100);
        console.log('[TokenTrading] Buy result:', result);
      } else {
        if (parseFloat(amount) > parseFloat(userBalance)) {
          console.log('[TokenTrading] Insufficient balance:', { amount, userBalance });
          showToast.error('Insufficient token balance');
          return;
        }
        console.log('[TokenTrading] Calling sellTokens with:', amount, slippage / 100);
        const result = await sellTokens(amount, slippage / 100);
        console.log('[TokenTrading] Sell result:', result);
      }
    } catch (error) {
      console.error('[TokenTrading] Trade error:', error);
      showToast.error('Transaction failed');
    }

    // Reset form
    setAmount('');
    setEstimatedOutput('0');
    
    // Refresh balance
    const newBalance = await getBalance();
    setUserBalance(newBalance);
  };

  const handleSlippageChange = (value: number) => {
    setSlippage(value);
    setShowCustomSlippage(false);
    setCustomSlippage('');
  };

  const handleCustomSlippageSubmit = () => {
    const custom = parseFloat(customSlippage);
    if (!isNaN(custom) && custom > 0 && custom <= 50) {
      setSlippage(custom);
      setShowCustomSlippage(false);
    } else {
      showToast.error('Invalid slippage (must be between 0-50%)');
    }
  };

  // Show connect wallet if not connected
  if (!isConnected) {
    return (
      <div className="space-y-4">
        <Card className="p-6 bg-surface1 border border-border">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Connect Your Wallet</h3>
            <p className="text-sm text-text-muted">Connect your wallet to start trading {tokenSymbol}</p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bonding Progress Bar Only */}
      <Card className="p-4 bg-surface1 border border-border">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-text-muted uppercase tracking-wider">Bonding Curve Progress</span>
            <span className="text-sm font-medium text-text-primary">{metrics?.bondingProgress || 0}%</span>
          </div>
          <div className="relative">
            <div className="w-full bg-surface2 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-primary to-success rounded-full relative"
                initial={{ width: 0 }}
                animate={{ width: `${metrics?.bondingProgress || 0}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </motion.div>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full animate-pulse" 
                 style={{ left: `${Math.min(metrics?.bondingProgress || 0, 96)}%` }} />
          </div>
          <p className="text-xs text-text-muted">
            Graduates to Uniswap V3 at $69k market cap
          </p>
        </div>
      </Card>

      {/* Trading Interface */}
      <Card className="p-5 bg-surface1 border border-border">
        {/* Buy/Sell Toggle */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setMode('buy')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              mode === 'buy' 
                ? 'bg-success text-black' 
                : 'bg-surface2 text-text-secondary hover:bg-surface3'
            }`}
          >
            <FiArrowUp size={16} />
            Buy
          </button>
          <button
            onClick={() => setMode('sell')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              mode === 'sell' 
                ? 'bg-danger text-white' 
                : 'bg-surface2 text-text-secondary hover:bg-surface3'
            }`}
          >
            <FiArrowDown size={16} />
            Sell
          </button>
        </div>

        {/* Amount Input */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs text-text-muted uppercase tracking-wider">
                {mode === 'buy' ? 'ETH Amount' : `${tokenSymbol} Amount`}
              </label>
              {mode === 'sell' && (
                <button
                  onClick={() => setAmount(userBalance)}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Max: {parseFloat(userBalance).toFixed(4)}
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-xl font-normal bg-surface2 border-0 placeholder-text-muted"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">
                {mode === 'buy' ? 'ETH' : tokenSymbol}
              </span>
            </div>
          </div>

          {/* Estimated Output */}
          <div className="bg-surface2 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted uppercase tracking-wider">You Receive</span>
              <span className="text-lg text-text-primary" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                ~{estimatedOutput} {mode === 'buy' ? tokenSymbol : 'ETH'}
              </span>
            </div>
          </div>

          {/* Slippage Settings */}
          <div className="bg-surface2 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-text-muted uppercase tracking-wider">Slippage Tolerance</span>
              <button
                onClick={() => setShowCustomSlippage(!showCustomSlippage)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <FiSettings size={14} />
              </button>
            </div>
            
            {!showCustomSlippage ? (
              <div className="flex gap-1.5">
                {[0.5, 1, 2, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => handleSlippageChange(value)}
                    className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                      slippage === value
                        ? 'bg-primary text-white'
                        : 'bg-surface3 text-text-secondary hover:bg-surface3/80'
                    }`}
                  >
                    {value}%
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Custom %"
                  value={customSlippage}
                  onChange={(e) => setCustomSlippage(e.target.value)}
                  className="text-sm bg-surface3 border-0 flex-1"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                />
                <button
                  onClick={handleCustomSlippageSubmit}
                  className="px-3 py-1.5 bg-primary text-white rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  Set
                </button>
              </div>
            )}
            
            {slippage > 5 && (
              <div className="mt-2 flex items-start gap-1.5">
                <FiAlertCircle className="text-warning flex-shrink-0 mt-0.5" size={12} />
                <p className="text-xs text-warning">High slippage may result in unfavorable trades</p>
              </div>
            )}
          </div>

          {/* Warnings */}
          {mode === 'buy' && metrics?.bondingProgress && metrics.bondingProgress > 90 && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
              <div className="flex gap-2">
                <FiAlertCircle className="text-warning flex-shrink-0" size={16} />
                <p className="text-xs text-warning">
                  Token is close to graduation. Price may increase rapidly.
                </p>
              </div>
            </div>
          )}

          {/* Trade Button */}
          {(() => {
            const isDisabled = isLoading || !amount || parseFloat(amount) <= 0;
            console.log('[TokenTrading] Button state:', { 
              isDisabled,
              isLoading,
              amount,
              parsedAmount: amount ? parseFloat(amount) : 0,
              mode
            });
            return (
              <Button
                variant={mode === 'buy' ? 'primary' : 'secondary'}
                onClick={() => {
                  console.log('BUTTON CLICKED!!! amount:', amount, 'mode:', mode);
                  handleTrade();
                }}
                disabled={isDisabled}
                loading={isLoading}
                className={`w-full h-12 font-medium ${mode === 'sell' ? '!bg-red-500 hover:!bg-red-600 !text-white !border-red-500' : ''}`}
              >
                {isLoading 
                  ? `${mode === 'buy' ? 'Buying' : 'Selling'}...`
                  : isDisabled
                    ? 'Enter amount'
                    : `${mode === 'buy' ? 'Buy' : 'Sell'} ${tokenSymbol}`
                }
              </Button>
            );
          })()}

          {/* Fee Info */}
          <div className="space-y-1.5 pt-2 border-t border-border">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Platform Fee</span>
              <span className="text-text-secondary">1%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Creator Fee</span>
              <span className="text-text-secondary">1%</span>
            </div>
            {isConnected && (
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Your {tokenSymbol} Balance</span>
                <span className="text-text-secondary font-medium">
                  {parseFloat(userBalance).toFixed(4)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}