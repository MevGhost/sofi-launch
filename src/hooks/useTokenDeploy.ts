'use client';

import { useState, useCallback, useRef } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseEther, encodeFunctionData } from 'viem';
import { showToast } from '@/components/ToastProvider';
import { API_ENDPOINTS, apiRequest } from '@/lib/api/config';

// Token Factory ABI (minimal)
const TOKEN_FACTORY_ABI = [
  {
    "inputs": [],
    "name": "getCreationFee",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "_name", "type": "string"},
      {"internalType": "string", "name": "_symbol", "type": "string"},
      {"internalType": "string", "name": "_description", "type": "string"},
      {"internalType": "string", "name": "_imageUrl", "type": "string"},
      {"internalType": "string", "name": "_twitter", "type": "string"},
      {"internalType": "string", "name": "_telegram", "type": "string"},
      {"internalType": "string", "name": "_website", "type": "string"},
      {"internalType": "string", "name": "_category", "type": "string"}
    ],
    "name": "createToken",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;

const TOKEN_FACTORY_ADDRESS = '0x227cB6E946B5Fd3f8e82215C6f0a9460f13FEeCE'; // New IntegratedTokenFactory with bonding curve

export function useTokenDeploy() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedTokenAddress, setDeployedTokenAddress] = useState<string | null>(null);
  const deploymentInProgressRef = useRef(false);

  const deployToken = useCallback(async (params: {
    name: string;
    symbol: string;
    description?: string;
    imageUrl?: string;
    twitter?: string;
    telegram?: string;
    website?: string;
    totalSupply?: string;
    bondingCurveType?: string;
  }) => {
    console.log('deployToken called with params:', params);
    console.log('isConnected:', isConnected);
    console.log('address:', address);
    console.log('walletClient:', walletClient);
    console.log('publicClient:', publicClient);
    
    // Prevent duplicate deployment attempts
    if (deploymentInProgressRef.current) {
      console.log('Deployment already in progress, skipping...');
      return null;
    }
    
    if (!isConnected || !address || !walletClient || !publicClient) {
      showToast.error('Please connect your wallet');
      return null;
    }

    deploymentInProgressRef.current = true;
    setIsDeploying(true);
    
    try {
      // Step 1: Get creation fee from contract
      const creationFee = await publicClient.readContract({
        address: TOKEN_FACTORY_ADDRESS,
        abi: TOKEN_FACTORY_ABI,
        functionName: 'getCreationFee',
      });

      console.log('Creation fee:', creationFee);

      // Step 2: Deploy token via user's wallet
      const { request } = await publicClient.simulateContract({
        account: address,
        address: TOKEN_FACTORY_ADDRESS,
        abi: TOKEN_FACTORY_ABI,
        functionName: 'createToken',
        args: [
          params.name,
          params.symbol.toUpperCase(),
          params.description || '',
          params.imageUrl || '',
          params.twitter || '',
          params.telegram || '',
          params.website || '',
          'meme', // category
        ],
        value: creationFee,
      });

      // Step 3: Execute the transaction
      showToast.loading('Please confirm the transaction in your wallet...');
      const hash = await walletClient.writeContract(request);
      
      showToast.loading('Deploying token on-chain...');
      
      // Step 4: Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      // Step 5: Extract token address from logs
      let tokenAddress = '';
      const logs = receipt.logs;
      
      // Look for TokenCreated event 
      // Event signature: TokenCreated(address indexed token, address indexed creator, string name, string symbol, uint256 timestamp)
      // Topic hash calculated as: keccak256("TokenCreated(address,address,string,string,uint256)")
      const TOKEN_CREATED_TOPIC = '0xd9c8ae68b2c72e33e535e2e7f5f4e13b5e2e3b8f77e5f52e6d8f2c3e1a4b9d7e';
      
      console.log('Transaction receipt logs:', logs);
      
      // Try multiple approaches to find the token address
      for (const log of logs) {
        console.log('Log topics:', log.topics);
        console.log('Log address:', log.address);
        
        // The factory emits TokenCreated event
        if (log.address.toLowerCase() === TOKEN_FACTORY_ADDRESS.toLowerCase()) {
          // For TokenCreated event, token address is the first indexed parameter (topics[1])
          if (log.topics[1]) {
            tokenAddress = `0x${log.topics[1].slice(26)}`;
            console.log('Found token address from factory event:', tokenAddress);
            break;
          }
        }
        
        // Also check if this might be a Transfer event from the token itself (mint to factory)
        // Transfer topic: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
        if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
          // For mint, from address is 0x0 (topics[1])
          if (log.topics[1] === '0x0000000000000000000000000000000000000000000000000000000000000000') {
            // This is a mint event, the log.address is the token address
            tokenAddress = log.address;
            console.log('Found token address from Transfer event:', tokenAddress);
            break;
          }
        }
      }

      if (!tokenAddress || tokenAddress === '0x') {
        console.error('Could not find token address in logs');
        console.error('Receipt:', receipt);
        throw new Error('Could not extract token address from transaction. Please check the transaction on Basescan.');
      }

      console.log('Token deployed at:', tokenAddress);
      
      // Set the deployed token address
      setDeployedTokenAddress(tokenAddress);

      // Step 6: Register token with backend
      const response = await apiRequest<{ success: boolean; data: any }>(
        API_ENDPOINTS.tokens.create,
        {
          method: 'POST',
          body: JSON.stringify({
            ...params,
            tokenAddress,
            deploymentTx: hash,
            bondingCurveAddress: TOKEN_FACTORY_ADDRESS,
          }),
        }
      );

      if (!response.success) {
        throw new Error('Failed to register token');
      }

      showToast.success('Token deployed successfully!');
      return {
        tokenAddress,
        transactionHash: hash,
        token: response.data,
      };
    } catch (error: any) {
      console.error('Token deployment error:', error);
      
      if (error.message?.includes('User rejected')) {
        showToast.error('Transaction cancelled');
      } else if (error.message?.includes('Insufficient funds')) {
        showToast.error('Insufficient ETH for deployment (need 0.02 ETH + gas)');
      } else {
        showToast.error(error.message || 'Failed to deploy token');
      }
      
      return null;
    } finally {
      deploymentInProgressRef.current = false;
      setIsDeploying(false);
    }
  }, [address, isConnected, walletClient, publicClient]);

  return {
    deployToken,
    isDeploying,
    deployedTokenAddress,
  };
}