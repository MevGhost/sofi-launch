'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAccount, useBalance } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import { showToast } from '@/components/ToastProvider';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useSimpleTokenDeploy } from '@/hooks/useSimpleTokenDeploy';
import { getContractAddress } from '@/contracts/config';
import dynamic from 'next/dynamic';
import { LayoutShell, Chip } from '@/components/alien/Layout';
import { Button } from '@/components/alien/Button';
import { Card, MetricCard } from '@/components/alien/Card';
import { Input } from '@/components/alien/Input';
import {
  FiZap,
  FiImage,
  FiHash,
  FiDollarSign,
  FiUsers,
  FiCheckCircle,
  FiArrowRight,
  FiArrowLeft,
  FiUpload,
  FiTwitter,
  FiMessageCircle,
  FiGlobe,
  FiAlertCircle,
  FiTrendingUp,
  FiLock,
  FiGift,
  FiShield,
  FiInfo,
  FiX
} from 'react-icons/fi';
import { FaEthereum, FaRocket } from 'react-icons/fa';

// Dynamically import mobile component
const MobileTokenCreation = dynamic(
  () => import('@/components/mobile/MobileTokenCreation').then(mod => ({ default: mod.MobileTokenCreation })),
  { 
    loading: () => <div className="min-h-screen bg-canvas" />,
    ssr: false 
  }
);

// Dynamically import SpaceBackground
const SpaceBackground = dynamic(
  () => import('@/visual-effects/backgrounds/SpaceBackground').then(mod => ({ default: mod.SpaceBackground })),
  { ssr: false }
);

interface TokenData {
  // Core fields
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  imageFile?: File | null;
  
  // Social links
  twitter: string;
  telegram: string;
  website: string;
  
  // Dev options
  devBuyAmount: string;
}

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome',
    subtitle: 'Launch your token on Solana',
    icon: <FaRocket size={24} />,
  },
  {
    id: 'identity',
    title: 'Token Identity',
    subtitle: 'Define your token',
    icon: <FiHash size={24} />,
  },
  {
    id: 'tokenomics',
    title: 'Tokenomics',
    subtitle: 'Configure economics',
    icon: <FiTrendingUp size={24} />,
  },
  {
    id: 'social',
    title: 'Social Links',
    subtitle: 'Connect your community',
    icon: <FiUsers size={24} />,
  },
  {
    id: 'review',
    title: 'Review & Launch',
    subtitle: 'Deploy on-chain',
    icon: <FiCheckCircle size={24} />,
  },
];

// Fixed tokenomics as per system requirements
const TOKENOMICS = {
  totalSupply: '1,000,000,000',
  bondingCurveSupply: '800,000,000',
  dexReserve: '200,000,000',
  bondingCurveType: 'Constant Product (x*y=k)',
  initialVirtualETH: '1 ETH',
  initialVirtualTokens: '1,000,000',
  graduationThreshold: '$69,000',
  platformFee: '1%',
  creatorFee: '1%',
};

// Factory configuration - Using the working DevBondingCurve contract
const FACTORY_CONFIG = {
  standard: {
    address: getContractAddress(baseSepolia.id, 'devBondingFactory'), // V2: 0x46eCf02772C4Bc9a5cd440FB93022d6e268355c8
    fee: '0.001',
    label: 'Token Factory',
    description: 'Deploy your token on Base Sepolia',
    recommended: true,
  },
};

export default function NewTokenPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const isMobile = useIsMobile();
  const { deployToken, isDeploying, deployedTokenAddress, transactionHash } = useSimpleTokenDeploy();
  const [currentStep, setCurrentStep] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Get user's ETH balance
  const { data: balance } = useBalance({
    address: address as `0x${string}`,
    chainId: baseSepolia.id,
  });

  const [tokenData, setTokenData] = useState<TokenData>({
    name: '',
    symbol: '',
    description: '',
    imageUrl: '',
    imageFile: null,
    twitter: '',
    telegram: '',
    website: '',
    devBuyAmount: '0',
  });

  // Calculate total cost
  const calculateTotalCost = useCallback(() => {
    const factoryFee = FACTORY_CONFIG.standard.fee;
    const devBuy = parseFloat(tokenData.devBuyAmount || '0');
    return parseFloat(factoryFee) + devBuy;
  }, [tokenData.devBuyAmount]);

  // Validation for current step
  const validateCurrentStep = useCallback(() => {
    switch (currentStep) {
      case 1: // Identity
        if (!tokenData.name || tokenData.name.length > 32) {
          showToast.error('Token name is required (max 32 characters)');
          return false;
        }
        if (!tokenData.symbol || tokenData.symbol.length > 8) {
          showToast.error('Token symbol is required (max 8 characters)');
          return false;
        }
        return true;
      
      case 2: // Tokenomics
        const devAmount = parseFloat(tokenData.devBuyAmount || '0');
        if (devAmount < 0 || devAmount > 1) {
          showToast.error('Dev buy amount must be between 0 and 1 ETH');
          return false;
        }
        return true;
      
      case 3: // Social
        // Social links are optional, no validation needed
        return true;
      
      default:
        return true;
    }
  }, [currentStep, tokenData]);

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showToast.error('Image must be less than 5MB');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast.error('Please upload a JPG, PNG, GIF, or WebP image');
      return;
    }

    setIsUploading(true);
    
    try {
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setTokenData(prev => ({
          ...prev,
          imageUrl: reader.result as string,
          imageFile: file
        }));
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image:', error);
      showToast.error('Failed to process image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeploy = async () => {
    if (!isConnected) {
      showToast.error('Please connect your wallet first');
      return;
    }

    // Final validation
    if (!tokenData.name || !tokenData.symbol) {
      showToast.error('Token name and symbol are required');
      return;
    }

    // Check balance
    const totalCost = calculateTotalCost();
    const userBalance = balance ? parseFloat(formatEther(balance.value)) : 0;
    
    if (userBalance < totalCost) {
      showToast.error(`Insufficient balance. You need ${totalCost.toFixed(4)} ETH`);
      return;
    }

    try {
      // Deploy the token
      // NOTE: Don't send base64 image to blockchain - it's too large and expensive
      // The image should be uploaded to IPFS or a storage service separately
      await deployToken({
        name: tokenData.name,
        symbol: tokenData.symbol.toUpperCase(),
        description: tokenData.description || '',
        imageUrl: '', // Don't send base64 to blockchain - will be handled by backend
        twitter: tokenData.twitter || '',
        telegram: tokenData.telegram || '',
        website: tokenData.website || '',
        category: '', // Unused parameter
        devBuyAmount: tokenData.devBuyAmount || '0',
        localImageData: tokenData.imageUrl, // Pass this for backend upload (not to blockchain)
      });

      // Success handling is done in the hook
      // which redirects to token page automatically
    } catch (error: any) {
      console.error('Deployment failed:', error);
      showToast.error(error.message || 'Failed to deploy token');
    }
  };

  if (isMobile) {
    return <MobileTokenCreation />;
  }

  return (
    <LayoutShell>
      {/* Space Background */}
      <div className="fixed inset-0 z-0">
        <SpaceBackground />
      </div>
      
      {/* Main content */}
      <div className="relative" style={{ zIndex: 1 }}>
        <div className="max-w-4xl mx-auto p-6">
          <div className="py-12">
            {/* Progress Steps */}
            <div className="mb-12">
              <div className="flex items-center justify-between">
                {STEPS.map((step, index) => (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ 
                          scale: index <= currentStep ? 1 : 0.8,
                          opacity: index <= currentStep ? 1 : 0.4
                        }}
                        transition={{ duration: 0.2 }}
                        className={`
                          w-12 h-12 rounded-full flex items-center justify-center shrink-0
                          ${index <= currentStep 
                            ? 'bg-primary text-text-primary' 
                            : 'bg-surface2 text-text-muted'
                          }
                        `}
                      >
                        {index < currentStep ? (
                          <FiCheckCircle size={20} />
                        ) : (
                          React.cloneElement(step.icon, { size: 20 })
                        )}
                      </motion.div>
                      <span className={`
                        text-xs font-medium mt-2 text-center
                        ${index <= currentStep ? 'text-text-primary' : 'text-text-muted'}
                      `}>
                        {step.title}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className={`
                        flex-1 h-0.5 mx-4 self-start mt-6
                        ${index < currentStep ? 'bg-primary' : 'bg-surface2'}
                      `} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <div className="p-6 border-b border-border">
                    <h2 className="text-xl font-semibold text-text-primary">{STEPS[currentStep].title}</h2>
                    <p className="text-sm text-text-muted mt-1">{STEPS[currentStep].subtitle}</p>
                  </div>
                  <div className="p-8">
                    {/* Welcome Step */}
                    {currentStep === 0 && (
                      <div className="py-12">
                        <h3 className="text-2xl font-bold text-text-primary mb-4 text-center">
                          Launch Your Token on Solana
                        </h3>
                        <p className="text-text-secondary mb-10 max-w-xl mx-auto text-center">
                          Create and launch your token with our bonding curve mechanism. 
                          Fair, transparent, and fully on-chain.
                        </p>
                        
                        <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
                          <MetricCard
                            label="Total Supply"
                            value={TOKENOMICS.totalSupply}
                            subtitle="Fixed supply"
                            icon={<FiLock className="text-primary" />}
                          />
                          <MetricCard
                            label="Platform Fee"
                            value={TOKENOMICS.platformFee}
                            subtitle="Low transparent fee"
                            icon={<FiShield className="text-success" />}
                          />
                          <MetricCard
                            label="Graduation"
                            value={TOKENOMICS.graduationThreshold}
                            subtitle="Auto-liquidity at threshold"
                            icon={<FiTrendingUp className="text-accent" />}
                          />
                        </div>

                        <div className="bg-surface1 rounded-lg p-6 space-y-4">
                          <h4 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            <FiInfo className="text-primary" />
                            Token Economics (Fixed)
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between">
                              <span className="text-text-muted">Bonding Curve Supply:</span>
                              <span className="text-text-primary font-medium">{TOKENOMICS.bondingCurveSupply} (80%)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-text-muted">DEX Reserve:</span>
                              <span className="text-text-primary font-medium">{TOKENOMICS.dexReserve} (20%)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-text-muted">Bonding Curve Type:</span>
                              <span className="text-text-primary font-medium">{TOKENOMICS.bondingCurveType}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-text-muted">Creator Fee:</span>
                              <span className="text-text-primary font-medium">{TOKENOMICS.creatorFee}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Identity Step */}
                    {currentStep === 1 && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 block">
                              Token Name *
                            </label>
                            <Input
                              placeholder="e.g., Base Rocket"
                              value={tokenData.name}
                              onChange={(e) => setTokenData(prev => ({ ...prev, name: e.target.value }))}
                              maxLength={32}
                            />
                            <span className="text-xs text-text-muted mt-1">
                              {tokenData.name.length}/32 characters
                            </span>
                          </div>
                          
                          <div>
                            <label className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 block">
                              Token Symbol *
                            </label>
                            <Input
                              placeholder="e.g., ROCKET"
                              value={tokenData.symbol}
                              onChange={(e) => setTokenData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                              maxLength={8}
                            />
                            <span className="text-xs text-text-muted mt-1">
                              {tokenData.symbol.length}/8 characters
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 block">
                            Description
                          </label>
                          <textarea
                            className="w-full px-4 py-3 bg-surface2/50 backdrop-blur-sm border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors resize-none"
                            placeholder="Describe your token and its vision..."
                            rows={4}
                            value={tokenData.description}
                            onChange={(e) => setTokenData(prev => ({ ...prev, description: e.target.value }))}
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 block">
                            Token Image
                          </label>
                          <div className="relative">
                            {tokenData.imageUrl ? (
                              <div className="relative w-32 h-32 mx-auto">
                                <img 
                                  src={tokenData.imageUrl} 
                                  alt="Token" 
                                  className="w-full h-full rounded-lg object-cover"
                                />
                                <button
                                  onClick={() => setTokenData(prev => ({ ...prev, imageUrl: '', imageFile: null }))}
                                  className="absolute -top-2 -right-2 w-6 h-6 bg-danger rounded-full flex items-center justify-center"
                                >
                                  <FiX size={12} />
                                </button>
                              </div>
                            ) : (
                              <label className="block w-full p-8 border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageUpload}
                                  className="hidden"
                                />
                                <div className="flex flex-col items-center">
                                  <FiUpload size={32} className="text-text-muted mb-2" />
                                  <span className="text-sm text-text-muted">
                                    {isUploading ? 'Uploading...' : 'Click or drag to upload'}
                                  </span>
                                  <span className="text-xs text-text-muted mt-1">
                                    JPG, PNG, GIF, WebP (Max 5MB)
                                  </span>
                                </div>
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tokenomics Step */}
                    {currentStep === 2 && (
                      <div className="space-y-6">
                        <div className="bg-surface1 rounded-lg p-6 mb-6">
                          <h4 className="text-lg font-semibold text-text-primary mb-4">Deployment Details</h4>
                          
                          <div className="bg-surface2 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <span className="font-medium text-text-primary">{FACTORY_CONFIG.standard.label}</span>
                              <Chip variant="success">Active</Chip>
                            </div>
                            <p className="text-sm text-text-muted mb-3">{FACTORY_CONFIG.standard.description}</p>
                            <div className="flex items-center gap-2">
                              <FaEthereum className="text-primary" size={16} />
                              <span className="text-lg font-medium text-text-primary">{FACTORY_CONFIG.standard.fee} ETH</span>
                              <span className="text-sm text-text-muted">creation fee</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 block">
                            Developer Buy (Optional)
                          </label>
                          <div className="bg-surface1 rounded-lg p-4">
                            <p className="text-sm text-text-muted mb-4">
                              Purchase tokens at launch. Maximum 1 ETH.
                            </p>
                            <div className="flex items-center gap-4">
                              <Input
                                type="number"
                                placeholder="0"
                                value={tokenData.devBuyAmount}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  if (value >= 0 && value <= 1) {
                                    setTokenData(prev => ({ ...prev, devBuyAmount: e.target.value }));
                                  }
                                }}
                                min="0"
                                max="1"
                                step="0.01"
                              />
                              <span className="text-text-muted">ETH</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-surface1 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-text-muted">Total Cost:</span>
                            <div className="flex items-center gap-2">
                              <FaEthereum className="text-primary" />
                              <span className="text-xl font-bold text-text-primary">
                                {calculateTotalCost().toFixed(4)} ETH
                              </span>
                            </div>
                          </div>
                          {balance && (
                            <div className="mt-2 text-sm text-text-muted text-right">
                              Your balance: {formatEther(balance.value).substring(0, 6)} ETH
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Social Step */}
                    {currentStep === 3 && (
                      <div className="space-y-6">
                        <div className="bg-surface1 rounded-lg p-4 mb-6">
                          <p className="text-sm text-text-secondary flex items-start gap-2">
                            <FiInfo className="text-primary mt-0.5 shrink-0" />
                            Social links help build community trust and discovery. All fields are optional.
                          </p>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 block">
                            Twitter/X
                          </label>
                          <div className="relative">
                            <FiTwitter className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                            <Input
                              placeholder="@yourtoken or https://twitter.com/yourtoken"
                              value={tokenData.twitter}
                              onChange={(e) => setTokenData(prev => ({ ...prev, twitter: e.target.value }))}
                              className="pl-12"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 block">
                            Telegram
                          </label>
                          <div className="relative">
                            <FiMessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                            <Input
                              placeholder="https://t.me/yourtoken"
                              value={tokenData.telegram}
                              onChange={(e) => setTokenData(prev => ({ ...prev, telegram: e.target.value }))}
                              className="pl-12"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 block">
                            Website
                          </label>
                          <div className="relative">
                            <FiGlobe className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                            <Input
                              placeholder="https://yourtoken.com"
                              value={tokenData.website}
                              onChange={(e) => setTokenData(prev => ({ ...prev, website: e.target.value }))}
                              className="pl-12"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Review Step */}
                    {currentStep === 4 && (
                      <div className="space-y-6">
                        {/* Token Preview */}
                        <div className="bg-surface1 rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-text-primary mb-4">Token Preview</h4>
                          <div className="flex items-start gap-4">
                            {tokenData.imageUrl ? (
                              <img 
                                src={tokenData.imageUrl} 
                                alt={tokenData.name}
                                className="w-20 h-20 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-20 h-20 rounded-lg bg-surface2 flex items-center justify-center">
                                <FiImage size={32} className="text-text-muted" />
                              </div>
                            )}
                            <div className="flex-1">
                              <h5 className="text-xl font-bold text-text-primary">{tokenData.name || 'Token Name'}</h5>
                              <p className="text-text-muted">${tokenData.symbol || 'SYMBOL'}</p>
                              {tokenData.description && (
                                <p className="text-sm text-text-secondary mt-2">{tokenData.description}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Configuration Summary */}
                        <div className="bg-surface1 rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-text-primary mb-4">Configuration</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-text-muted">Factory:</span>
                              <span className="text-text-primary font-medium">
                                {FACTORY_CONFIG.standard.label}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-text-muted">Creation Fee:</span>
                              <span className="text-text-primary font-medium">
                                {FACTORY_CONFIG.standard.fee} ETH
                              </span>
                            </div>
                            {parseFloat(tokenData.devBuyAmount) > 0 && (
                              <div className="flex justify-between">
                                <span className="text-text-muted">Dev Buy:</span>
                                <span className="text-text-primary font-medium">
                                  {tokenData.devBuyAmount} ETH
                                </span>
                              </div>
                            )}
                            <div className="border-t border-border pt-3">
                              <div className="flex justify-between">
                                <span className="text-text-primary font-medium">Total Cost:</span>
                                <span className="text-xl font-bold text-primary">
                                  {calculateTotalCost().toFixed(4)} ETH
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Social Links */}
                        {(tokenData.twitter || tokenData.telegram || tokenData.website) && (
                          <div className="bg-surface1 rounded-lg p-6">
                            <h4 className="text-lg font-semibold text-text-primary mb-4">Social Links</h4>
                            <div className="space-y-2">
                              {tokenData.twitter && (
                                <div className="flex items-center gap-2">
                                  <FiTwitter className="text-text-muted" />
                                  <span className="text-text-secondary">{tokenData.twitter}</span>
                                </div>
                              )}
                              {tokenData.telegram && (
                                <div className="flex items-center gap-2">
                                  <FiMessageCircle className="text-text-muted" />
                                  <span className="text-text-secondary">{tokenData.telegram}</span>
                                </div>
                              )}
                              {tokenData.website && (
                                <div className="flex items-center gap-2">
                                  <FiGlobe className="text-text-muted" />
                                  <span className="text-text-secondary">{tokenData.website}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Warning */}
                        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <FiAlertCircle className="text-warning mt-0.5 shrink-0" size={20} />
                            <div>
                              <h5 className="font-medium text-warning mb-1">Important Notice</h5>
                              <p className="text-sm text-text-secondary">
                                Token deployment is permanent and cannot be reversed. 
                                Make sure all information is correct before proceeding.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="p-6 border-t border-border">
                    <div className="flex justify-between">
                      {currentStep > 0 && (
                        <Button
                          variant="secondary"
                          onClick={handlePrevStep}
                          disabled={isDeploying}
                        >
                          <FiArrowLeft className="mr-2" />
                          Previous
                        </Button>
                      )}
                      <div className="ml-auto">
                        {currentStep < STEPS.length - 1 ? (
                          <Button
                            variant="primary"
                            onClick={handleNextStep}
                          >
                            Next
                            <FiArrowRight className="ml-2" />
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            onClick={handleDeploy}
                            disabled={isDeploying || !isConnected}
                            loading={isDeploying}
                          >
                            {isDeploying ? 'Deploying...' : 'Deploy Token'}
                            {!isDeploying && <FaRocket className="ml-2" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}