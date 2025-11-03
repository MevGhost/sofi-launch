'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { parseEther, formatEther, parseUnits } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import { ABIS, getContractAddress } from '@/contracts/config';
import { toast } from 'react-hot-toast';

export function useBondingCurveTrade(tokenAddress: string) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [isTrading, setIsTrading] = useState(false);

  // Use DevBondingCurve factory
  const factoryAddress = getContractAddress(baseSepolia.id, 'devBondingFactory');

  // Read token info from contract
  const { data: tokenInfo } = useReadContract({
    address: factoryAddress as `0x${string}`,
    abi: ABIS.DevBondingCurve as any,
    functionName: 'tokenInfo' as any,
    args: [tokenAddress],
  });

  // Buy tokens hook
  const {
    data: buyHash,
    writeContract: writeBuy,
    isPending: isBuying,
    reset: resetBuy
  } = useWriteContract();

  const {
    isLoading: isBuyConfirming,
    isSuccess: isBuyConfirmed,
  } = useWaitForTransactionReceipt({
    hash: buyHash,
  });

  // Sell tokens hook
  const {
    data: sellHash,
    writeContract: writeSell,
    isPending: isSelling,
    reset: resetSell
  } = useWriteContract();

  const {
    isLoading: isSellConfirming,
    isSuccess: isSellConfirmed,
  } = useWaitForTransactionReceipt({
    hash: sellHash,
  });

  // Calculate tokens out for a given ETH amount
  const calculateTokensOut = useCallback((ethAmount: bigint) => {
    if (!tokenInfo) return BigInt(0);
    
    const { virtualEthReserve, virtualTokenReserve, realEthReserve, realTokenReserve } = tokenInfo as any;
    
    // Apply fees (2% total: 1% platform + 1% creator)
    const feeAmount = (ethAmount * BigInt(200)) / BigInt(10000);
    const ethAfterFees = ethAmount - feeAmount;
    
    // Calculate using constant product formula
    const totalEthReserve = BigInt(virtualEthReserve) + BigInt(realEthReserve);
    const totalTokenReserve = BigInt(virtualTokenReserve) + BigInt(realTokenReserve);
    
    const k = totalEthReserve * totalTokenReserve;
    const newEthReserve = totalEthReserve + ethAfterFees;
    const newTokenReserve = k / newEthReserve;
    const tokensOut = totalTokenReserve - newTokenReserve;
    
    return tokensOut;
  }, [tokenInfo]);

  // Calculate ETH out for a given token amount
  const calculateEthOut = useCallback((tokenAmount: bigint) => {
    if (!tokenInfo) return BigInt(0);
    
    const { virtualEthReserve, virtualTokenReserve, realEthReserve, realTokenReserve } = tokenInfo as any;
    
    // Calculate using constant product formula
    const totalEthReserve = BigInt(virtualEthReserve) + BigInt(realEthReserve);
    const totalTokenReserve = BigInt(virtualTokenReserve) + BigInt(realTokenReserve);
    
    const k = totalEthReserve * totalTokenReserve;
    const newTokenReserve = totalTokenReserve + tokenAmount;
    const newEthReserve = k / newTokenReserve;
    const ethOut = totalEthReserve - newEthReserve;
    
    // Apply fees (2% total: 1% platform + 1% creator)
    const feeAmount = (ethOut * BigInt(200)) / BigInt(10000);
    const ethAfterFees = ethOut - feeAmount;
    
    return ethAfterFees;
  }, [tokenInfo]);

  // Buy tokens from bonding curve
  const buyTokens = useCallback(async (ethAmount: string, slippageTolerance: number = 0.5) => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsTrading(true);
    resetBuy();

    try {
      const ethAmountWei = parseEther(ethAmount);
      const expectedTokens = calculateTokensOut(ethAmountWei);
      
      // Apply slippage tolerance
      const minTokensOut = (expectedTokens * BigInt(Math.floor((100 - slippageTolerance) * 100))) / BigInt(10000);

      console.log('Buying tokens:', {
        ethAmount: ethAmount,
        expectedTokens: formatEther(expectedTokens),
        minTokensOut: formatEther(minTokensOut)
      });

      await writeBuy({
        address: factoryAddress as `0x${string}`,
        abi: [
          {
            name: 'buyTokens',
            type: 'function',
            stateMutability: 'payable',
            inputs: [
              { name: '_token', type: 'address' },
              { name: '_minTokensOut', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'uint256' }]
          }
        ],
        functionName: 'buyTokens',
        args: [tokenAddress as `0x${string}`, minTokensOut],
        value: ethAmountWei,
      });

      toast.success('Buy transaction submitted!');
    } catch (error: any) {
      console.error('Error buying tokens:', error);
      toast.error(error?.message || 'Failed to buy tokens');
      setIsTrading(false);
    }
  }, [isConnected, address, tokenAddress, factoryAddress, calculateTokensOut, writeBuy, resetBuy]);

  // Sell tokens to bonding curve
  const sellTokens = useCallback(async (tokenAmount: string, slippageTolerance: number = 0.5) => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsTrading(true);
    resetSell();

    try {
      const tokenAmountWei = parseUnits(tokenAmount, 18);
      const expectedEth = calculateEthOut(tokenAmountWei);
      
      // Apply slippage tolerance
      const minEthOut = (expectedEth * BigInt(Math.floor((100 - slippageTolerance) * 100))) / BigInt(10000);

      console.log('Selling tokens:', {
        tokenAmount: tokenAmount,
        expectedEth: formatEther(expectedEth),
        minEthOut: formatEther(minEthOut)
      });

      await writeSell({
        address: factoryAddress as `0x${string}`,
        abi: [
          {
            name: 'sellTokens',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: '_token', type: 'address' },
              { name: '_tokenAmount', type: 'uint256' },
              { name: '_minEthOut', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'uint256' }]
          }
        ],
        functionName: 'sellTokens',
        args: [tokenAddress as `0x${string}`, tokenAmountWei, minEthOut],
      });

      toast.success('Sell transaction submitted!');
    } catch (error: any) {
      console.error('Error selling tokens:', error);
      toast.error(error?.message || 'Failed to sell tokens');
      setIsTrading(false);
    }
  }, [isConnected, address, tokenAddress, factoryAddress, calculateEthOut, writeSell, resetSell]);

  // Handle successful trades
  if (isBuyConfirmed || isSellConfirmed) {
    if (isTrading) {
      setIsTrading(false);
      toast.success('Trade completed successfully!');
    }
  }

  return {
    // State
    tokenInfo,
    isTrading: isTrading || isBuying || isSelling || isBuyConfirming || isSellConfirming,
    
    // Functions
    buyTokens,
    sellTokens,
    calculateTokensOut,
    calculateEthOut,
    
    // Transaction hashes
    buyHash,
    sellHash,
    
    // Status
    isBuyConfirmed,
    isSellConfirmed,
  };
}