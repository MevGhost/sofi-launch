'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { showToast } from '@/components/ToastProvider';
import { LayoutShell } from '@/components/alien/Layout';
import { Button } from '@/components/alien/Button';
import { Card } from '@/components/alien/Card';
import { Input } from '@/components/alien/Input';
import { useEscrowContract } from '@/hooks/useEscrows';
import {
  FiShield,
  FiUsers,
  FiTarget,
  FiCalendar,
  FiDollarSign,
  FiPlus,
  FiTrash2,
  FiCheckCircle
} from 'react-icons/fi';

interface Milestone {
  title: string;
  description: string;
  amount: string;
  releaseDate: string;
  conditions: string[];
}

interface EscrowFormData {
  projectName: string;
  dealType: string;
  dealDescription: string;
  kolAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  totalAmount: string;
  startDate: string;
  endDate: string;
  milestones: Milestone[];
  requireVerification: boolean;
  verificationMethod: 'NONE' | 'COMMUNITY' | 'PLATFORM';
  verifierAddresses: string[];
}

const DEAL_TYPES = [
  'MARKETING',
  'DEVELOPMENT',
  'PARTNERSHIP',
  'ADVISORY',
  'OTHER'
];

export default function EscrowCreationSimple() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { createEscrow, loading } = useEscrowContract();
  
  const [formData, setFormData] = useState<EscrowFormData>({
    projectName: '',
    dealType: 'MARKETING',
    dealDescription: '',
    kolAddress: '',
    tokenAddress: '',
    tokenSymbol: '',
    tokenDecimals: 18,
    totalAmount: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    milestones: [
      {
        title: '',
        description: '',
        amount: '',
        releaseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        conditions: []
      }
    ],
    requireVerification: false,
    verificationMethod: 'NONE',
    verifierAddresses: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.projectName) newErrors.projectName = 'Project name is required';
    if (!formData.kolAddress) newErrors.kolAddress = 'KOL address is required';
    if (!formData.tokenAddress) newErrors.tokenAddress = 'Token address is required';
    if (!formData.tokenSymbol) newErrors.tokenSymbol = 'Token symbol is required';
    if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
      newErrors.totalAmount = 'Valid total amount is required';
    }

    // Validate milestones
    let totalMilestoneAmount = 0;
    formData.milestones.forEach((milestone, index) => {
      if (!milestone.title) newErrors[`milestone_${index}_title`] = 'Milestone title is required';
      if (!milestone.amount || parseFloat(milestone.amount) <= 0) {
        newErrors[`milestone_${index}_amount`] = 'Valid amount is required';
      } else {
        totalMilestoneAmount += parseFloat(milestone.amount);
      }
    });

    // Check if milestone amounts sum up to total
    if (totalMilestoneAmount !== parseFloat(formData.totalAmount || '0')) {
      newErrors.milestones = `Milestone amounts must sum to ${formData.totalAmount}`;
    }

    // Validate addresses
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (formData.kolAddress && !addressRegex.test(formData.kolAddress)) {
      newErrors.kolAddress = 'Invalid Ethereum address';
    }
    if (formData.tokenAddress && !addressRegex.test(formData.tokenAddress)) {
      newErrors.tokenAddress = 'Invalid token address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      showToast.error('Please connect your wallet first');
      return;
    }

    if (!validateForm()) {
      showToast.error('Please fix the errors in the form');
      return;
    }

    try {
      const txHash = await createEscrow({
        projectName: formData.projectName,
        dealType: formData.dealType,
        dealDescription: formData.dealDescription,
        kolAddress: formData.kolAddress,
        tokenAddress: formData.tokenAddress,
        tokenSymbol: formData.tokenSymbol,
        totalAmount: formData.totalAmount,
        milestones: formData.milestones.map(m => ({
          title: m.title,
          description: m.description,
          amount: m.amount,
          releaseDate: m.releaseDate,
          conditions: m.conditions,
          percentage: (parseFloat(m.amount) / parseFloat(formData.totalAmount)) * 100,
          status: 'pending' as const,
          deadline: m.releaseDate,
          released: false,
          verified: false
        })),
        startDate: formData.startDate,
        endDate: formData.endDate,
        requiresVerification: formData.requireVerification,
        verificationMethod: formData.verificationMethod,
        verifierAddresses: formData.verifierAddresses
      });

      showToast.success('Escrow created successfully!');
      router.push('/escrow/dashboard');
    } catch (error: any) {
      console.error('Error creating escrow:', error);
      showToast.error(error.message || 'Failed to create escrow');
    }
  };

  const updateField = (field: keyof EscrowFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addMilestone = () => {
    setFormData(prev => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        {
          title: '',
          description: '',
          amount: '',
          releaseDate: new Date(Date.now() + (prev.milestones.length + 1) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          conditions: []
        }
      ]
    }));
  };

  const removeMilestone = (index: number) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: any) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map((m, i) => 
        i === index ? { ...m, [field]: value } : m
      )
    }));
    // Clear milestone error
    const errorKey = `milestone_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };

  return (
    <LayoutShell>
      <div className="p-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Create Escrow Agreement
            </h1>
            <p className="text-text-muted">
              Set up a secure milestone-based payment agreement
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              {/* Project Details */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FiShield className="text-primary" size={20} />
                    <h2 className="text-lg font-semibold text-text-primary">Project Details</h2>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-muted mb-2">
                        Project Name *
                      </label>
                      <Input
                        placeholder="e.g., MoonShot Marketing Campaign"
                        value={formData.projectName}
                        onChange={(e) => updateField('projectName', e.target.value)}
                        error={errors.projectName}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-text-muted mb-2">
                        Deal Type *
                      </label>
                      <select
                        className="w-full px-4 py-3 bg-surface2 border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary transition-colors"
                        value={formData.dealType}
                        onChange={(e) => updateField('dealType', e.target.value)}
                      >
                        {DEAL_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm text-text-muted mb-2">
                      Deal Description
                    </label>
                    <textarea
                      className="w-full px-4 py-3 bg-surface2 border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors resize-none"
                      placeholder="Describe the scope of work and deliverables..."
                      value={formData.dealDescription}
                      onChange={(e) => updateField('dealDescription', e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
              </Card>

              {/* Parties & Payment */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FiUsers className="text-primary" size={20} />
                    <h2 className="text-lg font-semibold text-text-primary">Parties & Payment</h2>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-muted mb-2">
                        KOL/Service Provider Address *
                      </label>
                      <Input
                        placeholder="0x..."
                        value={formData.kolAddress}
                        onChange={(e) => updateField('kolAddress', e.target.value)}
                        error={errors.kolAddress}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-text-muted mb-2">
                        Token Address *
                      </label>
                      <Input
                        placeholder="0x..."
                        value={formData.tokenAddress}
                        onChange={(e) => updateField('tokenAddress', e.target.value)}
                        error={errors.tokenAddress}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-text-muted mb-2">
                        Token Symbol *
                      </label>
                      <Input
                        placeholder="e.g., MOON"
                        value={formData.tokenSymbol}
                        onChange={(e) => updateField('tokenSymbol', e.target.value)}
                        error={errors.tokenSymbol}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-text-muted mb-2">
                        Total Amount *
                      </label>
                      <Input
                        type="number"
                        placeholder="10000"
                        value={formData.totalAmount}
                        onChange={(e) => updateField('totalAmount', e.target.value)}
                        error={errors.totalAmount}
                        icon={<FiDollarSign size={18} />}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-text-muted mb-2">
                        Start Date
                      </label>
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => updateField('startDate', e.target.value)}
                        icon={<FiCalendar size={18} />}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-text-muted mb-2">
                        End Date
                      </label>
                      <Input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => updateField('endDate', e.target.value)}
                        icon={<FiCalendar size={18} />}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Milestones */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FiTarget className="text-primary" size={20} />
                      <h2 className="text-lg font-semibold text-text-primary">Milestones</h2>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={addMilestone}
                      icon={<FiPlus size={16} />}
                    >
                      Add Milestone
                    </Button>
                  </div>

                  {errors.milestones && (
                    <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg">
                      <p className="text-sm text-danger">{errors.milestones}</p>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    {formData.milestones.map((milestone, index) => (
                      <div key={index} className="p-4 bg-surface1 rounded-lg border border-border">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-sm font-semibold text-text-primary">
                            Milestone {index + 1}
                          </h3>
                          {formData.milestones.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMilestone(index)}
                              className="text-danger hover:text-danger/80 transition-colors"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-text-muted mb-1">
                              Title *
                            </label>
                            <Input
                              placeholder="e.g., Campaign Kickoff"
                              value={milestone.title}
                              onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                              error={errors[`milestone_${index}_title`]}
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-text-muted mb-1">
                              Amount *
                            </label>
                            <Input
                              type="number"
                              placeholder="5000"
                              value={milestone.amount}
                              onChange={(e) => updateMilestone(index, 'amount', e.target.value)}
                              error={errors[`milestone_${index}_amount`]}
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-text-muted mb-1">
                              Release Date
                            </label>
                            <Input
                              type="date"
                              value={milestone.releaseDate}
                              onChange={(e) => updateMilestone(index, 'releaseDate', e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-text-muted mb-1">
                              Description
                            </label>
                            <Input
                              placeholder="Deliverables and success criteria"
                              value={milestone.description}
                              onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Platform Fees */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FiCheckCircle className="text-primary" size={20} />
                    <h2 className="text-lg font-semibold text-text-primary">Platform Fees</h2>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted">Platform Fee</span>
                      <span className="text-text-primary font-mono">2.5% of total</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted">Milestone Release</span>
                      <span className="text-text-primary font-mono">Manual approval required</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted">Dispute Resolution</span>
                      <span className="text-text-primary font-mono">Platform mediation available</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/escrow/dashboard')}
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={loading || !isConnected}
                  loading={loading}
                  icon={<FiShield size={18} />}
                  className="flex-1"
                >
                  {!isConnected ? 'Connect Wallet' : loading ? 'Creating Escrow...' : 'Create Escrow Agreement'}
                </Button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </LayoutShell>
  );
}