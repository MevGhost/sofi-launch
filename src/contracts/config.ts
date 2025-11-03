/**
 * Smart Contract Configuration
 * Contract addresses and utilities for interacting with on-chain contracts
 */

import { base, baseSepolia } from 'wagmi/chains';
import TokenFactoryABI from './abis/TokenFactory.json';
import BondingCurveABI from './abis/BondingCurve.json';
import ERC20ABI from './abis/ERC20.json';
import SimpleTokenFactoryABI from './abis/SimpleTokenFactory.json';
import UltraSecureBondingCurveABI from './abis/UltraSecureBondingCurve.json';
import DevBondingCurveABI from './abis/DevBondingCurve.json';

// Contract addresses per chain
export const CONTRACT_ADDRESSES = {
  [base.id]: {
    tokenFactory: process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000',
    graduationManager: process.env.NEXT_PUBLIC_GRADUATION_MANAGER_ADDRESS || '0x0000000000000000000000000000000000000000',
    treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '0x0000000000000000000000000000000000000000',
  },
  [baseSepolia.id]: {
    tokenFactory: process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '0xdFA01a79fb8Bb816BC77aE9cC6C2404b87c2cd18',
    escrowFactory: process.env.NEXT_PUBLIC_ESCROW_FACTORY_ADDRESS || '0xdFA01a79fb8Bb816BC77aE9cC6C2404b87c2cd18',
    simpleTokenFactory: process.env.NEXT_PUBLIC_SIMPLE_FACTORY_ADDRESS || '0x9Ea1121c8013eDbAc57042f973956422831864eC',
    integratedTokenFactory: process.env.NEXT_PUBLIC_INTEGRATED_FACTORY_ADDRESS || '0x227cB6E946B5Fd3f8e82215C6f0a9460f13FEeCE',
    lowFeeTokenFactory: process.env.NEXT_PUBLIC_LOWFEE_FACTORY_ADDRESS || '0xFFa66bfF57DFa41f1051573ad0f69871F972d319',
    lowFeeBondingFactory: process.env.NEXT_PUBLIC_LOWFEE_BONDING_FACTORY_ADDRESS || '0xF1A74278e422B36c7464665981b6bb7536dcD910',
    secureLowFeeBondingFactory: process.env.NEXT_PUBLIC_SECURE_LOWFEE_BONDING_FACTORY_ADDRESS || '0x4f344717f048D5b9553a8292f1c1265832537977',
    ultraSecureBondingFactory: process.env.NEXT_PUBLIC_ULTRA_SECURE_BONDING_FACTORY_ADDRESS || '0xbf8759fB6B543A518cD16CdC627269e17317b65e',
    devBondingFactory: process.env.NEXT_PUBLIC_DEV_BONDING_FACTORY_ADDRESS || '0x46eCf02772C4Bc9a5cd440FB93022d6e268355c8', // V2 - use this for all new tokens
    graduationManager: '0x0000000000000000000000000000000000000000',
    treasury: '0x0000000000000000000000000000000000000000',
  },
} as const;

// Export ABIs
export const ABIS = {
  TokenFactory: TokenFactoryABI.abi,
  BondingCurve: BondingCurveABI.abi,
  ERC20: ERC20ABI.abi,
  SimpleTokenFactory: SimpleTokenFactoryABI,
  UltraSecureBondingCurve: UltraSecureBondingCurveABI,
  DevBondingCurve: DevBondingCurveABI,
} as const;

// Bonding Curve Parameters (matching backend/CLAUDE.md)
export const BONDING_CURVE_PARAMS = {
  INITIAL_VIRTUAL_ETH: BigInt('1000000000000000000'), // 1 ETH in wei
  INITIAL_VIRTUAL_TOKENS: BigInt('1000000000000000000000000'), // 1M tokens
  TOTAL_SUPPLY: BigInt('1000000000000000000000000000'), // 1B tokens
  BONDING_CURVE_SUPPLY: BigInt('800000000000000000000000000'), // 800M tokens (80%)
  DEX_RESERVE: BigInt('200000000000000000000000000'), // 200M tokens (20%)
  GRADUATION_THRESHOLD: BigInt('69000000000000000000000'), // $69,000 in wei (approximate)
  PLATFORM_FEE: BigInt('100'), // 1% = 100 basis points
  CREATOR_FEE: BigInt('100'), // 1% = 100 basis points
} as const;

// Uniswap V3 Configuration
export const UNISWAP_CONFIG = {
  ROUTER_ADDRESS: '0x2626664c2603336E57B271c5C0b26F421741e481', // Base Uniswap V3 Router
  FACTORY_ADDRESS: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD', // Base Uniswap V3 Factory
  POOL_FEE: 3000, // 0.3% fee tier
} as const;

// Transaction settings
export const TX_SETTINGS = {
  DEFAULT_SLIPPAGE: 0.5, // 0.5%
  MAX_SLIPPAGE: 5, // 5%
  DEADLINE_BUFFER: 20 * 60, // 20 minutes in seconds
  GAS_BUFFER: 1.2, // 20% gas buffer
} as const;

// Helper functions
export function getContractAddress(chainId: number, contract: string) {
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] as any;
  if (!addresses) {
    throw new Error(`No contract addresses configured for chain ${chainId}`);
  }
  if (!addresses[contract]) {
    throw new Error(`Contract ${contract} not configured for chain ${chainId}`);
  }
  return addresses[contract] as string;
}

export function calculateMinTokensOut(ethAmount: bigint, slippage: number = TX_SETTINGS.DEFAULT_SLIPPAGE): bigint {
  // Calculate expected tokens based on current bonding curve
  // This is a simplified calculation - actual implementation should query the contract
  const slippageFactor = BigInt(Math.floor((100 - slippage) * 100));
  return (ethAmount * slippageFactor) / BigInt('10000');
}

export function calculateDeadline(): number {
  return Math.floor(Date.now() / 1000) + TX_SETTINGS.DEADLINE_BUFFER;
}

export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  // Calculate 10^decimals without using ** operator for ES2016 compatibility
  let divisor = BigInt(1);
  for (let i = 0; i < decimals; i++) {
    divisor = divisor * BigInt(10);
  }
  
  const beforeDecimal = amount / divisor;
  const afterDecimal = amount % divisor;
  
  if (afterDecimal === BigInt(0)) {
    return beforeDecimal.toString();
  }
  
  const afterDecimalStr = afterDecimal.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${beforeDecimal}.${afterDecimalStr}`;
}

export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  
  // Calculate 10^decimals without using ** operator
  let multiplier = BigInt(1);
  for (let i = 0; i < decimals; i++) {
    multiplier = multiplier * BigInt(10);
  }
  
  return BigInt(whole) * multiplier + BigInt(paddedFraction);
}