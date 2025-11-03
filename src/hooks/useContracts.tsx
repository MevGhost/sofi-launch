'use client';

import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useState, useCallback } from 'react';
import { showToast } from '@/components/ToastProvider';
import { 
  ABIS, 
  getContractAddress, 
  calculateMinTokensOut,
  calculateDeadline,
  TX_SETTINGS,
  BONDING_CURVE_PARAMS 
} from '@/contracts/config';

/**
 * Hook for creating new tokens on-chain
 */
export function useCreateToken() {
  const { address, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [isCreating, setIsCreating] = useState(false);

  const createToken = useCallback(async (
    name: string,
    symbol: string,
    imageUrl: string,
    description: string
  ) => {
    if (!address || !chainId) {
      showToast.error('Please connect your wallet');
      return null;
    }

    setIsCreating(true);
    try {
      const tokenFactoryAddress = getContractAddress(chainId, 'tokenFactory');
      
      // Call the factory contract to create a new token
      const hash = await writeContractAsync({
        address: tokenFactoryAddress as `0x${string}`,
        abi: ABIS.TokenFactory,
        functionName: 'createToken',
        args: [name, symbol, imageUrl, description, address],
        value: parseEther('0.01'), // Creation fee
      });

      showToast.success(`Token creation transaction submitted: ${hash.slice(0, 10)}...`);
      
      // Return the transaction hash so the caller can wait for it
      return hash;
    } catch (error) {
      console.error('Token creation failed:', error);
      showToast.error(error instanceof Error ? error.message : 'Failed to create token');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [address, chainId, writeContractAsync]);

  return {
    createToken,
    isCreating,
  };
}

/**
 * Hook for buying tokens from a bonding curve
 */
export function useBuyTokens(bondingCurveAddress: string) {
  const { address, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [isBuying, setIsBuying] = useState(false);

  const buyTokens = useCallback(async (
    ethAmount: string,
    slippage: number = TX_SETTINGS.DEFAULT_SLIPPAGE
  ) => {
    if (!address || !chainId) {
      showToast.error('Please connect your wallet');
      return null;
    }

    setIsBuying(true);
    try {
      const ethAmountWei = parseEther(ethAmount);
      const minTokensOut = calculateMinTokensOut(ethAmountWei, slippage);
      
      const hash = await writeContractAsync({
        address: bondingCurveAddress as `0x${string}`,
        abi: ABIS.BondingCurve,
        functionName: 'buyTokens',
        args: [minTokensOut],
        value: ethAmountWei,
      });

      showToast.success(`Buy transaction submitted: ${hash.slice(0, 10)}...`);
      return hash;
    } catch (error) {
      console.error('Token purchase failed:', error);
      showToast.error(error instanceof Error ? error.message : 'Failed to buy tokens');
      return null;
    } finally {
      setIsBuying(false);
    }
  }, [address, chainId, bondingCurveAddress, writeContractAsync]);

  return {
    buyTokens,
    isBuying,
  };
}

/**
 * Hook for selling tokens back to the bonding curve
 */
export function useSellTokens(bondingCurveAddress: string, tokenAddress: string) {
  const { address, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [isSelling, setIsSelling] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const approveTokens = useCallback(async (amount: string) => {
    if (!address || !chainId) {
      showToast.error('Please connect your wallet');
      return null;
    }

    setIsApproving(true);
    try {
      const tokenAmount = parseEther(amount);
      
      const hash = await writeContractAsync({
        address: tokenAddress as `0x${string}`,
        abi: ABIS.ERC20,
        functionName: 'approve',
        args: [bondingCurveAddress, tokenAmount],
      });

      showToast.success('Approval transaction submitted');
      return hash;
    } catch (error) {
      console.error('Token approval failed:', error);
      showToast.error('Failed to approve tokens');
      return null;
    } finally {
      setIsApproving(false);
    }
  }, [address, chainId, tokenAddress, bondingCurveAddress, writeContractAsync]);

  const sellTokens = useCallback(async (
    tokenAmount: string,
    slippage: number = TX_SETTINGS.DEFAULT_SLIPPAGE
  ) => {
    if (!address || !chainId) {
      showToast.error('Please connect your wallet');
      return null;
    }

    setIsSelling(true);
    try {
      const tokenAmountWei = parseEther(tokenAmount);
      // Calculate minimum ETH out based on slippage
      const minEthOut = (tokenAmountWei * BigInt(Math.floor((100 - slippage) * 100))) / BigInt('10000');
      
      const hash = await writeContractAsync({
        address: bondingCurveAddress as `0x${string}`,
        abi: ABIS.BondingCurve,
        functionName: 'sellTokens',
        args: [tokenAmountWei, minEthOut],
      });

      showToast.success(`Sell transaction submitted: ${hash.slice(0, 10)}...`);
      return hash;
    } catch (error) {
      console.error('Token sale failed:', error);
      showToast.error(error instanceof Error ? error.message : 'Failed to sell tokens');
      return null;
    } finally {
      setIsSelling(false);
    }
  }, [address, chainId, bondingCurveAddress, writeContractAsync]);

  return {
    approveTokens,
    sellTokens,
    isSelling,
    isApproving,
  };
}

/**
 * Hook for reading token information from the factory
 */
export function useTokenInfo(tokenAddress: string) {
  const { chainId } = useAccount();
  
  const { data, isLoading, error } = useReadContract({
    address: chainId ? getContractAddress(chainId, 'tokenFactory') as `0x${string}` : undefined,
    abi: ABIS.TokenFactory,
    functionName: 'getTokenInfo',
    args: tokenAddress ? [tokenAddress as `0x${string}`] : undefined,
  });

  // Type the data properly
  const tokenInfo = data as [string, string, bigint, boolean] | undefined;

  return {
    bondingCurve: tokenInfo?.[0],
    creator: tokenInfo?.[1],
    createdAt: tokenInfo?.[2],
    graduated: tokenInfo?.[3],
    isLoading,
    error,
  };
}

/**
 * Hook for reading bonding curve state
 */
export function useBondingCurveInfo(bondingCurveAddress: string) {
  const { data: currentPrice } = useReadContract({
    address: bondingCurveAddress as `0x${string}`,
    abi: ABIS.BondingCurve,
    functionName: 'getCurrentPrice',
  });

  const { data: marketCap } = useReadContract({
    address: bondingCurveAddress as `0x${string}`,
    abi: ABIS.BondingCurve,
    functionName: 'getMarketCap',
  });

  const { data: isGraduated } = useReadContract({
    address: bondingCurveAddress as `0x${string}`,
    abi: ABIS.BondingCurve,
    functionName: 'isGraduated',
  });

  const { data: virtualEth } = useReadContract({
    address: bondingCurveAddress as `0x${string}`,
    abi: ABIS.BondingCurve,
    functionName: 'virtualEthReserve',
  });

  const { data: virtualTokens } = useReadContract({
    address: bondingCurveAddress as `0x${string}`,
    abi: ABIS.BondingCurve,
    functionName: 'virtualTokenReserve',
  });

  return {
    currentPrice: currentPrice ? formatEther(currentPrice as bigint) : '0',
    marketCap: marketCap ? formatEther(marketCap as bigint) : '0',
    isGraduated: isGraduated as boolean,
    virtualEth: virtualEth ? formatEther(virtualEth as bigint) : '0',
    virtualTokens: virtualTokens ? formatEther(virtualTokens as bigint) : '0',
  };
}

/**
 * Hook for calculating buy/sell amounts
 */
export function usePriceCalculator(bondingCurveAddress: string) {
  const calculateBuyAmount = useCallback(async (ethAmount: string) => {
    if (!bondingCurveAddress || !ethAmount) return '0';
    
    try {
      // In production, this would call the contract's calculateTokensOut function
      // For now, using a simple calculation
      const ethWei = parseEther(ethAmount);
      const tokensOut = (ethWei * BONDING_CURVE_PARAMS.INITIAL_VIRTUAL_TOKENS) / BONDING_CURVE_PARAMS.INITIAL_VIRTUAL_ETH;
      return formatEther(tokensOut);
    } catch {
      return '0';
    }
  }, [bondingCurveAddress]);

  const calculateSellAmount = useCallback(async (tokenAmount: string) => {
    if (!bondingCurveAddress || !tokenAmount) return '0';
    
    try {
      // In production, this would call the contract's calculateEthOut function
      const tokenWei = parseEther(tokenAmount);
      const ethOut = (tokenWei * BONDING_CURVE_PARAMS.INITIAL_VIRTUAL_ETH) / BONDING_CURVE_PARAMS.INITIAL_VIRTUAL_TOKENS;
      return formatEther(ethOut);
    } catch {
      return '0';
    }
  }, [bondingCurveAddress]);

  return {
    calculateBuyAmount,
    calculateSellAmount,
  };
}

/**
 * Hook to wait for transaction confirmation
 */
export function useTransactionStatus(hash: `0x${string}` | undefined) {
  const { data, isLoading, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    receipt: data,
    isConfirming: isLoading,
    isConfirmed: isSuccess,
    isFailed: isError,
  };
}