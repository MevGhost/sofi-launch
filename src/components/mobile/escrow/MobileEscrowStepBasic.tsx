'use client';

import React from 'react';
import { FiInfo, FiDollarSign, FiFileText, FiHash } from 'react-icons/fi';

interface BasicInfoStepProps {
  formData: {
    title: string;
    description: string;
    category: string;
    tokenAddress: string;
    tokenSymbol: string;
    totalAmount: string;
  };
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

const CATEGORIES = [
  { id: 'marketing', label: 'Marketing', icon: '📢' },
  { id: 'development', label: 'Development', icon: '💻' },
  { id: 'content', label: 'Content', icon: '✍️' },
  { id: 'advisory', label: 'Advisory', icon: '🎯' },
  { id: 'other', label: 'Other', icon: '📦' },
];

const TOKENS = [
  { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USD Coin' },
  { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', name: 'Wrapped ETH' },
  { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', symbol: 'DAI', name: 'Dai Stablecoin' },
];

export function MobileEscrowStepBasic({ formData, onChange, errors }: BasicInfoStepProps) {
  return (
    <div className="px-4 pb-24 space-y-6">
      {/* Info Card */}
      <div className="bg-surface2 rounded-xl p-4 border border-border">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FiInfo size={16} className="text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-text-primary">Getting Started</h4>
            <p className="text-xs text-text-muted mt-1">
              Provide basic information about your escrow agreement
            </p>
          </div>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Escrow Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="e.g., Q1 2024 Marketing Campaign"
          className={`w-full px-4 py-3 bg-surface3 border ${
            errors.title ? 'border-danger' : 'border-border'
          } rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors`}
        />
        {errors.title && (
          <p className="text-xs text-danger mt-1">{errors.title}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Category *
        </label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange('category', cat.id)}
              className={`p-3 rounded-xl border transition-all ${
                formData.category === cat.id
                  ? 'bg-primary/10 border-primary text-text-primary'
                  : 'bg-surface3 border-border text-text-muted'
              }`}
            >
              <div className="text-lg mb-1">{cat.icon}</div>
              <div className="text-xs font-medium">{cat.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Description *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Describe the scope of work..."
          rows={4}
          className={`w-full px-4 py-3 bg-surface3 border ${
            errors.description ? 'border-danger' : 'border-border'
          } rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors resize-none`}
        />
        {errors.description && (
          <p className="text-xs text-danger mt-1">{errors.description}</p>
        )}
      </div>

      {/* Token Selection */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Payment Token *
        </label>
        <select
          value={formData.tokenAddress}
          onChange={(e) => {
            const token = TOKENS.find(t => t.address === e.target.value);
            if (token) {
              onChange('tokenAddress', token.address);
              onChange('tokenSymbol', token.symbol);
            }
          }}
          className="w-full px-4 py-3 bg-surface3 border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary transition-colors"
        >
          {TOKENS.map((token) => (
            <option key={token.address} value={token.address}>
              {token.symbol} - {token.name}
            </option>
          ))}
        </select>
      </div>

      {/* Total Amount */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Total Amount *
        </label>
        <div className="relative">
          <FiDollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="number"
            value={formData.totalAmount}
            onChange={(e) => onChange('totalAmount', e.target.value)}
            placeholder="0.00"
            step="0.01"
            className={`w-full pl-10 pr-16 py-3 bg-surface3 border ${
              errors.totalAmount ? 'border-danger' : 'border-border'
            } rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors`}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">
            {formData.tokenSymbol}
          </span>
        </div>
        {errors.totalAmount && (
          <p className="text-xs text-danger mt-1">{errors.totalAmount}</p>
        )}
      </div>
    </div>
  );
}