'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiArrowLeft,
  FiArrowRight,
  FiUpload,
  FiCamera,
  FiInfo,
  FiCheck,
  FiAlertCircle,
  FiStar,
  FiShield,
  FiUsers,
  FiTrendingUp,
  FiDollarSign,
  FiSettings,
  FiZap,
  FiLock,
  FiUnlock,
  FiGlobe,
  FiTwitter,
  FiMessageCircle,
  FiFileText,
  FiSave,
  FiAward,
  FiChevronDown,
  FiX,
  FiPlus,
  FiMinus,
  FiLoader
} from 'react-icons/fi';
import { BottomSheet, MiniBottomSheet } from './BottomSheet';
import { useRouter } from 'next/navigation';
import FiImage from 'next/image';

// Types
interface TokenFormData {
  // Basic Details
  name: string;
  symbol: string;
  description: string;
  logo?: File | string;
  
  // Tokenomics
  totalSupply: string;
  decimals: number;
  initialLiquidity: string;
  liquidityLockDuration: number;
  teamAllocation: number;
  marketingAllocation: number;
  liquidityAllocation: number;
  publicSaleAllocation: number;
  
  // Launch Settings
  launchType: 'fair' | 'presale' | 'stealth';
  maxBuyAmount: string;
  maxWalletAmount: string;
  buyTax: number;
  sellTax: number;
  antiSnipeEnabled: boolean;
  antiWhaleEnabled: boolean;
  blacklistEnabled: boolean;
  
  // Social Links
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
}

interface ValidationError {
  field: string;
  message: string;
}

// Step Components
const steps = [
  { id: 'details', title: 'Token Details', icon: FiFileText },
  { id: 'tokenomics', title: 'Tokenomics', icon: FiTrendingUp },
  { id: 'launch', title: 'Launch Settings', icon: FiZap },
  { id: 'review', title: 'Review & Deploy', icon: FiCheck }
];

export function MobileTokenCreation() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<TokenFormData>({
    name: '',
    symbol: '',
    description: '',
    totalSupply: '1000000000',
    decimals: 18,
    initialLiquidity: '',
    liquidityLockDuration: 365,
    teamAllocation: 10,
    marketingAllocation: 5,
    liquidityAllocation: 50,
    publicSaleAllocation: 35,
    launchType: 'fair',
    maxBuyAmount: '',
    maxWalletAmount: '',
    buyTax: 5,
    sellTax: 5,
    antiSnipeEnabled: true,
    antiWhaleEnabled: true,
    blacklistEnabled: false
  });
  
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [infoContent, setInfoContent] = useState({ title: '', description: '' });
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentSuccess, setDeploymentSuccess] = useState(false);
  const [estimatedGas, setEstimatedGas] = useState('0.025');
  const [draftSaved, setDraftSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate total allocation
  const totalAllocation = formData.teamAllocation + 
    formData.marketingAllocation + 
    formData.liquidityAllocation + 
    formData.publicSaleAllocation;

  // Validation
  const validateStep = (step: number): boolean => {
    const newErrors: ValidationError[] = [];
    
    switch (step) {
      case 0: // Token Details
        if (!formData.name) {
          newErrors.push({ field: 'name', message: 'Token name is required' });
        }
        if (!formData.symbol || formData.symbol.length > 10) {
          newErrors.push({ field: 'symbol', message: 'Symbol is required (max 10 characters)' });
        }
        if (!formData.description) {
          newErrors.push({ field: 'description', message: 'Description is required' });
        }
        break;
        
      case 1: // Tokenomics
        if (totalAllocation !== 100) {
          newErrors.push({ field: 'allocation', message: 'Total allocation must equal 100%' });
        }
        if (!formData.initialLiquidity || parseFloat(formData.initialLiquidity) <= 0) {
          newErrors.push({ field: 'initialLiquidity', message: 'Initial liquidity is required' });
        }
        break;
        
      case 2: // Launch Settings
        if (formData.buyTax + formData.sellTax > 20) {
          newErrors.push({ field: 'tax', message: 'Combined tax cannot exceed 20%' });
        }
        break;
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Navigation
  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // File handling
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors([{ field: 'logo', message: 'File size must be less than 5MB' }]);
        return;
      }
      setFormData({ ...formData, logo: file });
    }
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      // Handle camera capture logic here
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      // Camera access denied
    }
  };

  // Save draft
  const saveDraft = () => {
    localStorage.setItem('tokenDraft', JSON.stringify(formData));
    setDraftSaved(true);
  };

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('tokenDraft');
    if (draft) {
      setFormData(JSON.parse(draft));
    }
  }, []);

  // Deploy token
  const handleDeploy = async () => {
    if (!validateStep(currentStep)) return;
    
    setIsDeploying(true);
    
    // TODO: Implement actual token deployment logic
    
    setIsDeploying(false);
    setDeploymentSuccess(true);
    
    
    // Redirect to portfolio
    router.push('/portfolio');
  };

  // Show info
  const showInfo = (title: string, description: string) => {
    setInfoContent({ title, description });
    setShowInfoSheet(true);
  };

  // Slider component
  const Slider = ({ 
    value, 
    onChange, 
    min = 0, 
    max = 100, 
    step = 1,
    label,
    suffix = '%'
  }: {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    label: string;
    suffix?: string;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-primary/60">{label}</span>
        <span className="text-sm font-medium text-text-primary">{value}{suffix}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 bg-surface2 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #0052FF 0%, #0EA5E9 ${(value - min) / (max - min) * 100}%, rgba(255,255,255,0.08) ${(value - min) / (max - min) * 100}%)`
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-canvas/90 backdrop-blur-xl border-b border-border">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/portfolio')}
              className="w-10 h-10 bg-surface3 rounded-xl flex items-center justify-center"
            >
              <FiArrowLeft className="w-5 h-5 text-text-primary/60" />
            </button>
            
            <h1 className="text-lg font-semibold text-text-primary">Create Token</h1>
            
            <button
              onClick={saveDraft}
              className="w-10 h-10 bg-surface3 rounded-xl flex items-center justify-center"
            >
              {draftSaved ? (
                <FiCheck className="w-5 h-5 text-green-400" />
              ) : (
                <FiSave className="w-5 h-5 text-text-primary/60" />
              )}
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex-1 ${index < steps.length - 1 ? 'relative' : ''}`}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      index <= currentStep
                        ? 'bg-gradient-to-r from-[#0052FF] to-[#0EA5E9] text-text-primary'
                        : 'bg-surface3 text-text-primary/40'
                    }`}
                  >
                    {index < currentStep ? (
                      <FiCheck className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`text-[10px] mt-1 ${
                    index <= currentStep ? 'text-text-primary' : 'text-text-primary/40'
                  }`}>
                    {step.title}
                  </span>
                </div>
                
                {index < steps.length - 1 && (
                  <div
                    className={`absolute top-5 left-[calc(50%+20px)] right-[calc(-50%+20px)] h-[2px] transition-all ${
                      index < currentStep
                        ? 'bg-gradient-to-r from-[#0052FF] to-[#0EA5E9]'
                        : 'bg-surface2'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {currentStep === 0 && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4 space-y-4"
          >
            {/* Logo FiUpload */}
            <div className="bg-surface2 rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-text-primary">Token Logo</label>
                <button
                  onClick={() => showInfo('Token Logo', 'Upload a logo for your token. This will be displayed on exchanges and wallets.')}
                  className="p-1"
                >
                  <FiInfo className="w-4 h-4 text-text-primary/40" />
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 bg-surface3 rounded-xl flex items-center justify-center overflow-hidden">
                  {formData.logo ? (
                    typeof formData.logo === 'string' ? (
                      <FiImage src={formData.logo} alt="Token logo" width={80} height={80} />
                    ) : (
                      <FiImage src={URL.createObjectURL(formData.logo)} alt="Token logo" width={80} height={80} />
                    )
                  ) : (
                    <FiUpload className="w-8 h-8 text-text-primary/20" />
                  )}
                </div>
                
                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 bg-surface3 rounded-lg text-sm text-text-primary/60 hover:bg-surface2 transition-colors"
                  >
                    <FiUpload className="w-4 h-4 inline mr-2" />
                    Upload Image
                  </button>
                  <button
                    onClick={handleCameraCapture}
                    className="w-full py-2 bg-surface3 rounded-lg text-sm text-text-primary/60 hover:bg-surface2 transition-colors"
                  >
                    <FiCamera className="w-4 h-4 inline mr-2" />
                    Take Photo
                  </button>
                </div>
              </div>
            </div>

            {/* Token Name */}
            <div className="bg-surface2 rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-text-primary">Token Name</label>
                <button
                  onClick={() => showInfo('Token Name', 'The full name of your token. This will be displayed on exchanges and in wallets.')}
                  className="p-1"
                >
                  <FiInfo className="w-4 h-4 text-text-primary/40" />
                </button>
              </div>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Ethereum"
                className="w-full bg-surface3 rounded-lg px-4 py-3 text-text-primary placeholder-white/30 outline-none focus:bg-surface2 transition-colors"
              />
              {errors.find(e => e.field === 'name') && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                  <FiAlertCircle className="w-3 h-3" />
                  {errors.find(e => e.field === 'name')?.message}
                </p>
              )}
            </div>

            {/* Token Symbol */}
            <div className="bg-surface2 rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-text-primary">Token Symbol</label>
                <button
                  onClick={() => showInfo('Token Symbol', 'The ticker symbol for your token (e.g., ETH, BTC). Maximum 10 characters.')}
                  className="p-1"
                >
                  <FiInfo className="w-4 h-4 text-text-primary/40" />
                </button>
              </div>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                placeholder="e.g., ETH"
                maxLength={10}
                className="w-full bg-surface3 rounded-lg px-4 py-3 text-text-primary placeholder-white/30 outline-none focus:bg-surface2 transition-colors uppercase"
              />
              {errors.find(e => e.field === 'symbol') && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                  <FiAlertCircle className="w-3 h-3" />
                  {errors.find(e => e.field === 'symbol')?.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="bg-surface2 rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-text-primary">Description</label>
                <button
                  onClick={() => showInfo('Description', 'A brief description of your token and its purpose.')}
                  className="p-1"
                >
                  <FiInfo className="w-4 h-4 text-text-primary/40" />
                </button>
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your token..."
                rows={4}
                className="w-full bg-surface3 rounded-lg px-4 py-3 text-text-primary placeholder-white/30 outline-none focus:bg-surface2 transition-colors resize-none"
              />
              {errors.find(e => e.field === 'description') && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                  <FiAlertCircle className="w-3 h-3" />
                  {errors.find(e => e.field === 'description')?.message}
                </p>
              )}
            </div>

            {/* Social Links */}
            <div className="bg-surface2 rounded-2xl p-4 border border-border">
              <h3 className="text-sm font-medium text-text-primary mb-3">Social Links (Optional)</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <FiGlobe className="w-5 h-5 text-text-primary/40" />
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="Website URL"
                    className="flex-1 bg-surface3 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-white/30 outline-none focus:bg-surface2 transition-colors"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <FiTwitter className="w-5 h-5 text-text-primary/40" />
                  <input
                    type="text"
                    value={formData.twitter}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    placeholder="Twitter handle"
                    className="flex-1 bg-surface3 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-white/30 outline-none focus:bg-surface2 transition-colors"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <FiMessageCircle className="w-5 h-5 text-text-primary/40" />
                  <input
                    type="text"
                    value={formData.telegram}
                    onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                    placeholder="Telegram group"
                    className="flex-1 bg-surface3 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-white/30 outline-none focus:bg-surface2 transition-colors"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === 1 && (
          <motion.div
            key="tokenomics"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4 space-y-4"
          >
            {/* Total Supply */}
            <div className="bg-surface2 rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-text-primary">Total Supply</label>
                <button
                  onClick={() => showInfo('Total Supply', 'The maximum number of tokens that will ever exist.')}
                  className="p-1"
                >
                  <FiInfo className="w-4 h-4 text-text-primary/40" />
                </button>
              </div>
              <input
                type="text"
                value={formData.totalSupply}
                onChange={(e) => setFormData({ ...formData, totalSupply: e.target.value })}
                placeholder="1000000000"
                className="w-full bg-surface3 rounded-lg px-4 py-3 text-text-primary placeholder-white/30 outline-none focus:bg-surface2 transition-colors"
              />
              <p className="text-xs text-text-primary/40 mt-2">
                {parseInt(formData.totalSupply).toLocaleString()} tokens
              </p>
            </div>

            {/* Initial Liquidity */}
            <div className="bg-surface2 rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-text-primary">Initial Liquidity (ETH)</label>
                <button
                  onClick={() => showInfo('Initial Liquidity', 'The amount of ETH to add to the liquidity pool at launch.')}
                  className="p-1"
                >
                  <FiInfo className="w-4 h-4 text-text-primary/40" />
                </button>
              </div>
              <input
                type="text"
                value={formData.initialLiquidity}
                onChange={(e) => setFormData({ ...formData, initialLiquidity: e.target.value })}
                placeholder="1.0"
                className="w-full bg-surface3 rounded-lg px-4 py-3 text-text-primary placeholder-white/30 outline-none focus:bg-surface2 transition-colors"
              />
              {errors.find(e => e.field === 'initialLiquidity') && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                  <FiAlertCircle className="w-3 h-3" />
                  {errors.find(e => e.field === 'initialLiquidity')?.message}
                </p>
              )}
            </div>

            {/* Liquidity FiLock */}
            <div className="bg-surface2 rounded-2xl p-4 border border-border">
              <Slider
                value={formData.liquidityLockDuration}
                onChange={(value) => setFormData({ ...formData, liquidityLockDuration: value })}
                min={30}
                max={1095}
                step={1}
                label="Liquidity Lock Duration"
                suffix=" days"
              />
              <p className="text-xs text-text-primary/40 mt-2">
                Liquidity will be locked for {formData.liquidityLockDuration} days
              </p>
            </div>

            {/* Token Allocation */}
            <div className="bg-surface2 rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-text-primary">Token Allocation</h3>
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                  totalAllocation === 100 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {totalAllocation}%
                </span>
              </div>
              
              <div className="space-y-4">
                <Slider
                  value={formData.liquidityAllocation}
                  onChange={(value) => setFormData({ ...formData, liquidityAllocation: value })}
                  label="Liquidity Pool"
                />
                
                <Slider
                  value={formData.publicSaleAllocation}
                  onChange={(value) => setFormData({ ...formData, publicSaleAllocation: value })}
                  label="Public Sale"
                />
                
                <Slider
                  value={formData.teamAllocation}
                  onChange={(value) => setFormData({ ...formData, teamAllocation: value })}
                  label="Team"
                />
                
                <Slider
                  value={formData.marketingAllocation}
                  onChange={(value) => setFormData({ ...formData, marketingAllocation: value })}
                  label="Marketing"
                />
              </div>
              
              {errors.find(e => e.field === 'allocation') && (
                <p className="text-xs text-red-400 mt-3 flex items-center gap-1">
                  <FiAlertCircle className="w-3 h-3" />
                  {errors.find(e => e.field === 'allocation')?.message}
                </p>
              )}
            </div>

            {/* Visual Pie Chart */}
            <div className="bg-surface2 rounded-2xl p-4 border border-border">
              <h3 className="text-sm font-medium text-text-primary mb-3">Allocation Breakdown</h3>
              <div className="relative h-40 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#0052FF] to-[#0EA5E9] p-[2px]">
                  <div className="w-full h-full rounded-full bg-canvas flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-text-primary">{totalAllocation}%</p>
                      <p className="text-xs text-text-primary/40">Total</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-xs text-text-primary/60">Liquidity: {formData.liquidityAllocation}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-xs text-text-primary/60">Public: {formData.publicSaleAllocation}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full" />
                  <span className="text-xs text-text-primary/60">Team: {formData.teamAllocation}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full" />
                  <span className="text-xs text-text-primary/60">Marketing: {formData.marketingAllocation}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === 2 && (
          <motion.div
            key="launch"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4 space-y-4"
          >
            {/* Launch Type */}
            <div className="bg-surface2 rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-text-primary">Launch Type</label>
                <button
                  onClick={() => showInfo('Launch Type', 'Choose how your token will be launched. Fair launch means no presale, stealth launch means no marketing before launch.')}
                  className="p-1"
                >
                  <FiInfo className="w-4 h-4 text-text-primary/40" />
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {(['fair', 'presale', 'stealth'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFormData({ ...formData, launchType: type })}
                    className={`py-3 px-4 rounded-xl text-sm font-medium capitalize transition-all ${
                      formData.launchType === type
                        ? 'bg-gradient-to-r from-[#0052FF] to-[#0EA5E9] text-text-primary'
                        : 'bg-surface3 text-text-primary/60 border border-border'
                    }`}
                  >
                    {type === 'fair' && <FiUsers className="w-4 h-4 inline mr-1" />}
                    {type === 'presale' && <FiDollarSign className="w-4 h-4 inline mr-1" />}
                    {type === 'stealth' && <FiZap className="w-4 h-4 inline mr-1" />}
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Trading Limits */}
            <div className="bg-surface2 rounded-2xl p-4 border border-border">
              <h3 className="text-sm font-medium text-text-primary mb-3">Trading Limits</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-text-primary/60">Max Buy Amount (% of supply)</label>
                  <input
                    type="text"
                    value={formData.maxBuyAmount}
                    onChange={(e) => setFormData({ ...formData, maxBuyAmount: e.target.value })}
                    placeholder="1.0"
                    className="w-full mt-1 bg-surface3 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-white/30 outline-none focus:bg-surface2 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="text-xs text-text-primary/60">Max Wallet Amount (% of supply)</label>
                  <input
                    type="text"
                    value={formData.maxWalletAmount}
                    onChange={(e) => setFormData({ ...formData, maxWalletAmount: e.target.value })}
                    placeholder="2.0"
                    className="w-full mt-1 bg-surface3 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-white/30 outline-none focus:bg-surface2 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Transaction Taxes */}
            <div className="bg-surface2 rounded-2xl p-4 border border-border">
              <h3 className="text-sm font-medium text-text-primary mb-4">Transaction Taxes</h3>
              
              <div className="space-y-4">
                <Slider
                  value={formData.buyTax}
                  onChange={(value) => setFormData({ ...formData, buyTax: value })}
                  min={0}
                  max={10}
                  label="Buy Tax"
                />
                
                <Slider
                  value={formData.sellTax}
                  onChange={(value) => setFormData({ ...formData, sellTax: value })}
                  min={0}
                  max={10}
                  label="Sell Tax"
                />
              </div>
              
              {errors.find(e => e.field === 'tax') && (
                <p className="text-xs text-red-400 mt-3 flex items-center gap-1">
                  <FiAlertCircle className="w-3 h-3" />
                  {errors.find(e => e.field === 'tax')?.message}
                </p>
              )}
            </div>

            {/* Security Features */}
            <div className="bg-surface2 rounded-2xl p-4 border border-border">
              <h3 className="text-sm font-medium text-text-primary mb-3">Security Features</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => setFormData({ ...formData, antiSnipeEnabled: !formData.antiSnipeEnabled })}
                  className="w-full flex items-center justify-between p-3 bg-surface2 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FiShield className="w-5 h-5 text-text-primary/60" />
                    <div className="text-left">
                      <p className="text-sm text-text-primary">Anti-Snipe Protection</p>
                      <p className="text-xs text-text-primary/40">Prevent bots from buying at launch</p>
                    </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full p-1 transition-all ${
                    formData.antiSnipeEnabled ? 'bg-gradient-to-r from-[#0052FF] to-[#0EA5E9]' : 'bg-surface2'
                  }`}>
                    <motion.div
                      layout
                      className="w-4 h-4 bg-white rounded-full"
                      animate={{ x: formData.antiSnipeEnabled ? 20 : 0 }}
                    />
                  </div>
                </button>
                
                <button
                  onClick={() => setFormData({ ...formData, antiWhaleEnabled: !formData.antiWhaleEnabled })}
                  className="w-full flex items-center justify-between p-3 bg-surface2 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FiUsers className="w-5 h-5 text-text-primary/60" />
                    <div className="text-left">
                      <p className="text-sm text-text-primary">Anti-Whale Mechanism</p>
                      <p className="text-xs text-text-primary/40">Limit large purchases and sales</p>
                    </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full p-1 transition-all ${
                    formData.antiWhaleEnabled ? 'bg-gradient-to-r from-[#0052FF] to-[#0EA5E9]' : 'bg-surface2'
                  }`}>
                    <motion.div
                      layout
                      className="w-4 h-4 bg-white rounded-full"
                      animate={{ x: formData.antiWhaleEnabled ? 20 : 0 }}
                    />
                  </div>
                </button>
                
                <button
                  onClick={() => setFormData({ ...formData, blacklistEnabled: !formData.blacklistEnabled })}
                  className="w-full flex items-center justify-between p-3 bg-surface2 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FiLock className="w-5 h-5 text-text-primary/60" />
                    <div className="text-left">
                      <p className="text-sm text-text-primary">Blacklist Function</p>
                      <p className="text-xs text-text-primary/40">Ability to block malicious actors</p>
                    </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full p-1 transition-all ${
                    formData.blacklistEnabled ? 'bg-gradient-to-r from-[#0052FF] to-[#0EA5E9]' : 'bg-surface2'
                  }`}>
                    <motion.div
                      layout
                      className="w-4 h-4 bg-white rounded-full"
                      animate={{ x: formData.blacklistEnabled ? 20 : 0 }}
                    />
                  </div>
                </button>
              </div>
            </div>

            {/* Advanced Settings */}
            <button
              onClick={() => setShowAdvancedSettings(true)}
              className="w-full py-3 bg-surface2 rounded-xl text-sm text-text-primary/60 border border-border flex items-center justify-center gap-2"
            >
              <FiSettings className="w-4 h-4" />
              Advanced Settings
            </button>
          </motion.div>
        )}

        {currentStep === 3 && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4 space-y-4"
          >
            {/* Token Summary */}
            <div className="bg-gradient-to-br from-[#0052FF]/20 to-[#0EA5E9]/20 rounded-2xl p-4 border border-[#0052FF]/30">
              <div className="flex items-center gap-4 mb-4">
                {formData.logo && (
                  <div className="w-16 h-16 bg-surface3 rounded-xl flex items-center justify-center overflow-hidden">
                    {typeof formData.logo === 'string' ? (
                      <FiImage src={formData.logo} alt="Token logo" width={64} height={64} />
                    ) : (
                      <FiImage src={URL.createObjectURL(formData.logo)} alt="Token logo" width={64} height={64} />
                    )}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-text-primary">{formData.name}</h2>
                  <p className="text-sm text-text-primary/60">${formData.symbol}</p>
                </div>
              </div>
              
              <p className="text-sm text-text-primary/80 leading-relaxed">{formData.description}</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface2 rounded-xl p-3 border border-border">
                <p className="text-xs text-text-primary/40 mb-1">Total Supply</p>
                <p className="text-sm font-semibold text-text-primary">{parseInt(formData.totalSupply).toLocaleString()}</p>
              </div>
              <div className="bg-surface2 rounded-xl p-3 border border-border">
                <p className="text-xs text-text-primary/40 mb-1">Initial Liquidity</p>
                <p className="text-sm font-semibold text-text-primary">{formData.initialLiquidity} ETH</p>
              </div>
              <div className="bg-surface2 rounded-xl p-3 border border-border">
                <p className="text-xs text-text-primary/40 mb-1">Launch Type</p>
                <p className="text-sm font-semibold text-text-primary capitalize">{formData.launchType}</p>
              </div>
              <div className="bg-surface2 rounded-xl p-3 border border-border">
                <p className="text-xs text-text-primary/40 mb-1">Lock Duration</p>
                <p className="text-sm font-semibold text-text-primary">{formData.liquidityLockDuration} days</p>
              </div>
            </div>

            {/* Allocation Review */}
            <div className="bg-surface2 rounded-xl p-4 border border-border">
              <h3 className="text-sm font-medium text-text-primary mb-3">Token Allocation</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-primary/60">Liquidity Pool</span>
                  <span className="text-xs font-medium text-text-primary">{formData.liquidityAllocation}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-primary/60">Public Sale</span>
                  <span className="text-xs font-medium text-text-primary">{formData.publicSaleAllocation}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-primary/60">Team</span>
                  <span className="text-xs font-medium text-text-primary">{formData.teamAllocation}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-primary/60">Marketing</span>
                  <span className="text-xs font-medium text-text-primary">{formData.marketingAllocation}%</span>
                </div>
              </div>
            </div>

            {/* Tax & Security Review */}
            <div className="bg-surface2 rounded-xl p-4 border border-border">
              <h3 className="text-sm font-medium text-text-primary mb-3">Taxes & Security</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-primary/60">Buy Tax</span>
                  <span className="text-xs font-medium text-text-primary">{formData.buyTax}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-primary/60">Sell Tax</span>
                  <span className="text-xs font-medium text-text-primary">{formData.sellTax}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-primary/60">Anti-Snipe</span>
                  <span className={`text-xs font-medium ${formData.antiSnipeEnabled ? 'text-green-400' : 'text-text-primary/40'}`}>
                    {formData.antiSnipeEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-primary/60">Anti-Whale</span>
                  <span className={`text-xs font-medium ${formData.antiWhaleEnabled ? 'text-green-400' : 'text-text-primary/40'}`}>
                    {formData.antiWhaleEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Gas Estimation */}
            <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
              <div className="flex items-center gap-3">
                <FiZap className="w-5 h-5 text-amber-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">Estimated Gas Fee</p>
                  <p className="text-xs text-text-primary/60">~{estimatedGas} ETH ($45.00)</p>
                </div>
              </div>
            </div>

            {/* Deploy Button */}
            {!deploymentSuccess && (
              <button
                onClick={handleDeploy}
                disabled={isDeploying}
                className="w-full py-4 bg-gradient-to-r from-[#0052FF] to-[#0EA5E9] text-text-primary font-semibold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeploying ? (
                  <>
                    <FiLoader className="w-5 h-5 animate-spin" />
                    Deploying Token...
                  </>
                ) : (
                  <>
                    <FiZap className="w-5 h-5" />
                    Deploy Token
                  </>
                )}
              </button>
            )}

            {/* Success State */}
            {deploymentSuccess && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-green-500/10 rounded-2xl p-6 border border-green-500/20"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiAward className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">Token Deployed Successfully!</h3>
                  <p className="text-sm text-text-primary/60 mb-4">Your token is now live on Base</p>
                  <div className="bg-canvas/20 rounded-lg p-3">
                    <p className="text-xs text-text-primary/40 mb-1">Contract Address</p>
                    <p className="text-sm font-mono text-text-primary">0x742d35Cc6634C0532925a3b844Bc9e7595f0bE8</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      {!deploymentSuccess && (
        <div className="fixed bottom-0 left-0 right-0 bg-canvas/95 backdrop-blur-2xl border-t border-border p-4 z-50">
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="flex-1 py-4 rounded-xl bg-surface3 border border-border text-text-primary font-medium text-base"
              >
                Back
              </button>
            )}
            
            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex-1 py-4 rounded-xl bg-gradient-to-r from-[#0052FF] to-[#0EA5E9] text-text-primary font-medium flex items-center justify-center gap-2 text-base"
              >
                <span>Continue</span>
                <FiArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleDeploy}
                disabled={isDeploying}
                className="flex-1 py-4 rounded-xl font-medium flex items-center justify-center gap-2 bg-gradient-to-r from-[#0052FF] to-[#0EA5E9] text-text-primary text-base"
              >
                {isDeploying ? (
                  <>
                    <FiLoader className="w-4 h-4 animate-spin" />
                    <span>Deploying...</span>
                  </>
                ) : (
                  <>
                    <FiZap className="w-4 h-4" />
                    <span>Launch Token</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Advanced Settings Sheet */}
      <BottomSheet
        isOpen={showAdvancedSettings}
        onClose={() => setShowAdvancedSettings(false)}
        title="Advanced Settings"
        snapPoints={[70, 90]}
      >
        <div className="p-4 space-y-4">
          <div className="bg-surface2 rounded-xl p-4">
            <h3 className="text-sm font-medium text-text-primary mb-3">Contract Features</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-primary/60">Pausable</span>
                <button className="w-12 h-6 bg-surface2 rounded-full p-1">
                  <div className="w-4 h-4 bg-white rounded-full" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-primary/60">Mintable</span>
                <button className="w-12 h-6 bg-surface2 rounded-full p-1">
                  <div className="w-4 h-4 bg-white rounded-full" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-primary/60">Burnable</span>
                <button className="w-12 h-6 bg-surface2 rounded-full p-1">
                  <div className="w-4 h-4 bg-white rounded-full" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-surface2 rounded-xl p-4">
            <h3 className="text-sm font-medium text-text-primary mb-3">Gas Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-primary/60">Gas Price (Gwei)</label>
                <input
                  type="text"
                  placeholder="Auto"
                  className="w-full mt-1 bg-surface3 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-white/30 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-text-primary/60">Gas Limit</label>
                <input
                  type="text"
                  placeholder="Auto"
                  className="w-full mt-1 bg-surface3 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-white/30 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </BottomSheet>

      {/* Info Sheet */}
      <MiniBottomSheet
        isOpen={showInfoSheet}
        onClose={() => setShowInfoSheet(false)}
      >
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-text-primary">{infoContent.title}</h3>
          <p className="text-sm text-text-primary/60 leading-relaxed">{infoContent.description}</p>
        </div>
      </MiniBottomSheet>
    </div>
  );
}