'use client';

import { useAccount, useReadContract } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { ABIS, getContractAddress } from '@/contracts/config';

export function useCheckTokenLimits() {
  const { address } = useAccount();
  
  const factoryAddress = getContractAddress(baseSepolia.id, 'devBondingFactory');
  
  // Dev contract has no limits - return zeros for all checks
  const userTokenCount = undefined; // No limits in dev contract
  const lastCreationTime = undefined; // No cooldown in dev contract
  
  // Read platform fees (still available in dev contract)
  const { data: totalPlatformFees } = useReadContract({
    address: factoryAddress as `0x${string}`,
    abi: ABIS.DevBondingCurve,
    functionName: 'totalPlatformFees',
  });
  
  const tokenCount = 0; // Always 0 for dev contract
  const lastCreation = 0; // Always 0 for dev contract
  const platformFees: bigint = totalPlatformFees ? BigInt(totalPlatformFees.toString()) : BigInt(0);
  
  // Dev contract has no limits
  const MAX_TOKENS_PER_USER = Infinity; // No limit in dev contract
  const COOLDOWN_PERIOD = 0; // No cooldown in dev contract
  const ONE_ETH = BigInt('1000000000000000000');
  
  const currentTime = Math.floor(Date.now() / 1000);
  const timeSinceLastCreation = Infinity; // Always pass cooldown check
  const cooldownActive = false; // Never active in dev contract
  const cooldownRemaining = 0; // Always 0 for dev contract
  
  const isUnlimited = true; // Always unlimited in dev contract
  const hasReachedLimit = false; // Never reached limit in dev contract
  
  const platformFeesEth = Number(platformFees) / 1e18;
  const progressToUnlock = Math.min((platformFeesEth / 1) * 100, 100);

  return {
    tokenCount,
    maxTokens: isUnlimited ? Infinity : MAX_TOKENS_PER_USER,
    hasReachedLimit,
    cooldownActive,
    cooldownRemaining,
    isUnlimited,
    canCreateToken: !hasReachedLimit && !cooldownActive,
    platformFees: platformFeesEth,
    progressToUnlock,
    limitMessage: hasReachedLimit 
      ? `You've reached the ${MAX_TOKENS_PER_USER} token limit. Use a different wallet or wait for platform unlock. (Platform fees: ${platformFeesEth.toFixed(4)} ETH / 1 ETH for unlock)`
      : cooldownActive 
      ? `Please wait ${cooldownRemaining} seconds before creating another token.`
      : null,
  };
}