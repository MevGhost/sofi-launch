'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseEther, formatEther } from 'viem';
import { showToast } from '@/components/ToastProvider';
import { apiRequest, API_ENDPOINTS } from '@/lib/api/config';
import { useAuth } from '@/hooks/useAuth';
import { LayoutShell, SectionHeader } from '@/components/alien/Layout';
import { Button } from '@/components/alien/Button';
import { Card, MetricCard } from '@/components/alien/Card';
import { Input } from '@/components/alien/Input';
import { TradingViewLightweight } from '@/components/TradingViewLightweight';
import { 
  FiArrowLeft, 
  FiActivity, 
  FiRefreshCw, 
  FiTwitter, 
  FiGlobe, 
  FiMessageCircle,
  FiDollarSign,
  FiTarget,
  FiTrendingUp,
  FiUsers
} from 'react-icons/fi';
import { DEV_BONDING_CURVE_V2_ABI } from '@/contracts/DevBondingCurveV2ABI';

// Use the complete ABI with error definitions
const BONDING_CURVE_ABI = DEV_BONDING_CURVE_V2_ABI;

// Keep the simple ABI definition for backward compatibility (remove later)
const OLD_BONDING_CURVE_ABI = [
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

// Use V2 factory for all operations (has important fixes)
const FACTORY_ADDRESS = '0x46eCf02772C4Bc9a5cd440FB93022d6e268355c8'; // DevBondingCurveV2

export default function SimpleTokenPage() {
  const params = useParams();
  const router = useRouter();
  const tokenAddress = params.address as string;
  
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { isAuthenticated, login } = useAuth();
  
  const [tokenData, setTokenData] = useState<any>(null);
  const [blockchainData, setBlockchainData] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [refreshing, setRefreshing] = useState(false);
  
  // Fetch token data from backend
  useEffect(() => {
    fetch(`http://localhost:5001/api/tokens/${tokenAddress}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTokenData(data.data);
        }
      })
      .catch(err => console.error('Error fetching token:', err));
  }, [tokenAddress]);
  
  // Fetch real-time blockchain data
  const fetchBlockchainData = useCallback(async () => {
    if (!publicClient || !tokenAddress) return;
    
    setRefreshing(true);
    try {
      // Add ABI for factory contract methods
      const factoryABI = [
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
            {name: "tokenAddress", type: "address"},
            {name: "creator", type: "address"},
            {name: "realEthReserve", type: "uint256"},
            {name: "realTokenReserve", type: "uint256"},
            {name: "k", type: "uint256"},
            {name: "dexReserve", type: "uint256"},
            {name: "creatorFees", type: "uint256"},
            {name: "platformFees", type: "uint256"},
            {name: "graduated", type: "bool"},
            {name: "createdAt", type: "uint256"},
            {name: "totalVolume", type: "uint256"},
            {name: "tradeCount", type: "uint256"}
          ],
          stateMutability: "view",
          type: "function"
        }
      ] as const;
      
      const [price, marketCap, bondingProgress, tokenInfo, tokenBalance] = await Promise.all([
        publicClient.readContract({
          address: FACTORY_ADDRESS as `0x${string}`,
          abi: factoryABI,
          functionName: 'getTokenPrice',
          args: [tokenAddress as `0x${string}`],
        }).catch(() => BigInt(0)),
        
        publicClient.readContract({
          address: FACTORY_ADDRESS as `0x${string}`,
          abi: factoryABI,
          functionName: 'calculateMarketCap',
          args: [tokenAddress as `0x${string}`],
        }).catch(() => BigInt(0)),
        
        publicClient.readContract({
          address: FACTORY_ADDRESS as `0x${string}`,
          abi: factoryABI,
          functionName: 'bondingProgress',
          args: [tokenAddress as `0x${string}`],
        }).catch(() => BigInt(0)),
        
        publicClient.readContract({
          address: FACTORY_ADDRESS as `0x${string}`,
          abi: factoryABI,
          functionName: 'tokenInfo',
          args: [tokenAddress as `0x${string}`],
        }).catch(() => null),
        
        // Get user's token balance if connected
        isConnected && address ? publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        }).catch(() => BigInt(0)) : BigInt(0)
      ]);
      
      // Convert market cap and price to USD
      // Use real ETH price (current market price is around $3614)
      const ETH_PRICE_USD = 3614;
      const priceInETH = parseFloat(formatEther(price));
      const priceInUSD = priceInETH * ETH_PRICE_USD;
      const marketCapInETH = parseFloat(formatEther(marketCap));
      const marketCapInUSD = marketCapInETH * ETH_PRICE_USD;
      
      setBlockchainData({
        price: formatEther(price),
        priceUSD: priceInUSD.toFixed(8),
        marketCap: marketCapInUSD.toString(), // Store in USD
        bondingProgress: Number(bondingProgress),
        ethReserve: tokenInfo ? formatEther(tokenInfo[2]) : '0', // realEthReserve at index 2
        tokenReserve: tokenInfo ? formatEther(tokenInfo[3]) : '0', // realTokenReserve at index 3
        userBalance: formatEther(tokenBalance)
      });
      
      console.log('Fetched blockchain data:', {
        price: formatEther(price),
        marketCap: formatEther(marketCap),
        bondingProgress: Number(bondingProgress),
        userBalance: formatEther(tokenBalance)
      });
    } catch (error) {
      console.error('Error fetching blockchain data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [publicClient, tokenAddress, isConnected, address]);
  
  // Fetch blockchain data on mount and refresh periodically
  useEffect(() => {
    if (publicClient) {
      fetchBlockchainData();
      const interval = setInterval(fetchBlockchainData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [tokenAddress, publicClient, address, isConnected]);
  
  // Calculate maximum buyable amount (based on user's ETH balance)
  const calculateMaxBuy = async () => {
    if (!address || !publicClient) return;
    
    try {
      const balance = await publicClient.getBalance({ address });
      // Leave 0.01 ETH for gas
      const gasBuffer = parseEther('0.01');
      const maxEth = balance > gasBuffer ? balance - gasBuffer : BigInt(0);
      
      if (maxEth > 0) {
        setAmount(formatEther(maxEth));
      } else {
        showToast.error('Insufficient ETH balance');
      }
    } catch (error) {
      console.error('Error calculating max buy:', error);
    }
  };
  
  // Calculate maximum sellable amount (based on liquidity and user balance)
  const calculateMaxSell = async () => {
    if (!address || !publicClient) return;
    
    try {
      // Get user's token balance
      const userBalance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      });
      
      // Define the correct ABI for tokenInfo
      const tokenInfoABI = [{
        inputs: [{name: "", type: "address"}],
        name: "tokenInfo",
        outputs: [
          {name: "tokenAddress", type: "address"},
          {name: "creator", type: "address"},
          {name: "realEthReserve", type: "uint256"},
          {name: "realTokenReserve", type: "uint256"},
          {name: "k", type: "uint256"},
          {name: "dexReserve", type: "uint256"},
          {name: "creatorFees", type: "uint256"},
          {name: "platformFees", type: "uint256"},
          {name: "graduated", type: "bool"},
          {name: "createdAt", type: "uint256"},
          {name: "totalVolume", type: "uint256"},
          {name: "tradeCount", type: "uint256"}
        ],
        stateMutability: "view",
        type: "function"
      }] as const;
      
      // Get pool's real ETH reserve with correct ABI
      const tokenInfo = await publicClient.readContract({
        address: FACTORY_ADDRESS as `0x${string}`,
        abi: tokenInfoABI,
        functionName: 'tokenInfo',
        args: [tokenAddress as `0x${string}`],
      });
      
      const realEthReserve = tokenInfo[2];  // realEthReserve
      const realTokenReserve = tokenInfo[3]; // realTokenReserve
      const k = tokenInfo[4]; // k is at index 4, not 6
      
      // Check if pool has enough liquidity
      if (realEthReserve === BigInt(0) || realEthReserve < parseEther('0.0001')) {
        showToast.error('Pool has insufficient liquidity for selling');
        return;
      }
      
      // Calculate max sellable based on liquidity (more conservative - leave 50% in pool)
      // This prevents the InsufficientLiquidityMinted error
      const targetEthWithdraw = (realEthReserve * BigInt(50)) / BigInt(100); // Only take 50% of pool
      
      // Binary search to find the token amount that yields targetEthWithdraw
      let low = BigInt(0);
      let high = userBalance;
      let bestAmount = BigInt(0);
      
      // Do a simple approximation instead of complex calculation
      // Since we have virtual reserves, we need to be conservative
      try {
        // Try to calculate how much we can sell for half the pool's ETH
        const testAmount = userBalance / BigInt(10); // Start with 10% of balance
        
        // Test if this amount would work
        const testReturn = await publicClient.readContract({
          address: FACTORY_ADDRESS as `0x${string}`,
          abi: [{
            inputs: [{name: "_token", type: "address"}, {name: "_tokenAmount", type: "uint256"}],
            name: "calculateSellReturn",
            outputs: [{name: "", type: "uint256"}],
            stateMutability: "view",
            type: "function"
          }],
          functionName: 'calculateSellReturn',
          args: [tokenAddress as `0x${string}`, testAmount],
        });
        
        // Scale based on how much ETH we got vs target
        const scaleFactor = targetEthWithdraw * BigInt(100) / testReturn;
        bestAmount = (testAmount * scaleFactor) / BigInt(100);
        
        // Make sure we don't exceed user balance
        if (bestAmount > userBalance) {
          bestAmount = userBalance;
        }
        
        // Further reduce to be safe (80% of calculated)
        bestAmount = (bestAmount * BigInt(80)) / BigInt(100);
        
      } catch (error) {
        console.error('Error calculating safe sell amount:', error);
        // Fallback: use a very conservative amount
        bestAmount = userBalance / BigInt(100); // 1% of balance
      }
      
      const maxAmount = bestAmount;
      
      if (maxAmount > 0) {
        setAmount(formatEther(maxAmount));
      } else {
        showToast.error('Cannot sell - insufficient liquidity or balance');
      }
    } catch (error) {
      console.error('Error calculating max sell:', error);
      showToast.error('Error calculating maximum sell amount');
    }
  };
  
  // Simple buy function
  const handleBuy = async () => {
    console.log('=== BUY BUTTON CLICKED ===');
    console.log('Amount:', amount);
    console.log('Connected:', isConnected);
    console.log('Address:', address);
    console.log('WalletClient:', !!walletClient);
    console.log('PublicClient:', !!publicClient);
    
    if (!isConnected || !address) {
      showToast.error('Please connect your wallet');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      showToast.error('Please enter an amount');
      return;
    }
    
    if (!walletClient || !publicClient) {
      showToast.error('Wallet not ready');
      return;
    }
    // Ensure authentication for backend trade recording
    if (!isAuthenticated) {
      const ok = await login();
      if (!ok) {
        showToast.error('Authentication required');
        return;
      }
    }
    
    setIsLoading(true);
    
    try {
      const ethAmount = parseEther(amount);
      console.log('ETH Amount (wei):', ethAmount.toString());
      
      // Calculate expected tokens
      console.log('Calculating expected tokens...');
      const expectedTokens = await publicClient.readContract({
        address: FACTORY_ADDRESS as `0x${string}`,
        abi: BONDING_CURVE_ABI,
        functionName: 'calculateBuyReturn',
        args: [tokenAddress as `0x${string}`, ethAmount],
      });
      
      console.log('Expected tokens:', expectedTokens.toString());
      
      // Calculate min tokens with 1% slippage
      const minTokensOut = expectedTokens * BigInt(99) / BigInt(100);
      
      // Simulate the transaction
      console.log('Simulating transaction...');
      const { request } = await publicClient.simulateContract({
        account: address,
        address: FACTORY_ADDRESS as `0x${string}`,
        abi: BONDING_CURVE_ABI,
        functionName: 'buyTokens',
        args: [tokenAddress as `0x${string}`, minTokensOut],
        value: ethAmount,
      });
      
      console.log('Simulation successful, sending transaction...');
      showToast.loading('Please confirm in your wallet...');
      
      // Execute the transaction
      const hash = await walletClient.writeContract(request);
      console.log('Transaction sent:', hash);
      
      showToast.loading('Transaction pending...');
      
      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });
      
      console.log('Transaction confirmed:', receipt);
      
      if (receipt.status === 'success') {
        showToast.success('Buy successful!');
        setAmount('');
        // Record trade in backend
        try {
          console.log('Recording buy trade with data:', {
            tokenAddress,
            amount,
            transactionHash: hash,
            slippage: 0.01,
            tokensReceived: formatEther(expectedTokens),
          });
          
          const result = await apiRequest(API_ENDPOINTS.tokens.buy, {
            method: 'POST',
            body: JSON.stringify({
              tokenAddress,
              amount,
              transactionHash: hash,
              slippage: 0.01,
              tokensReceived: formatEther(expectedTokens),
            }),
          });
          
          console.log('Buy trade recorded successfully:', result);
        } catch (e) {
          console.error('Failed to record buy trade:', e);
          // Don't show error to user since the on-chain transaction succeeded
          // This is just for analytics
        }
      } else {
        showToast.error('Transaction failed');
      }
    } catch (error: any) {
      console.error('Buy error:', error);
      
      // Parse specific contract errors
      if (error.message?.includes('User rejected')) {
        showToast.error('Transaction cancelled');
      } else if (error.message?.includes('insufficient funds')) {
        showToast.error('Insufficient ETH balance');
      } else if (error.message?.includes('InsufficientLiquidityMinted') || error.message?.includes('0xfb8f41b2')) {
        showToast.error('Not enough liquidity available. Try a smaller amount.');
      } else if (error.message?.includes('SlippageExceeded')) {
        showToast.error('Price changed too much. Try again.');
      } else if (error.message?.includes('InvalidToken')) {
        showToast.error('This token is not valid for trading');
      } else {
        showToast.error(error.message || 'Transaction failed');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Simple sell function
  const handleSell = async () => {
    console.log('=== SELL BUTTON CLICKED ===');
    console.log('Amount:', amount);
    console.log('Connected:', isConnected);
    console.log('Address:', address);
    
    if (!isConnected || !address) {
      showToast.error('Please connect your wallet');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      showToast.error('Please enter an amount');
      return;
    }
    
    if (!walletClient || !publicClient) {
      showToast.error('Wallet not ready');
      return;
    }
    // Ensure authentication for backend trade recording
    if (!isAuthenticated) {
      const ok = await login();
      if (!ok) {
        showToast.error('Authentication required');
        return;
      }
    }
    
    setIsLoading(true);
    
    try {
      const tokenAmount = parseEther(amount);
      console.log('Token Amount (wei):', tokenAmount.toString());
      
      // Define the correct ABI for tokenInfo
      const tokenInfoABI = [{
        inputs: [{name: "", type: "address"}],
        name: "tokenInfo",
        outputs: [
          {name: "tokenAddress", type: "address"},
          {name: "creator", type: "address"},
          {name: "realEthReserve", type: "uint256"},
          {name: "realTokenReserve", type: "uint256"},
          {name: "k", type: "uint256"},
          {name: "dexReserve", type: "uint256"},
          {name: "creatorFees", type: "uint256"},
          {name: "platformFees", type: "uint256"},
          {name: "graduated", type: "bool"},
          {name: "createdAt", type: "uint256"},
          {name: "totalVolume", type: "uint256"},
          {name: "tradeCount", type: "uint256"}
        ],
        stateMutability: "view",
        type: "function"
      }] as const;
      
      // First, check the pool's real ETH reserves to ensure we don't exceed liquidity
      const tokenInfo = await publicClient.readContract({
        address: FACTORY_ADDRESS as `0x${string}`,
        abi: tokenInfoABI,
        functionName: 'tokenInfo',
        args: [tokenAddress as `0x${string}`],
      });
      
      const realEthReserve = tokenInfo[2]; // realEthReserve is at index 2
      console.log('Pool real ETH reserve:', formatEther(realEthReserve), 'ETH');
      
      // Pre-check if there's enough liquidity
      if (realEthReserve === BigInt(0)) {
        showToast.error('This pool has no liquidity yet. Someone needs to buy tokens first.');
        setIsLoading(false);
        return;
      }
      
      // First check if user has enough balance
      const userBalance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      });
      
      console.log('User token balance:', userBalance.toString());
      
      if (userBalance < tokenAmount) {
        showToast.error(`Insufficient balance. You have ${formatEther(userBalance)} tokens`);
        setIsLoading(false);
        return;
      }
      
      // Calculate expected ETH
      let expectedEth: bigint;
      try {
        expectedEth = await publicClient.readContract({
          address: FACTORY_ADDRESS as `0x${string}`,
          abi: BONDING_CURVE_ABI,
          functionName: 'calculateSellReturn',
          args: [tokenAddress as `0x${string}`, tokenAmount],
        });
      } catch (calcError: any) {
        console.error('Error calculating sell return:', calcError);
        // Check for specific error codes
        if (calcError.message?.includes('0xfb8f41b2') || calcError.message?.includes('InsufficientLiquidityMinted')) {
          showToast.error('Not enough liquidity for this amount. Try selling a smaller amount.');
        } else {
          showToast.error('Unable to calculate sell amount. The amount may be too large for the current liquidity.');
        }
        setIsLoading(false);
        return;
      }
      
      console.log('Expected ETH:', expectedEth.toString());
      
      // Check if expected ETH is reasonable (not 0) and doesn't exceed real reserves
      if (expectedEth === BigInt(0)) {
        showToast.error('This sell would return 0 ETH. Try a smaller amount.');
        setIsLoading(false);
        return;
      }
      
      // Additional check: ensure the expected ETH doesn't exceed 90% of pool's real reserves
      // This provides a safety margin to prevent liquidity drainage
      const maxSafeEth = (realEthReserve * BigInt(90)) / BigInt(100);
      if (expectedEth > maxSafeEth) {
        const maxSafeEthFormatted = formatEther(maxSafeEth);
        showToast.error(`This would drain too much liquidity. Maximum safe sell would return ~${maxSafeEthFormatted} ETH`);
        setIsLoading(false);
        return;
      }
      
      // Calculate min ETH with 1% slippage
      const minEthOut = expectedEth * BigInt(99) / BigInt(100);
      
      // Check current allowance
      console.log('Checking current allowance...');
      const currentAllowance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            inputs: [
              { name: 'owner', type: 'address' },
              { name: 'spender', type: 'address' }
            ],
            name: 'allowance',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function'
          }
        ],
        functionName: 'allowance',
        args: [address, FACTORY_ADDRESS as `0x${string}`],
      });
      
      console.log('Current allowance:', currentAllowance.toString());
      console.log('Required amount:', tokenAmount.toString());
      
      // Only approve if we need more allowance
      if (currentAllowance < tokenAmount) {
        console.log('Need to approve tokens for contract:', FACTORY_ADDRESS);
        showToast.loading('Please approve token spending...');
        
        // Approve max uint256 to avoid future approval issues
        const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
        
        try {
          const { request: approveRequest } = await publicClient.simulateContract({
            account: address,
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [FACTORY_ADDRESS as `0x${string}`, maxApproval],
          });
          
          const approveHash = await walletClient.writeContract(approveRequest);
          console.log('Approval transaction sent:', approveHash);
          
          showToast.loading('Waiting for approval confirmation...');
          const approveReceipt = await publicClient.waitForTransactionReceipt({ 
            hash: approveHash,
            confirmations: 1 
          });
          
          console.log('Approval confirmed:', approveReceipt);
          
          if (approveReceipt.status !== 'success') {
            throw new Error('Approval transaction failed');
          }
          
          // Wait a bit for the approval to be recognized
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (approveError: any) {
          console.error('Approval error:', approveError);
          showToast.error('Failed to approve tokens. Please try again.');
          return;
        }
      } else {
        console.log('Sufficient allowance already exists, skipping approval');
      }
      
      // Now sell
      console.log('Starting sell transaction...');
      showToast.loading('Please confirm sell transaction...');
      
      let request: any;
      try {
        const simulation = await publicClient.simulateContract({
          account: address,
          address: FACTORY_ADDRESS as `0x${string}`,
          abi: BONDING_CURVE_ABI,
          functionName: 'sellTokens',
          args: [tokenAddress as `0x${string}`, tokenAmount, minEthOut],
        });
        request = simulation.request;
      } catch (simError: any) {
        console.error('Simulation failed:', simError);
        if (simError.message?.includes('0xfb8f41b2') || simError.message?.includes('InsufficientLiquidityMinted')) {
          showToast.error('Not enough liquidity in the pool. Try selling a smaller amount.');
        } else if (simError.message?.includes('InsufficientETHReserve')) {
          showToast.error('Not enough ETH in reserves to complete this sale');
        } else {
          showToast.error('Transaction would fail. Please try a different amount.');
        }
        setIsLoading(false);
        return;
      }
      
      const hash = await walletClient.writeContract(request);
      console.log('Sell transaction sent:', hash);
      
      showToast.loading('Transaction pending...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status === 'success') {
        showToast.success('Sell successful!');
        setAmount('');
        // Record trade in backend
        try {
          console.log('Recording sell trade with data:', {
            tokenAddress,
            amount,
            transactionHash: hash,
            slippage: 0.01,
            ethReceived: formatEther(expectedEth),
          });
          
          const result = await apiRequest(API_ENDPOINTS.tokens.sell, {
            method: 'POST',
            body: JSON.stringify({
              tokenAddress,
              amount,
              transactionHash: hash,
              slippage: 0.01,
              ethReceived: formatEther(expectedEth),
            }),
          });
          
          console.log('Sell trade recorded successfully:', result);
        } catch (e) {
          console.error('Failed to record sell trade:', e);
          // Don't show error to user since the on-chain transaction succeeded
          // This is just for analytics
        }
      } else {
        showToast.error('Transaction failed');
      }
    } catch (error: any) {
      console.error('Sell error:', error);
      
      // Parse specific contract errors
      if (error.message?.includes('User rejected')) {
        showToast.error('Transaction cancelled');
      } else if (error.message?.includes('insufficient funds')) {
        showToast.error('Insufficient token balance');
      } else if (error.message?.includes('InsufficientLiquidityMinted') || error.message?.includes('0xfb8f41b2')) {
        showToast.error('Not enough liquidity in the pool. Try selling a smaller amount.');
      } else if (error.message?.includes('InsufficientETHReserve')) {
        showToast.error('Not enough ETH in reserves to complete this sale');
      } else if (error.message?.includes('InsufficientTokenReserve')) {
        showToast.error('Not enough tokens in reserves');
      } else if (error.message?.includes('SlippageExceeded')) {
        showToast.error('Price changed too much. Try again with higher slippage tolerance.');
      } else if (error.message?.includes('InvalidToken')) {
        showToast.error('This token is not valid for trading');
      } else if (error.message?.includes('InsufficientBalance')) {
        showToast.error('You don\'t have enough tokens to sell');
      } else if (error.message?.includes('InsufficientOutputAmount')) {
        showToast.error('Output amount is too low. Try adjusting slippage.');
      } else {
        // Try to extract revert reason from error
        const revertMatch = error.message.match(/reverted with the following signature:\s*(0x[a-fA-F0-9]+)/);
        if (revertMatch) {
          showToast.error(`Transaction failed: Try reducing the amount.`);
        } else {
          showToast.error(error.message || 'Transaction failed');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle trade based on mode
  const handleTrade = () => {
    if (mode === 'buy') {
      handleBuy();
    } else {
      handleSell();
    }
  };
  
  return (
    <LayoutShell>
      <div className="max-w-7xl mx-auto p-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/browse')}
          icon={<FiArrowLeft size={16} />}
          className="mb-6"
        >
          Back to Browse
        </Button>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-6">
            {/* Token Image */}
            {tokenData?.imageUrl && (
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface2 flex-shrink-0">
                <img 
                  src={tokenData.imageUrl.startsWith('http') 
                    ? tokenData.imageUrl 
                    : `http://localhost:5001${tokenData.imageUrl}`
                  }
                  alt={tokenData?.symbol || 'Token'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            
            {/* Token Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-michroma font-bold text-text-primary">
                {tokenData?.name || 'Loading...'}
              </h1>
              <p className="text-lg text-text-secondary">
                ${tokenData?.symbol || '...'}
              </p>
              {tokenData?.description && (
                <p className="text-sm text-text-muted mt-2 max-w-2xl">
                  {tokenData.description}
                </p>
              )}
              
              {/* Social Links */}
              <div className="flex items-center gap-3 mt-3">
                {tokenData?.twitter && (
                  <a 
                    href={`https://twitter.com/${tokenData.twitter.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-text-muted hover:text-primary transition-colors"
                  >
                    <FiTwitter size={16} />
                    <span className="text-sm">@{tokenData.twitter.replace('@', '')}</span>
                  </a>
                )}
                {tokenData?.telegram && (
                  <a 
                    href={`https://t.me/${tokenData.telegram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-text-muted hover:text-primary transition-colors"
                  >
                    <FiMessageCircle size={16} />
                    <span className="text-sm">@{tokenData.telegram.replace('@', '')}</span>
                  </a>
                )}
                {tokenData?.website && (
                  <a 
                    href={tokenData.website.startsWith('http') ? tokenData.website : `https://${tokenData.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-text-muted hover:text-primary transition-colors"
                  >
                    <FiGlobe size={16} />
                    <span className="text-sm">Website</span>
                  </a>
                )}
              </div>
            </div>
          </div>
          
          {/* Real-time data indicator and refresh */}
          <div className="flex items-center gap-3">
            {blockchainData && (
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <FiActivity className="text-primary" size={14} />
                <span>Live data</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchBlockchainData()}
              disabled={refreshing}
              icon={<FiRefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />}
            >
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Token Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Price"
            value={blockchainData?.priceUSD ? `$${parseFloat(blockchainData.priceUSD).toFixed(8)}` : `$${(parseFloat(tokenData?.currentPrice || '0.000001') * 3614).toFixed(8)}`}
            icon={<FiDollarSign className="text-primary" size={20} />}
            subtitle={blockchainData ? 'Live' : 'Cached'}
          />
          <MetricCard
            label="Market Cap"
            value={blockchainData ? `$${parseFloat(blockchainData.marketCap).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `$${parseFloat(tokenData?.marketCap || '0').toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            icon={<FiTrendingUp className="text-primary" size={20} />}
            subtitle={blockchainData ? 'Live' : 'Cached'}
          />
          <MetricCard
            label="Your Balance"
            value={blockchainData && isConnected ? `${parseFloat(blockchainData.userBalance).toFixed(2)}` : tokenData?.holdersCount || '0'}
            icon={<FiUsers className="text-primary" size={20} />}
            subtitle={blockchainData && isConnected ? tokenData?.symbol : 'Connect wallet'}
          />
          <MetricCard
            label="Progress"
            value={`${blockchainData ? blockchainData.bondingProgress : tokenData?.bondingProgress || 0}%`}
            icon={<FiTarget className="text-primary" size={20} />}
            subtitle={blockchainData && blockchainData.bondingProgress < 100 ? `$${(69 * blockchainData.bondingProgress / 100).toFixed(0)}k / $69k` : 'Graduated'}
          />
        </div>
        
        {/* Chart Section */}
        <div className="mb-8">
          <TradingViewLightweight 
            tokenAddress={tokenAddress}
            tokenSymbol={tokenData?.symbol || 'TOKEN'}
            currentPrice={blockchainData ? parseFloat(blockchainData.price) : parseFloat(tokenData?.currentPrice || '0.000001')}
            marketCap={blockchainData ? parseFloat(blockchainData.marketCap) : parseFloat(tokenData?.marketCap || '4512')}
          />
        </div>
        
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Trading Box */}
          <Card className="p-6 bg-surface1 border border-border">
            {/* Buy/Sell Toggle */}
            <div className="flex gap-2 mb-4">
              <Button
                onClick={() => setMode('buy')}
                variant={mode === 'buy' ? 'primary' : 'ghost'}
                className="flex-1"
              >
                Buy
              </Button>
              <Button
                onClick={() => setMode('sell')}
                variant={mode === 'sell' ? 'secondary' : 'ghost'}
                className="flex-1"
              >
                Sell
              </Button>
            </div>
            
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              {mode === 'buy' ? 'Buy' : 'Sell'} {tokenData?.symbol || 'TOKEN'}
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm text-text-muted mb-2 uppercase tracking-wider">
                Amount ({mode === 'buy' ? 'ETH' : tokenData?.symbol || 'TOKEN'})
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.01"
                  step="0.001"
                  className="text-lg pr-16"
                />
                <button
                  type="button"
                  onClick={mode === 'buy' ? calculateMaxBuy : calculateMaxSell}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium text-primary hover:text-primary-light bg-primary/10 hover:bg-primary/20 rounded transition-colors"
                  disabled={!isConnected || isLoading}
                >
                  MAX
                </button>
              </div>
              {/* Show helpful hints */}
              {mode === 'sell' && blockchainData && (
                <div className="text-xs text-text-muted mt-2 space-y-1">
                  <p>Your balance: {parseFloat(blockchainData.userBalance || '0').toFixed(2)} {tokenData?.symbol}</p>
                  <p>Pool ETH: {parseFloat(blockchainData.ethReserve || '0').toFixed(6)} ETH</p>
                  {parseFloat(blockchainData.ethReserve || '0') < 0.01 && (
                    <p className="text-warning">⚠️ Low liquidity - MAX button calculates safe amount</p>
                  )}
                </div>
              )}
              {mode === 'buy' && address && (
                <p className="text-xs text-text-muted mt-2">
                  Max button will use your ETH balance minus gas
                </p>
              )}
            </div>
            
            {isConnected ? (
              <Button
                onClick={handleTrade}
                disabled={isLoading || !amount || parseFloat(amount) <= 0}
                loading={isLoading}
                variant={mode === 'buy' ? 'primary' : 'secondary'}
                className="w-full h-12"
              >
                {isLoading 
                  ? 'Processing...'
                  : !amount || parseFloat(amount) <= 0
                    ? 'Enter Amount'
                    : `${mode === 'buy' ? 'Buy' : 'Sell'} ${tokenData?.symbol || 'TOKEN'}`
                }
              </Button>
            ) : (
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            )}
            
            <div className="mt-4 space-y-1 text-xs text-text-muted">
              <div className="flex justify-between">
                <span>Contract:</span>
                <span className="font-mono">{FACTORY_ADDRESS.slice(0, 10)}...</span>
              </div>
              <div className="flex justify-between">
                <span>Token:</span>
                <span className="font-mono">{tokenAddress.slice(0, 10)}...</span>
              </div>
              <div className="flex justify-between">
                <span>Network:</span>
                <span>Base Sepolia</span>
              </div>
            </div>
          </Card>
          
          {/* Pool Info & Debug */}
          <Card className="p-6 bg-surface1 border border-border">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              {blockchainData ? 'Live Pool Info' : 'Debug Info'}
            </h3>
            
            {blockchainData && (
              <div className="mb-4 pb-4 border-b border-border">
                <h4 className="text-xs text-text-muted uppercase mb-2">Liquidity Reserves</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">ETH Reserve:</span>
                    <span className="font-mono text-text-primary">{parseFloat(blockchainData.ethReserve).toFixed(6)} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Token Reserve:</span>
                    <span className="font-mono text-text-primary">{parseFloat(blockchainData.tokenReserve).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Your Balance:</span>
                    <span className="font-mono text-text-primary">{parseFloat(blockchainData.userBalance).toFixed(2)} {tokenData?.symbol}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2 text-sm font-mono text-text-secondary">
              <div className="flex justify-between">
                <span>Connected:</span>
                <span className={isConnected ? 'text-success' : 'text-danger'}>
                  {isConnected ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Wallet:</span>
                <span>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}</span>
              </div>
              <div className="flex justify-between">
                <span>Data Source:</span>
                <span className={blockchainData ? 'text-primary' : 'text-text-muted'}>
                  {blockchainData ? '🔵 Blockchain' : '📦 Backend'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Token:</span>
                <span>{`${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`}</span>
              </div>
            </div>
            
            {blockchainData && (
              <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded">
                <p className="text-xs text-success flex items-center gap-1">
                  <FiActivity size={12} />
                  Real-time data from blockchain • Refreshes every 30s
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </LayoutShell>
  );
}