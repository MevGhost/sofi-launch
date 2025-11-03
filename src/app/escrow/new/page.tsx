'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { showToast } from '@/components/ToastProvider';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useEscrowContract } from '@/hooks/useEscrows';
import dynamic from 'next/dynamic';
import { LayoutShell, Chip } from '@/components/alien/Layout';
import { Button } from '@/components/alien/Button';
import { Card } from '@/components/alien/Card';
import { Input } from '@/components/alien/Input';
import {
  FiShield,
  FiUsers,
  FiTarget,
  FiLock,
  FiCheckCircle,
  FiArrowRight,
  FiArrowLeft,
  FiPlus,
  FiTrash2,
  FiCalendar,
  FiDollarSign,
  FiAlertCircle,
  FiTrendingUp,
  FiCode,
  FiUserCheck,
  FiFileText
} from 'react-icons/fi';
import { FaBullhorn, FaHandshake } from 'react-icons/fa';

// Dynamically import mobile component
const MobileEscrowCreation = dynamic(
  () => import('@/components/mobile/MobileEscrowCreation').then(mod => ({ default: mod.MobileEscrowCreation })),
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

interface Milestone {
  id: string;
  title: string;
  description: string;
  amount: number;
  releaseDate: string;
  conditions: string[];
}

interface EscrowData {
  // Backend compatible fields
  projectName: string;
  dealType: string;
  dealDescription: string;
  kolAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  totalAmount: string;
  milestones: Milestone[];
  startDate: string;
  endDate: string;
  requiresVerification: boolean;
  verificationMethod: 'NONE' | 'COMMUNITY' | 'PLATFORM';
  verifierAddresses: string[];
}

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Escrow',
    subtitle: 'Create a secure agreement on Base L2',
    icon: <FiShield size={24} />,
  },
  {
    id: 'parties',
    title: 'Deal Parties',
    subtitle: 'Define who\'s involved',
    icon: <FiUsers size={24} />,
  },
  {
    id: 'milestones',
    title: 'Milestones',
    subtitle: 'Break down deliverables',
    icon: <FiTarget size={24} />,
  },
  {
    id: 'protection',
    title: 'Protection',
    subtitle: 'Configure safeguards',
    icon: <FiLock size={24} />,
  },
  {
    id: 'review',
    title: 'Review & Deploy',
    subtitle: 'Confirm and deploy',
    icon: <FiCheckCircle size={24} />,
  },
];

const TOKENS = [
  { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USDC (Base)' },
  { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', name: 'Wrapped ETH' },
  { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDT', name: 'Tether USD' },
];

const DEAL_TYPES = [
  { value: 'MARKETING', label: 'Marketing Campaign', icon: FaBullhorn },
  { value: 'DEVELOPMENT', label: 'Development Work', icon: FiCode },
  { value: 'PARTNERSHIP', label: 'Strategic Partnership', icon: FaHandshake },
  { value: 'ADVISORY', label: 'Advisory Services', icon: FiUserCheck },
  { value: 'OTHER', label: 'Other Services', icon: FiFileText },
];

export default function NewEscrowPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const isMobile = useIsMobile();
  const { createEscrow, loading: isDeploying } = useEscrowContract();
  const [currentStep, setCurrentStep] = useState(0);
  
  const [escrowData, setEscrowData] = useState<EscrowData>({
    projectName: '',
    dealType: 'MARKETING',
    dealDescription: '',
    kolAddress: '',
    tokenAddress: TOKENS[0].address,
    tokenSymbol: TOKENS[0].symbol,
    totalAmount: '',
    milestones: [],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    requiresVerification: false,
    verificationMethod: 'NONE',
    verifierAddresses: [],
  });

  const handleNextStep = () => {
    // Minimal validation - allow user to proceed
    if (currentStep === 1) {
      // Deal parties - very minimal validation
      if (!escrowData.kolAddress) {
        showToast.error('Please enter a KOL address');
        return;
      }
      if (!escrowData.projectName) {
        showToast.error('Please enter a project name');
        return;
      }
    }
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDeploy = async () => {
    if (!isConnected) {
      showToast.error('Please connect your wallet first');
      return;
    }

    // Validate required fields
    if (!escrowData.projectName || !escrowData.kolAddress || !escrowData.totalAmount) {
      showToast.error('Please complete all required fields');
      return;
    }

    if (escrowData.milestones.length === 0) {
      showToast.error('Please add at least one milestone');
      return;
    }

    try {
      // Call real backend API with all required fields
      const txHash = await createEscrow({
        projectName: escrowData.projectName,
        dealType: escrowData.dealType,
        dealDescription: escrowData.dealDescription,
        kolAddress: escrowData.kolAddress,
        tokenAddress: escrowData.tokenAddress,
        tokenSymbol: escrowData.tokenSymbol,
        totalAmount: escrowData.totalAmount,
        milestones: escrowData.milestones.map(m => ({
          title: m.title,
          description: m.description,
          amount: m.amount.toString(),
          releaseDate: m.releaseDate,
          conditions: m.conditions,
          percentage: (m.amount / parseFloat(escrowData.totalAmount)) * 100,
          status: 'pending' as const,
          deadline: m.releaseDate,
          released: false,
          verified: false
        })),
        startDate: escrowData.startDate,
        endDate: escrowData.endDate,
        requiresVerification: escrowData.requiresVerification,
        verificationMethod: escrowData.verificationMethod,
        verifierAddresses: escrowData.verifierAddresses
      });

      showToast.success('Escrow deployed successfully!');
      router.push('/portfolio?tab=escrows');
    } catch (error: any) {
      console.error('Failed to deploy escrow:', error);
      showToast.error(error.message || 'Failed to deploy escrow');
    }
  };

  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: Date.now().toString(),
      title: '',
      description: '',
      amount: 0,
      releaseDate: new Date(Date.now() + (escrowData.milestones.length + 1) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      conditions: [],
    };
    setEscrowData(prev => ({
      ...prev,
      milestones: [...prev.milestones, newMilestone],
    }));
  };

  const removeMilestone = (id: string) => {
    setEscrowData(prev => ({
      ...prev,
      milestones: prev.milestones.filter(m => m.id !== id),
    }));
  };

  const updateMilestone = (id: string, updates: Partial<Milestone>) => {
    setEscrowData(prev => ({
      ...prev,
      milestones: prev.milestones.map(m => 
        m.id === id ? { ...m, ...updates } : m
      ),
    }));
  };

  if (isMobile) {
    return <MobileEscrowCreation />;
  }

  return (
    <LayoutShell>
      {/* Space Background - positioned absolutely */}
      <div className="fixed inset-0 z-0">
        <SpaceBackground />
      </div>
      
      {/* Main content with higher z-index */}
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
                      text-xs font-medium mt-2
                      ${index <= currentStep ? 'text-text-primary' : 'text-text-muted'}
                    `}>
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`
                      flex-1 h-0.5 mx-4
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
                        Secure Your KOL Deals On-Chain
                      </h3>
                      <p className="text-text-secondary mb-10 max-w-xl mx-auto text-center">
                        Create trustless escrow agreements with milestone-based releases, dispute resolution, and complete transparency.
                      </p>
                      
                      <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
                        {[
                          {
                            metric: '100%',
                            label: 'Trustless',
                            description: 'Smart contract secured with no intermediaries',
                            visual: () => (
                              <div className="relative w-full h-32 overflow-hidden rounded-lg bg-black/40">
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="relative">
                                    <motion.div
                                      className="w-16 h-16 rounded-full border-2 border-primary/30"
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                    />
                                    <motion.div
                                      className="absolute inset-2 w-12 h-12 rounded-full border-2 border-primary/50"
                                      animate={{ rotate: -360 }}
                                      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                    />
                                    <div className="absolute inset-4 w-8 h-8 rounded-full bg-gradient-to-br from-[#0052FF] to-primary flex items-center justify-center">
                                      <FiLock className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          },
                          {
                            metric: '2.5%',
                            label: 'Platform Fee',
                            description: 'Low transparent fees with no hidden costs',
                            visual: () => (
                              <div className="relative w-full h-32 overflow-hidden rounded-lg bg-black/40">
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <svg className="w-20 h-20" viewBox="0 0 42 42">
                                    <circle
                                      cx="21"
                                      cy="21"
                                      r="15.915"
                                      fill="transparent"
                                      stroke="#1f2937"
                                      strokeWidth="3"
                                    />
                                    <motion.circle
                                      cx="21"
                                      cy="21"
                                      r="15.915"
                                      fill="transparent"
                                      stroke="#0EA5E9"
                                      strokeWidth="3"
                                      strokeDasharray="2.5 97.5"
                                      strokeDashoffset="25"
                                      initial={{ strokeDasharray: "0 100" }}
                                      animate={{ strokeDasharray: "2.5 97.5" }}
                                      transition={{ duration: 1 }}
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                      <div className="text-xs font-bold text-white">2.5%</div>
                                      <div className="text-[8px] text-text-muted">only</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          },
                          {
                            metric: 'Base L2',
                            label: 'Fast & Cheap',
                            description: 'Near-instant transactions with minimal gas fees',
                            visual: () => (
                              <div className="relative w-full h-32 overflow-hidden rounded-lg bg-black/40">
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="space-y-2 w-full px-4">
                                    {[0.3, 0.5, 0.2].map((delay, i) => (
                                      <div key={i} className="relative h-1 bg-surface3 rounded-full overflow-hidden">
                                        <motion.div
                                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-transparent via-primary to-transparent"
                                          initial={{ x: '-100%' }}
                                          animate={{ x: '200%' }}
                                          transition={{
                                            duration: 1.5,
                                            delay: delay,
                                            repeat: Infinity,
                                            ease: "linear"
                                          }}
                                          style={{ width: '50%' }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="absolute bottom-2 right-2 text-[8px] font-mono text-text-muted">
                                  BASE L2
                                </div>
                              </div>
                            )
                          },
                        ].map((item, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative group"
                          >
                            <div className="bg-surface2/50 rounded-xl overflow-hidden border border-border hover:border-primary/30 transition-all h-full">
                              {item.visual()}
                              <div className="p-4">
                                <div className="flex items-baseline gap-2 mb-1">
                                  <span className="text-2xl font-bold text-text-primary">{item.metric}</span>
                                  <span className="text-sm text-text-muted">{item.label}</span>
                                </div>
                                <p className="text-xs text-text-secondary">{item.description}</p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Parties Step */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          Project Name *
                        </label>
                        <Input
                          placeholder="e.g., MoonShot Marketing Campaign"
                          value={escrowData.projectName}
                          onChange={(e) => setEscrowData(prev => ({ ...prev, projectName: e.target.value }))}
                        />
                        <p className="text-xs text-text-muted mt-1">Give your escrow agreement a clear name</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-4">
                          Deal Type *
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {DEAL_TYPES.map((type) => (
                            <Card
                              key={type.value}
                              className={`p-4 cursor-pointer transition-all ${
                                escrowData.dealType === type.value
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:border-border-hover'
                              }`}
                              onClick={() => setEscrowData(prev => ({ ...prev, dealType: type.value }))}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                  {React.createElement(type.icon, { className: "w-5 h-5 text-primary" })}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-text-primary">{type.label}</h4>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  escrowData.dealType === type.value
                                    ? 'border-primary'
                                    : 'border-border'
                                }`}>
                                  {escrowData.dealType === type.value && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                                  )}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            KOL Address *
                          </label>
                          <Input
                            placeholder="0x..."
                            value={escrowData.kolAddress}
                            onChange={(e) => setEscrowData(prev => ({ ...prev, kolAddress: e.target.value }))}
                          />
                          <p className="text-xs text-text-muted mt-1">The address receiving funds</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Payment Token
                          </label>
                          <select
                            value={escrowData.tokenAddress}
                            onChange={(e) => {
                              const token = TOKENS.find(t => t.address === e.target.value);
                              setEscrowData(prev => ({
                                ...prev,
                                tokenAddress: e.target.value,
                                tokenSymbol: token?.symbol || '',
                              }));
                            }}
                            className="w-full h-10 px-4 bg-surface2 border border-border rounded-lg text-text-primary focus:border-primary focus:outline-none transition-colors"
                          >
                            {TOKENS.map(token => (
                              <option key={token.address} value={token.address}>
                                {token.name} ({token.symbol})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          Total Amount
                        </label>
                        <div className="relative">
                          <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={escrowData.totalAmount}
                            onChange={(e) => setEscrowData(prev => ({ ...prev, totalAmount: e.target.value }))}
                            className="pl-10"
                          />
                        </div>
                        <p className="text-xs text-text-muted mt-1">
                          Total amount to be escrowed in {escrowData.tokenSymbol}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          Description
                        </label>
                        <textarea
                          placeholder="Describe the agreement..."
                          value={escrowData.dealDescription}
                          onChange={(e) => setEscrowData(prev => ({ ...prev, dealDescription: e.target.value }))}
                          className="w-full min-h-[100px] px-4 py-2 bg-surface2 border border-border rounded-lg text-text-primary placeholder-text-muted focus:border-primary focus:outline-none transition-colors resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Milestones Step */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-text-primary">Milestones</h3>
                          <p className="text-sm text-text-muted">Break down the work into milestones</p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={addMilestone}
                          icon={<FiPlus size={16} />}
                        >
                          Add Milestone
                        </Button>
                      </div>

                      {escrowData.milestones.length === 0 ? (
                        <Card padding="lg">
                          <div className="text-center py-8">
                            <FiTarget className="w-12 h-12 text-text-muted mx-auto mb-4" />
                            <h4 className="text-lg font-semibold text-text-primary mb-2">No milestones yet</h4>
                            <p className="text-sm text-text-secondary mb-4">Add milestones to define deliverables</p>
                            <Button
                              variant="primary"
                              onClick={addMilestone}
                              icon={<FiPlus size={16} />}
                            >
                              Add First Milestone
                            </Button>
                          </div>
                        </Card>
                      ) : (
                        <div className="space-y-4">
                          {escrowData.milestones.map((milestone, index) => (
                            <Card key={milestone.id} padding="md">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-xs font-bold text-primary">{index + 1}</span>
                                  </div>
                                  <Input
                                    placeholder="Milestone title"
                                    value={milestone.title}
                                    onChange={(e) => updateMilestone(milestone.id, { title: e.target.value })}
                                    className="font-medium"
                                  />
                                </div>
                                <button
                                  onClick={() => removeMilestone(milestone.id)}
                                  className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-all"
                                >
                                  <FiTrash2 size={16} />
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <label className="block text-xs font-medium text-text-muted mb-1">Amount</label>
                                  <div className="relative">
                                    <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                    <Input
                                      type="number"
                                      placeholder="0.00"
                                      value={milestone.amount}
                                      onChange={(e) => updateMilestone(milestone.id, { amount: parseFloat(e.target.value) })}
                                      className="pl-9 text-sm"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-text-muted mb-1">Release Date</label>
                                  <div className="relative">
                                    <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                    <Input
                                      type="date"
                                      value={milestone.releaseDate}
                                      onChange={(e) => updateMilestone(milestone.id, { releaseDate: e.target.value })}
                                      className="pl-9 text-sm"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
                                <textarea
                                  placeholder="Describe the milestone..."
                                  value={milestone.description}
                                  onChange={(e) => updateMilestone(milestone.id, { description: e.target.value })}
                                  className="w-full min-h-[60px] px-3 py-2 bg-surface2 border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none transition-colors resize-none"
                                />
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Protection Step */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Protection Settings</h3>
                        
                        <div className="space-y-4">
                          <Card padding="md">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-medium text-text-primary">Verification Required</h4>
                                <p className="text-xs text-text-muted mt-1">Require verification before milestone release</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={escrowData.requiresVerification}
                                  onChange={(e) => setEscrowData(prev => ({ ...prev, requiresVerification: e.target.checked }))}
                                />
                                <div className="w-10 h-5 bg-surface3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                              </label>
                            </div>
                            
                            {escrowData.requiresVerification && (
                              <div className="mt-4 pt-4 border-t border-border">
                                <label className="block text-xs font-medium text-text-muted mb-2">
                                  Verification Method
                                </label>
                                <select
                                  className="w-full h-10 px-4 bg-surface2 border border-border rounded-lg text-text-primary text-sm focus:border-primary focus:outline-none transition-colors"
                                  value={escrowData.verificationMethod}
                                  onChange={(e) => setEscrowData(prev => ({ ...prev, verificationMethod: e.target.value as any }))}
                                >
                                  <option value="PLATFORM">Platform Verification</option>
                                  <option value="COMMUNITY">Community Voting</option>
                                </select>
                              </div>
                            )}
                          </Card>

                          <Card padding="md">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-medium text-text-primary">Platform Fee</h4>
                                <p className="text-xs text-text-muted mt-1">Fee charged by the platform</p>
                              </div>
                              <span className="text-sm font-mono text-primary">2.5%</span>
                            </div>
                          </Card>

                          <Card padding="md">
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium text-text-primary">Timeline</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-text-muted mb-1">Start Date</label>
                                  <Input
                                    type="date"
                                    value={escrowData.startDate}
                                    onChange={(e) => setEscrowData(prev => ({ ...prev, startDate: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-text-muted mb-1">End Date</label>
                                  <Input
                                    type="date"
                                    value={escrowData.endDate}
                                    onChange={(e) => setEscrowData(prev => ({ ...prev, endDate: e.target.value }))}
                                  />
                                </div>
                              </div>
                            </div>
                          </Card>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Review Step */}
                  {currentStep === 4 && (
                    <div className="space-y-6">
                      <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                        <div className="flex items-start gap-3">
                          <FiAlertCircle className="text-warning mt-0.5" size={20} />
                          <div>
                            <h4 className="text-sm font-semibold text-text-primary">Review Before Deploying</h4>
                            <p className="text-xs text-text-secondary mt-1">
                              Please review all details carefully. Escrow contracts cannot be modified after deployment.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Card padding="md">
                          <h4 className="text-sm font-semibold text-text-primary mb-3">Deal Summary</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-text-muted">Project</span>
                              <span className="text-text-primary">{escrowData.projectName || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-text-muted">Type</span>
                              <span className="text-text-primary">{escrowData.dealType}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-text-muted">KOL</span>
                              <span className="text-text-primary font-mono">
                                {escrowData.kolAddress ? `${escrowData.kolAddress.slice(0, 6)}...${escrowData.kolAddress.slice(-4)}` : 'Not set'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-text-muted">Total Amount</span>
                              <span className="text-text-primary font-mono">
                                {escrowData.totalAmount} {escrowData.tokenSymbol}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-text-muted">Milestones</span>
                              <span className="text-text-primary">{escrowData.milestones.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-text-muted">Platform Fee</span>
                              <span className="text-text-primary">2.5%</span>
                            </div>
                          </div>
                        </Card>

                        <Card padding="md">
                          <h4 className="text-sm font-semibold text-text-primary mb-3">Protection Settings</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {escrowData.requiresVerification ? (
                                <FiCheckCircle className="text-success" size={16} />
                              ) : (
                                <FiAlertCircle className="text-text-muted" size={16} />
                              )}
                              <span className="text-sm text-text-secondary">
                                Verification {escrowData.requiresVerification ? 'Required' : 'Not Required'}
                              </span>
                            </div>
                          </div>
                        </Card>

                        {escrowData.milestones.length > 0 && (
                          <Card padding="md">
                            <h4 className="text-sm font-semibold text-text-primary mb-3">Milestones</h4>
                            <div className="space-y-2">
                              {escrowData.milestones.map((milestone, index) => (
                                <div key={milestone.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                      <span className="text-xs font-bold text-primary">{index + 1}</span>
                                    </div>
                                    <span className="text-sm text-text-primary">{milestone.title || 'Untitled'}</span>
                                  </div>
                                  <span className="text-sm font-mono text-text-secondary">
                                    {milestone.amount} {escrowData.tokenSymbol}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </Card>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-border flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={handlePrevStep}
                    disabled={currentStep === 0}
                    icon={<FiArrowLeft size={16} />}
                  >
                    Previous
                  </Button>

                  {currentStep === STEPS.length - 1 ? (
                    <Button
                      variant="primary"
                      onClick={handleDeploy}
                      disabled={isDeploying || !isConnected}
                      loading={isDeploying}
                      icon={<FiCheckCircle size={16} />}
                    >
                      {isDeploying ? 'Deploying...' : 'Deploy Escrow'}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={handleNextStep}
                      icon={<FiArrowRight size={16} />}
                    >
                      Next Step
                    </Button>
                  )}
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