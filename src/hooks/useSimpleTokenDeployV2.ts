import { useState, useCallback, useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseEther, formatEther, decodeEventLog } from 'viem';
import { baseSepolia } from 'viem/chains';
import { toast } from 'react-hot-toast';
import { getContractAddress } from '@/contracts/config';

interface TokenData {
  name: string;
  symbol: string;
  description?: string;
  imageUrl?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  category?: string;
  devBuyAmount?: string;
}

// TokenCreated event ABI for DevBondingCurveV2
const TOKEN_CREATED_ABI = {
  type: 'event',
  name: 'TokenCreated',
  inputs: [
    { name: 'token', type: 'address', indexed: true },
    { name: 'creator', type: 'address', indexed: true },
    { name: 'name', type: 'string', indexed: false },
    { name: 'symbol', type: 'string', indexed: false },
    { name: 'timestamp', type: 'uint256', indexed: false },
    { name: 'devBuyAmount', type: 'uint256', indexed: false }
  ]
} as const;

export function useSimpleTokenDeployV2() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedTokenAddress, setDeployedTokenAddress] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const factoryAddress = process.env.NEXT_PUBLIC_DEV_BONDING_FACTORY_ADDRESS || '0x46eCf02772C4Bc9a5cd440FB93022d6e268355c8';

  // Enhanced token address extraction
  const extractTokenAddress = useCallback((logs: any[]): string | null => {
    console.log('Extracting token address from', logs.length, 'logs');
    
    // Method 1: Find TokenCreated event from factory
    for (const log of logs) {
      if (log.address.toLowerCase() === factoryAddress.toLowerCase()) {
        try {
          // Try to decode as TokenCreated event
          const decoded = decodeEventLog({
            abi: [TOKEN_CREATED_ABI],
            data: log.data,
            topics: log.topics,
          });
          
          if (decoded.eventName === 'TokenCreated' && decoded.args.token) {
            console.log('Found token address from TokenCreated event:', decoded.args.token);
            return decoded.args.token.toLowerCase();
          }
        } catch (e) {
          // Try manual extraction from topics
          if (log.topics && log.topics.length >= 2) {
            // First topic is event signature, second is indexed token address
            const tokenAddress = ('0x' + log.topics[1].slice(26)).toLowerCase();
            if (tokenAddress.length === 42 && tokenAddress !== '0x0000000000000000000000000000000000000000') {
              console.log('Found token address from topics:', tokenAddress);
              return tokenAddress;
            }
          }
        }
      }
    }
    
    // Method 2: Find Transfer event (mint to factory)
    const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    const ZERO_ADDRESS_TOPIC = '0x0000000000000000000000000000000000000000000000000000000000000000';
    
    for (const log of logs) {
      if (log.topics?.[0] === TRANSFER_TOPIC && 
          log.topics?.[1] === ZERO_ADDRESS_TOPIC && // From address 0 (mint)
          log.address.toLowerCase() !== factoryAddress.toLowerCase()) {
        console.log('Found token address from mint event:', log.address);
        return log.address.toLowerCase();
      }
    }
    
    return null;
  }, [factoryAddress]);

  // Sync token to database with retries
  const syncTokenToDatabase = useCallback(async (tokenAddress: string, txHash: string, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Syncing token to database (attempt ${i + 1}/${retries})...`);
        
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/tokens/${tokenAddress}/sync`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ txHash })
          }
        );
        
        const data = await response.json();
        
        if (data.success) {
          console.log('Token synced successfully');
          return true;
        } else {
          console.error(`Sync attempt ${i + 1} failed:`, data.error);
          if (i < retries - 1) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, (i + 1) * 1000));
          }
        }
      } catch (err) {
        console.error(`Sync attempt ${i + 1} error:`, err);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, (i + 1) * 1000));
        }
      }
    }
    
    console.error('Failed to sync token after all retries');
    return false;
  }, []);

  const deployToken = useCallback(async (tokenData: TokenData) => {
    if (!isConnected || !address || !walletClient || !publicClient) {
      toast.error('Please connect your wallet first');
      return null;
    }

    setIsDeploying(true);
    setDeployedTokenAddress(null);
    setTransactionHash(null);

    try {
      console.log('Deploying token with DevBondingCurveV2:', tokenData);
      
      // Calculate values
      const creationFee = parseEther('0.001');
      let devBuyValue = BigInt(0);
      
      if (tokenData.devBuyAmount && parseFloat(tokenData.devBuyAmount) > 0) {
        devBuyValue = parseEther(tokenData.devBuyAmount);
      }
      
      const totalValue = creationFee + devBuyValue;
      
      // Check balance
      const balance = await publicClient.getBalance({ address });
      if (balance < totalValue) {
        throw new Error(`Insufficient balance. Need ${formatEther(totalValue)} ETH`);
      }

      // Prepare contract call
      const { request } = await publicClient.simulateContract({
        address: factoryAddress as `0x${string}`,
        abi: [{
          inputs: [
            { name: '_name', type: 'string' },
            { name: '_symbol', type: 'string' },
            { name: '_description', type: 'string' },
            { name: '_imageUrl', type: 'string' },
            { name: '_twitter', type: 'string' },
            { name: '_telegram', type: 'string' },
            { name: '_website', type: 'string' },
            { name: '_category', type: 'string' },
            { name: '_devBuyAmount', type: 'uint256' }
          ],
          name: 'createToken',
          outputs: [{ name: '', type: 'address' }],
          stateMutability: 'payable',
          type: 'function'
        }],
        functionName: 'createToken',
        args: [
          tokenData.name,
          tokenData.symbol,
          tokenData.description || '',
          tokenData.imageUrl || '',
          tokenData.twitter || '',
          tokenData.telegram || '',
          tokenData.website || '',
          tokenData.category || 'meme',
          devBuyValue
        ],
        value: totalValue,
        account: address,
      });

      // Send transaction
      const hash = await walletClient.writeContract(request);
      console.log('Transaction submitted:', hash);
      setTransactionHash(hash);
      toast.success('Transaction submitted! Waiting for confirmation...');

      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      console.log('Transaction confirmed:', receipt);

      if (receipt.status === 'success') {
        // Extract token address
        const tokenAddress = extractTokenAddress(receipt.logs);
        
        if (tokenAddress) {
          console.log('Token deployed at:', tokenAddress);
          setDeployedTokenAddress(tokenAddress);
          toast.success('Token deployed successfully!');
          
          // Sync to database
          const syncSuccess = await syncTokenToDatabase(tokenAddress, hash);
          
          if (!syncSuccess) {
            toast.error('Token deployed but database sync failed. You can manually sync later.');
          }
          
          // Navigate to token page
          setTimeout(() => {
            window.location.href = `/token/${tokenAddress}`;
          }, 2000);
          
          return tokenAddress;
        } else {
          throw new Error('Could not extract token address from transaction');
        }
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error: any) {
      console.error('Deployment error:', error);
      
      const errorMessage = error?.message || 'Failed to deploy token';
      
      if (errorMessage.includes('User denied') || errorMessage.includes('user rejected')) {
        toast('Transaction cancelled');
      } else if (errorMessage.includes('Insufficient')) {
        toast.error('Insufficient ETH balance');
      } else {
        toast.error(errorMessage);
      }
      
      return null;
    } finally {
      setIsDeploying(false);
    }
  }, [isConnected, address, walletClient, publicClient, factoryAddress, extractTokenAddress, syncTokenToDatabase]);

  return {
    deployToken,
    isDeploying,
    isSuccess: !!deployedTokenAddress,
    deployedTokenAddress,
    transactionHash,
    reset: () => {
      setDeployedTokenAddress(null);
      setTransactionHash(null);
      setIsDeploying(false);
    },
  };
}