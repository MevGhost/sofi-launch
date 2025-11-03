'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { MobileLayout, MobileCard } from './MobileLayout';
import { Button } from '@/components/alien/Button';
import { Input } from '@/components/alien/Input';
import { showToast } from '@/components/ToastProvider';
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
  FiAlertCircle
} from 'react-icons/fi';
import { cn } from '@/lib/utils';

interface Milestone {
  id: string;
  title: string;
  description: string;
  amount: number;
  deadline: string;
  deliverables: string[];
}

interface EscrowData {
  kolAddress: string;
  kolName: string;
  tokenAddress: string;
  tokenSymbol: string;
  totalAmount: string;
  description: string;
  milestones: Milestone[];
  disputeResolver: string;
  platformFee: string;
  requiresVerification: boolean;
  verificationThreshold: number;
  clawbackEnabled: boolean;
  clawbackDeadline: string;
}

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome',
    subtitle: 'Create secure agreement',
    icon: <FiShield size={20} />,
  },
  {
    id: 'parties',
    title: 'Parties',
    subtitle: 'Define participants',
    icon: <FiUsers size={20} />,
  },
  {
    id: 'milestones',
    title: 'Milestones',
    subtitle: 'Set deliverables',
    icon: <FiTarget size={20} />,
  },
  {
    id: 'protection',
    title: 'Protection',
    subtitle: 'Configure safeguards',
    icon: <FiLock size={20} />,
  },
  {
    id: 'review',
    title: 'Review',
    subtitle: 'Confirm details',
    icon: <FiCheckCircle size={20} />,
  },
];

const TOKENS = [
  { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USDC' },
  { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', name: 'WETH' },
  { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDT', name: 'USDT' },
];

export function MobileEscrowCreation() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  
  const [formData, setFormData] = useState<EscrowData>({
    kolAddress: '',
    kolName: '',
    tokenAddress: TOKENS[0].address,
    tokenSymbol: TOKENS[0].symbol,
    totalAmount: '',
    description: '',
    milestones: [],
    disputeResolver: address || '',
    platformFee: '2.5',
    requiresVerification: false,
    verificationThreshold: 1,
    clawbackEnabled: false,
    clawbackDeadline: '',
  });

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateEscrow = async () => {
    if (!isConnected) {
      showToast.error('Please connect wallet');
      return;
    }

    setIsCreating(true);
    
    // Simulate escrow creation
    setTimeout(() => {
      showToast.success('Escrow created successfully');
      router.push('/escrow/dashboard');
    }, 2000);
  };

  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: Date.now().toString(),
      title: '',
      description: '',
      amount: 0,
      deadline: '',
      deliverables: [''],
    };
    setFormData({
      ...formData,
      milestones: [...formData.milestones, newMilestone],
    });
  };

  const removeMilestone = (id: string) => {
    setFormData({
      ...formData,
      milestones: formData.milestones.filter(m => m.id !== id),
    });
  };

  const updateMilestone = (id: string, field: keyof Milestone, value: any) => {
    setFormData({
      ...formData,
      milestones: formData.milestones.map(m => 
        m.id === id ? { ...m, [field]: value } : m
      ),
    });
  };

  if (!isConnected) {
    return (
      <MobileLayout title="Create Escrow" showNav={false}>
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiShield className="text-primary" size={24} />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Connect Wallet
            </h2>
            <p className="text-sm text-text-secondary mb-6">
              Connect your wallet to create escrow
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Create Escrow" showNav={false}>
      <div className="min-h-screen pb-20">
        {/* Progress Steps */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-6">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center flex-1",
                  index <= currentStep ? "opacity-100" : "opacity-40"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-colors",
                    index <= currentStep
                      ? "bg-primary text-white"
                      : "bg-surface2 text-text-muted"
                  )}
                >
                  {step.icon}
                </div>
                <span className="text-[10px] text-text-muted hidden sm:block">
                  {step.title}
                </span>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "absolute w-full h-0.5 top-5 left-1/2 -z-10",
                      index < currentStep ? "bg-primary" : "bg-surface3"
                    )}
                    style={{ width: 'calc(100% - 40px)' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="px-4">
          {/* Welcome Step */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <MobileCard>
                <h2 className="text-lg font-semibold text-text-primary mb-2">
                  Create Secure Escrow
                </h2>
                <p className="text-sm text-text-secondary mb-4">
                  Set up a trustless escrow agreement on Base L2
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <FiCheckCircle className="text-success flex-shrink-0" size={20} />
                    <p className="text-sm text-text-secondary">
                      Milestone-based releases
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <FiCheckCircle className="text-success flex-shrink-0" size={20} />
                    <p className="text-sm text-text-secondary">
                      Built-in dispute resolution
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <FiCheckCircle className="text-success flex-shrink-0" size={20} />
                    <p className="text-sm text-text-secondary">
                      Automatic verification
                    </p>
                  </div>
                </div>
              </MobileCard>
            </div>
          )}

          {/* Parties Step */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <MobileCard>
                <h3 className="text-sm font-medium text-text-primary mb-4">
                  Deal Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">
                      KOL Address
                    </label>
                    <Input
                      placeholder="0x..."
                      value={formData.kolAddress}
                      onChange={(e) => setFormData({ ...formData, kolAddress: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">
                      KOL Name
                    </label>
                    <Input
                      placeholder="Enter KOL name"
                      value={formData.kolName}
                      onChange={(e) => setFormData({ ...formData, kolName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">
                      Token
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-text-primary text-sm"
                      value={formData.tokenAddress}
                      onChange={(e) => {
                        const token = TOKENS.find(t => t.address === e.target.value);
                        setFormData({
                          ...formData,
                          tokenAddress: e.target.value,
                          tokenSymbol: token?.symbol || '',
                        });
                      }}
                    >
                      {TOKENS.map(token => (
                        <option key={token.address} value={token.address}>
                          {token.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">
                      Total Amount
                    </label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={formData.totalAmount}
                      onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">
                      Description
                    </label>
                    <textarea
                      className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-text-primary text-sm resize-none"
                      rows={3}
                      placeholder="Describe the agreement"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
              </MobileCard>
            </div>
          )}

          {/* Milestones Step */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-text-primary">
                  Milestones
                </h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={addMilestone}
                  icon={<FiPlus size={16} />}
                >
                  Add
                </Button>
              </div>

              {formData.milestones.length === 0 ? (
                <MobileCard>
                  <div className="text-center py-6">
                    <FiTarget className="text-text-muted mx-auto mb-3" size={32} />
                    <p className="text-sm text-text-secondary mb-3">
                      No milestones yet
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={addMilestone}
                      icon={<FiPlus size={16} />}
                    >
                      Add First Milestone
                    </Button>
                  </div>
                </MobileCard>
              ) : (
                <div className="space-y-3">
                  {formData.milestones.map((milestone, index) => (
                    <MobileCard key={milestone.id}>
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-sm font-medium text-text-primary">
                          Milestone {index + 1}
                        </h4>
                        <button
                          onClick={() => removeMilestone(milestone.id)}
                          className="p-1 text-danger hover:bg-danger/10 rounded transition-colors"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <Input
                          placeholder="Milestone title"
                          value={milestone.title}
                          onChange={(e) => updateMilestone(milestone.id, 'title', e.target.value)}
                        />
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={milestone.amount}
                          onChange={(e) => updateMilestone(milestone.id, 'amount', parseFloat(e.target.value))}
                        />
                        <Input
                          type="date"
                          placeholder="Deadline"
                          value={milestone.deadline}
                          onChange={(e) => updateMilestone(milestone.id, 'deadline', e.target.value)}
                        />
                      </div>
                    </MobileCard>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Protection Step */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <MobileCard>
                <h3 className="text-sm font-medium text-text-primary mb-4">
                  Protection Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-primary">Verification Required</p>
                      <p className="text-xs text-text-muted">Require approval for releases</p>
                    </div>
                    <button
                      onClick={() => setFormData({ ...formData, requiresVerification: !formData.requiresVerification })}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        formData.requiresVerification ? "bg-primary" : "bg-surface3"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform",
                        formData.requiresVerification ? "translate-x-6" : "translate-x-0.5"
                      )} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-primary">Enable Clawback</p>
                      <p className="text-xs text-text-muted">Allow fund recovery</p>
                    </div>
                    <button
                      onClick={() => setFormData({ ...formData, clawbackEnabled: !formData.clawbackEnabled })}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        formData.clawbackEnabled ? "bg-primary" : "bg-surface3"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform",
                        formData.clawbackEnabled ? "translate-x-6" : "translate-x-0.5"
                      )} />
                    </button>
                  </div>

                  <div>
                    <label className="text-xs text-text-muted mb-1 block">
                      Platform Fee
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={formData.platformFee}
                        onChange={(e) => setFormData({ ...formData, platformFee: e.target.value })}
                        disabled
                      />
                      <span className="text-sm text-text-muted">%</span>
                    </div>
                  </div>
                </div>
              </MobileCard>
            </div>
          )}

          {/* Review Step */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <MobileCard>
                <h3 className="text-sm font-medium text-text-primary mb-4">
                  Review Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">KOL</span>
                    <span className="text-text-primary">{formData.kolName || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Token</span>
                    <span className="text-text-primary">{formData.tokenSymbol}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Total Amount</span>
                    <span className="text-text-primary">{formData.totalAmount || '0'} {formData.tokenSymbol}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Milestones</span>
                    <span className="text-text-primary">{formData.milestones.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Platform Fee</span>
                    <span className="text-text-primary">{formData.platformFee}%</span>
                  </div>
                </div>
              </MobileCard>

              <div className="p-3 bg-warning/10 rounded-lg">
                <div className="flex gap-2">
                  <FiAlertCircle className="text-warning flex-shrink-0" size={16} />
                  <p className="text-xs text-warning">
                    Review all details carefully. Escrow terms cannot be changed after creation.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="fixed bottom-0 left-0 right-0 bg-surface1 border-t border-border p-4">
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                variant="secondary"
                onClick={handleBack}
                icon={<FiArrowLeft size={16} />}
                className="flex-1 justify-center"
              >
                Back
              </Button>
            )}
            {currentStep < STEPS.length - 1 ? (
              <Button
                variant="primary"
                onClick={handleNext}
                icon={<FiArrowRight size={16} />}
                className="flex-1 justify-center"
              >
                Next
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleCreateEscrow}
                loading={isCreating}
                className="flex-1 justify-center"
              >
                Create Escrow
              </Button>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}