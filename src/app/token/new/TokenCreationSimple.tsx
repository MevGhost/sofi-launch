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
import { useTokenTrading } from '@/hooks/useTokens';
import {
  FiZap,
  FiTag,
  FiFileText,
  FiImage,
  FiTwitter,
  FiMessageCircle,
  FiGlobe,
  FiTrendingUp,
  FiCheckCircle
} from 'react-icons/fi';

interface TokenFormData {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  twitter: string;
  telegram: string;
  website: string;
  totalSupply: string;
  bondingCurveType: 'constant' | 'linear' | 'exponential';
}

export default function TokenCreationSimple() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { createToken, loading } = useTokenTrading();
  
  const [formData, setFormData] = useState<TokenFormData>({
    name: '',
    symbol: '',
    description: '',
    imageUrl: '',
    twitter: '',
    telegram: '',
    website: '',
    totalSupply: '1000000000', // 1 billion default
    bondingCurveType: 'constant'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) newErrors.name = 'Token name is required';
    if (!formData.symbol) newErrors.symbol = 'Token symbol is required';
    if (formData.symbol && formData.symbol.length > 8) {
      newErrors.symbol = 'Symbol must be 8 characters or less';
    }
    
    // Validate URLs if provided
    if (formData.website && !formData.website.match(/^https?:\/\/.+/)) {
      newErrors.website = 'Invalid website URL';
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
      const token = await createToken({
        name: formData.name,
        symbol: formData.symbol.toUpperCase(),
        description: formData.description,
        imageUrl: formData.imageUrl,
        twitter: formData.twitter,
        telegram: formData.telegram,
        website: formData.website,
        totalSupply: formData.totalSupply,
        bondingCurveType: formData.bondingCurveType,
      });

      showToast.success('Token created successfully!');
      router.push(`/token/${token.address}`);
    } catch (error: any) {
      console.error('Error creating token:', error);
      showToast.error(error.message || 'Failed to create token');
    }
  };

  const updateField = (field: keyof TokenFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
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
              Create Your Token
            </h1>
            <p className="text-text-muted">
              Launch your token on Base with a bonding curve mechanism
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              {/* Token Identity */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FiTag className="text-primary" size={20} />
                    <h2 className="text-lg font-semibold text-text-primary">Token Identity</h2>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-muted mb-2">
                        Token Name *
                      </label>
                      <Input
                        placeholder="e.g., MoonShot Token"
                        value={formData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        error={errors.name}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-text-muted mb-2">
                        Token Symbol *
                      </label>
                      <Input
                        placeholder="e.g., MOON"
                        value={formData.symbol}
                        onChange={(e) => updateField('symbol', e.target.value.toUpperCase())}
                        maxLength={8}
                        error={errors.symbol}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm text-text-muted mb-2">
                      Description
                    </label>
                    <textarea
                      className="w-full px-4 py-3 bg-surface2 border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors resize-none"
                      placeholder="Describe your token's purpose and vision..."
                      value={formData.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm text-text-muted mb-2">
                      Token Image URL
                    </label>
                    <Input
                      placeholder="https://example.com/token-logo.png"
                      value={formData.imageUrl}
                      onChange={(e) => updateField('imageUrl', e.target.value)}
                      icon={<FiImage size={18} />}
                    />
                  </div>
                </div>
              </Card>

              {/* Tokenomics */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FiTrendingUp className="text-primary" size={20} />
                    <h2 className="text-lg font-semibold text-text-primary">Tokenomics</h2>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-muted mb-2">
                        Total Supply
                      </label>
                      <Input
                        type="number"
                        placeholder="1000000000"
                        value={formData.totalSupply}
                        onChange={(e) => updateField('totalSupply', e.target.value)}
                      />
                      <p className="text-xs text-text-muted mt-1">Default: 1 billion tokens</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-text-muted mb-2">
                        Bonding Curve Type
                      </label>
                      <select
                        className="w-full px-4 py-3 bg-surface2 border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary transition-colors"
                        value={formData.bondingCurveType}
                        onChange={(e) => updateField('bondingCurveType', e.target.value as any)}
                      >
                        <option value="constant">Constant Product (x*y=k)</option>
                        <option value="linear">Linear Curve</option>
                        <option value="exponential">Exponential Curve</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-surface1 rounded-lg border border-border">
                    <p className="text-sm text-text-muted">
                      <strong className="text-text-primary">Note:</strong> Your token will start with a bonding curve mechanism. 
                      When it reaches $69,000 market cap, it will automatically graduate to Uniswap V3 with locked liquidity.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Social Links */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FiGlobe className="text-primary" size={20} />
                    <h2 className="text-lg font-semibold text-text-primary">Social Links</h2>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-text-muted mb-2">
                        Twitter
                      </label>
                      <Input
                        placeholder="@yourtoken"
                        value={formData.twitter}
                        onChange={(e) => updateField('twitter', e.target.value)}
                        icon={<FiTwitter size={18} />}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-text-muted mb-2">
                        Telegram
                      </label>
                      <Input
                        placeholder="t.me/yourtoken"
                        value={formData.telegram}
                        onChange={(e) => updateField('telegram', e.target.value)}
                        icon={<FiMessageCircle size={18} />}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-text-muted mb-2">
                        Website
                      </label>
                      <Input
                        placeholder="https://yourtoken.com"
                        value={formData.website}
                        onChange={(e) => updateField('website', e.target.value)}
                        icon={<FiGlobe size={18} />}
                        error={errors.website}
                      />
                    </div>
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
                      <span className="text-text-muted">Launch Fee</span>
                      <span className="text-text-primary font-mono">0.02 ETH</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted">Trading Fee</span>
                      <span className="text-text-primary font-mono">1%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted">Creator Revenue Share</span>
                      <span className="text-text-primary font-mono">1% of all trades</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/browse')}
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={loading || !isConnected}
                  loading={loading}
                  icon={<FiZap size={18} />}
                  className="flex-1"
                >
                  {!isConnected ? 'Connect Wallet' : loading ? 'Creating Token...' : 'Launch Token (0.02 ETH)'}
                </Button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </LayoutShell>
  );
}