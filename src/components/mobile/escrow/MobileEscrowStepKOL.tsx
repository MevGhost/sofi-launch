'use client';

import React, { useState } from 'react';
import { FiSearch, FiUser, FiTwitter, FiGlobe, FiMessageCircle, FiCheckCircle, FiCopy, FiExternalLink } from 'react-icons/fi';

interface KOLSelectionStepProps {
  formData: {
    kolAddress: string;
    kolName: string;
    kolSocials: {
      twitter?: string;
      telegram?: string;
      website?: string;
    };
  };
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

const FEATURED_KOLS = [
  {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8',
    name: 'CryptoInfluencer',
    avatar: '🎯',
    followers: '125K',
    verified: true,
    socials: {
      twitter: 'cryptoinfluencer',
      telegram: 'cryptoinfluencer',
    }
  },
  {
    address: '0x5aAeb6053f3E94C9b9A09f33669435E7Ef1BeAed',
    name: 'DeFiGuru',
    avatar: 'K',
    followers: '89K',
    verified: true,
    socials: {
      twitter: 'defiguru',
      website: 'defiguru.io',
    }
  },
  {
    address: '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359',
    name: 'NFTMaster',
    avatar: '🎨',
    followers: '203K',
    verified: false,
    socials: {
      twitter: 'nftmaster',
    }
  },
];

export function MobileEscrowStepKOL({ formData, onChange, errors }: KOLSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  const handleSelectKOL = (kol: typeof FEATURED_KOLS[0]) => {
    onChange('kolAddress', kol.address);
    onChange('kolName', kol.name);
    onChange('kolSocials', kol.socials);
    setShowManualEntry(false);
  };

  const filteredKOLs = FEATURED_KOLS.filter(kol =>
    kol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kol.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="px-4 pb-24 space-y-6">
      {/* FiSearch */}
      <div className="relative">
        <FiSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search KOLs or enter address..."
          className="w-full pl-11 pr-4 py-3 bg-surface3 border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Toggle Manual Entry */}
      <button
        type="button"
        onClick={() => setShowManualEntry(!showManualEntry)}
        className="w-full px-4 py-3 bg-surface2 border border-border rounded-xl text-text-primary font-medium hover:bg-surface3 transition-colors"
      >
        {showManualEntry ? 'Browse Featured KOLs' : 'Enter Address Manually'}
      </button>

      {showManualEntry ? (
        <>
          {/* Manual Entry */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              KOL FiDollarSign Address *
            </label>
            <input
              type="text"
              value={formData.kolAddress}
              onChange={(e) => onChange('kolAddress', e.target.value)}
              placeholder="0x..."
              className={`w-full px-4 py-3 bg-surface3 border ${
                errors.kolAddress ? 'border-danger' : 'border-border'
              } rounded-xl text-text-primary font-mono text-sm placeholder-text-muted focus:outline-none focus:border-primary transition-colors`}
            />
            {errors.kolAddress && (
              <p className="text-xs text-danger mt-1">{errors.kolAddress}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              KOL Name
            </label>
            <input
              type="text"
              value={formData.kolName}
              onChange={(e) => onChange('kolName', e.target.value)}
              placeholder="Display name (optional)"
              className="w-full px-4 py-3 bg-surface3 border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Social Links */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-text-primary">
              Social Links (Optional)
            </label>
            
            <div className="relative">
              <FiTwitter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={formData.kolSocials.twitter || ''}
                onChange={(e) => onChange('kolSocials', { ...formData.kolSocials, twitter: e.target.value })}
                placeholder="Twitter username"
                className="w-full pl-11 pr-4 py-3 bg-surface3 border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="relative">
              <FiMessageCircle size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={formData.kolSocials.telegram || ''}
                onChange={(e) => onChange('kolSocials', { ...formData.kolSocials, telegram: e.target.value })}
                placeholder="Telegram username"
                className="w-full pl-11 pr-4 py-3 bg-surface3 border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="relative">
              <FiGlobe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={formData.kolSocials.website || ''}
                onChange={(e) => onChange('kolSocials', { ...formData.kolSocials, website: e.target.value })}
                placeholder="Website URL"
                className="w-full pl-11 pr-4 py-3 bg-surface3 border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Featured KOLs */}
          <div className="space-y-3">
            {filteredKOLs.map((kol) => (
              <button
                key={kol.address}
                type="button"
                onClick={() => handleSelectKOL(kol)}
                className={`w-full p-4 bg-surface2 border ${
                  formData.kolAddress === kol.address ? 'border-primary' : 'border-border'
                } rounded-xl hover:border-primary/50 transition-all text-left`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-2xl">
                    {kol.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">{kol.name}</span>
                      {kol.verified && (
                        <FiCheckCircle size={16} className="text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-text-muted font-mono mt-0.5">
                      {kol.address.slice(0, 6)}...{kol.address.slice(-4)}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-text-muted">{kol.followers} followers</span>
                      {kol.socials.twitter && (
                        <span className="text-xs text-primary">@{kol.socials.twitter}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filteredKOLs.length === 0 && (
            <div className="text-center py-8">
              <FiUser size={48} className="text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-muted">No KOLs found</p>
              <button
                type="button"
                onClick={() => setShowManualEntry(true)}
                className="text-sm text-primary mt-2"
              >
                Enter address manually
              </button>
            </div>
          )}
        </>
      )}

      {/* Selected KOL Display */}
      {formData.kolAddress && !showManualEntry && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-primary">Selected KOL</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(formData.kolAddress);
              }}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <FiCopy size={14} />
            </button>
          </div>
          <p className="font-medium text-text-primary">{formData.kolName || 'Unknown'}</p>
          <p className="text-xs text-text-muted font-mono">
            {formData.kolAddress}
          </p>
        </div>
      )}
    </div>
  );
}