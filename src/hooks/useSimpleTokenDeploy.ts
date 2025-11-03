'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract, usePublicClient, useReadContract } from 'wagmi';
import { parseEther, formatEther, encodeFunctionData } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import { ABIS, getContractAddress } from '@/contracts/config';
import { showToast } from '@/components/ToastProvider';

export interface TokenData {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  category?: string;
  devBuyAmount?: string; // ETH amount for optional dev buy
  localImageData?: string; // Base64 image data for backend upload (not blockchain)
}

export function useSimpleTokenDeploy() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedTokenAddress, setDeployedTokenAddress] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<`0x${string}` | null>(null);
  
  const factoryAddress = getContractAddress(baseSepolia.id, 'devBondingFactory');
  
  // Dev contract has no limits - no need to check token count or cooldown
  
  // Check platform fees (still available in dev contract)
  const { data: totalPlatformFees } = useReadContract({
    address: factoryAddress as `0x${string}`,
    abi: ABIS.DevBondingCurve,
    functionName: 'totalPlatformFees',
  });

  const { 
    data: hash, 
    writeContract,
    isPending: isWriting,
    isSuccess: isWriteSuccess,
    error: writeError,
    reset
  } = useWriteContract();

  // Manual transaction monitoring instead of useWaitForTransactionReceipt
  const waitForTransaction = useCallback(async (txHash: `0x${string}`) => {
    if (!publicClient) return;
    
    console.log('Waiting for transaction:', txHash);
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts, ~1 minute
    
    while (attempts < maxAttempts) {
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
        
        if (receipt) {
          console.log('Transaction confirmed:', receipt);
          
          if (receipt.status === 'success') {
            // Extract token address from logs
            const factoryAddr = factoryAddress.toLowerCase();
            console.log('Looking for token in logs. Factory:', factoryAddr);
            console.log('Receipt logs:', receipt.logs);
            
            // First, try to find TokenCreated event
            for (const log of receipt.logs) {
              if (log.address.toLowerCase() === factoryAddr && 
                  log.topics && 
                  log.topics.length >= 2) {
                // TokenCreated event - first topic is event signature, second is token address
                const tokenAddress = log.topics[1] ? ('0x' + log.topics[1].slice(26)).toLowerCase() : null;
                
                if (tokenAddress && tokenAddress.length === 42 && tokenAddress !== '0x0000000000000000000000000000000000000000') {
                  console.log('Token deployed at (from TokenCreated):', tokenAddress);
                  setDeployedTokenAddress(tokenAddress);
                  showToast.success(`Token deployed successfully!`);
                  
                  // Sync token to database immediately
                  console.log('Syncing token to database...');
                  
                  // Get the stored image, metadata, and token data
                  const localImageData = (window as any).__pendingTokenImage;
                  const tokenMetadata = (window as any).__pendingTokenMetadata;
                  const tokenCoreData = (window as any).__pendingTokenData;
                  
                  fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/tokens/${tokenAddress}/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      txHash: txHash,
                      imageData: localImageData, // Send base64 image to backend for storage
                      metadata: tokenMetadata, // Send social links and description
                      tokenData: tokenCoreData // Send token name, symbol, creator for database creation
                    })
                  }).then(res => res.json()).then(data => {
                    if (data.success) {
                      console.log('Token synced successfully with image and metadata');
                      // Clear the pending data
                      delete (window as any).__pendingTokenImage;
                      delete (window as any).__pendingTokenMetadata;
                      delete (window as any).__pendingTokenData;
                    } else {
                      console.error('Failed to sync token:', data.error);
                    }
                  }).catch(err => {
                    console.error('Error syncing token:', err);
                  });
                  
                  // Navigate to token page after a short delay
                  setTimeout(() => {
                    window.location.href = `/token/${tokenAddress}`;
                  }, 2000);
                  
                  return tokenAddress;
                }
              }
            }
            
            // Fallback 1: Look for any new token contract deployment
            // The return value of createToken is the token address
            // In the transaction receipt, this might be in the returnData
            for (const log of receipt.logs) {
              // Look for Transfer event from a new token (mint to creator)
              if (log.topics && 
                  log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
                  log.topics[1] === '0x0000000000000000000000000000000000000000000000000000000000000000' && // from address 0 (mint)
                  log.address.toLowerCase() !== factoryAddr) {
                const tokenAddress = log.address.toLowerCase();
                console.log('Token deployed at (from Transfer/Mint):', tokenAddress);
                setDeployedTokenAddress(tokenAddress);
                showToast.success(`Token deployed successfully!`);
                
                // Sync token to database immediately
                console.log('Syncing token to database...');
                
                // Get the stored image, metadata, and token data
                const localImageData = (window as any).__pendingTokenImage;
                const tokenMetadata = (window as any).__pendingTokenMetadata;
                const tokenCoreData = (window as any).__pendingTokenData;
                
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/tokens/${tokenAddress}/sync`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    txHash: txHash,
                    imageData: localImageData, // Send base64 image to backend for storage
                    metadata: tokenMetadata, // Send social links and description
                    tokenData: tokenCoreData // Send token name, symbol, creator for database creation
                  })
                }).then(res => res.json()).then(data => {
                  if (data.success) {
                    console.log('Token synced successfully with image and metadata');
                    // Clear the pending data
                    delete (window as any).__pendingTokenImage;
                    delete (window as any).__pendingTokenMetadata;
                    delete (window as any).__pendingTokenData;
                  } else {
                    console.error('Failed to sync token:', data.error);
                  }
                }).catch(err => {
                  console.error('Error syncing token:', err);
                });
                
                setTimeout(() => {
                  window.location.href = `/token/${tokenAddress}`;
                }, 2000);
                
                return tokenAddress;
              }
            }
            
            showToast.error('Token deployed but address not found');
          } else {
            showToast.error('Transaction failed');
          }
          
          setIsDeploying(false);
          return;
        }
      } catch (error) {
        // Transaction not yet mined, continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      attempts++;
    }
    
    showToast.error('Transaction timeout - please check your wallet');
    setIsDeploying(false);
  }, [publicClient, factoryAddress]);

  const deployToken = useCallback(async (tokenData: TokenData) => {
    if (!isConnected || !address) {
      showToast.error('Please connect your wallet first');
      return;
    }
    
    // Dev contract has no limits - removed all checks

    setIsDeploying(true);
    setDeployedTokenAddress(null);
    setTransactionHash(null);
    reset();

    try {
      // Store local image data for later upload to backend
      if (tokenData.localImageData) {
        (window as any).__pendingTokenImage = tokenData.localImageData;
        console.log('Stored local image data for backend upload');
      }
      
      // Store metadata for backend
      (window as any).__pendingTokenMetadata = {
        description: tokenData.description || '',
        twitter: tokenData.twitter || '',
        telegram: tokenData.telegram || '',
        website: tokenData.website || ''
      };
      
      // Store core token data for backend creation
      (window as any).__pendingTokenData = {
        name: tokenData.name.trim(),
        symbol: tokenData.symbol.trim().toUpperCase(),
        totalSupply: '1000000000',
        creator: address
      };
      console.log('Stored token data and metadata for backend sync');
      
      // Validate inputs before deployment
      if (tokenData.imageUrl && tokenData.imageUrl.startsWith('data:')) {
        console.warn('Image is base64 data, not sending to blockchain');
        tokenData.imageUrl = ''; // Clear base64 data for blockchain
      }
      
      // Clean social links - remove @ symbols if present
      const cleanTwitter = tokenData.twitter?.replace('@', '') || '';
      const cleanTelegram = tokenData.telegram?.replace('@', '') || '';
      
      console.log('Deploying token with DevBondingCurve:', {
        ...tokenData,
        imageUrl: tokenData.imageUrl ? 'URL provided' : 'No image',
        localImageData: tokenData.localImageData ? 'Base64 data present' : 'No local image'
      });
      
      // Use the dev bonding curve factory (no restrictions)
      const factoryAddress = getContractAddress(baseSepolia.id, 'devBondingFactory');
      console.log('Factory address:', factoryAddress);

      // Calculate total value (creation fee + optional dev buy)
      const creationFee = parseEther('0.001');
      
      // Ensure dev buy amount is valid
      let devBuyValue = BigInt(0);
      if (tokenData.devBuyAmount && parseFloat(tokenData.devBuyAmount) > 0) {
        try {
          devBuyValue = parseEther(tokenData.devBuyAmount);
          console.log('Dev buy value (wei):', devBuyValue.toString());
        } catch (error) {
          console.error('Error parsing dev buy amount:', error);
          devBuyValue = BigInt(0);
        }
      }
      
      const totalValue = creationFee + devBuyValue;
      
      console.log('Creation fee:', formatEther(creationFee), 'ETH');
      console.log('Dev buy amount:', formatEther(devBuyValue), 'ETH');
      console.log('Total value:', formatEther(totalValue), 'ETH');
      
      // Call createToken function with dev buy value
      // The DevBondingCurve contract has a 9th parameter for devBuyAmount
      
      // Check wallet balance first
      if (publicClient) {
        try {
          const balance = await publicClient.getBalance({ address });
          console.log('Wallet balance:', formatEther(balance), 'ETH');
          
          if (balance < totalValue) {
            throw new Error(`Insufficient ETH balance. Need ${formatEther(totalValue)} ETH but have ${formatEther(balance)} ETH`);
          }
        } catch (error) {
          console.error('Error checking balance:', error);
        }
      }
      
      writeContract({
        address: factoryAddress as `0x${string}`,
        abi: ABIS.DevBondingCurve as any, // Type assertion to avoid ABI type issues
        functionName: 'createToken',
        args: [
          tokenData.name.trim(),
          tokenData.symbol.trim().toUpperCase(),
          tokenData.description?.trim() || '',
          '', // Never send image URL to blockchain - too expensive
          cleanTwitter.trim(),
          cleanTelegram.trim(),
          tokenData.website?.trim() || '',
          '', // category field is unused in the contract
          devBuyValue // dev buy amount in wei
        ],
        value: totalValue, // Creation fee + dev buy amount
      });

      console.log('Write contract called, waiting for user confirmation...');
      // The transaction will be submitted after user confirms in wallet
    } catch (error: any) {
      console.error('Error deploying token:', error);
      
      // Provide more helpful error messages for common issues
      let errorMessage = 'Failed to deploy token';
      
      if (error?.message) {
        if (error.message.includes('user rejected') || error.message.includes('User denied')) {
          errorMessage = 'Transaction cancelled by user';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for transaction';
        } else if (error.message.includes('Insufficient fee')) {
          errorMessage = 'Insufficient ETH for creation fee';
        } else if (error.message.includes('Internal JSON-RPC error')) {
          // This is usually a gas estimation issue or contract validation
          errorMessage = 'Transaction would fail. Try reducing dev buy amount or using a different token name/symbol.';
          console.log('Internal RPC Error - possible causes:');
          console.log('1. Token symbol might already exist');
          console.log('2. Gas estimation failing');
          console.log('3. Contract validation issue');
        } else {
          // Don't show the full error if it's too technical
          errorMessage = 'Failed to deploy token. Please try again.';
        }
      }
      
      showToast.error(errorMessage);
      setIsDeploying(false);
    }
  }, [isConnected, address, writeContract, reset]);

  // Handle transaction submission
  useEffect(() => {
    if (isWriteSuccess && hash) {
      console.log('Transaction submitted with hash:', hash);
      setTransactionHash(hash);
      showToast.info('Transaction submitted! Waiting for confirmation...');
      
      // Start monitoring the transaction
      waitForTransaction(hash);
    }
  }, [isWriteSuccess, hash, waitForTransaction]);

  // Handle errors
  useEffect(() => {
    if (writeError) {
      const errorMessage = (writeError as any)?.message || '';
      // Don't show toast for user rejection - they already know
      if (!errorMessage.includes('User denied') && 
          !errorMessage.includes('user rejected')) {
        console.error('Deployment error:', writeError);
        
        // Check for specific error patterns
        if (errorMessage.includes('Insufficient fee')) {
          showToast.error('Insufficient ETH for creation fee (0.001 ETH + gas required)');
        } else if (errorMessage.includes('insufficient funds')) {
          showToast.error('Insufficient ETH in wallet');
        } else {
          showToast.error('Failed to deploy token');
        }
      }
      setIsDeploying(false);
    }
  }, [writeError]);

  return {
    deployToken,
    isDeploying: isDeploying || isWriting,
    isSuccess: !!deployedTokenAddress,
    deployedTokenAddress,
    transactionHash,
    error: writeError,
    reset: () => {
      reset();
      setDeployedTokenAddress(null);
      setTransactionHash(null);
      setIsDeploying(false);
    },
  };
}