'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { formatTokenAmount } from '@/lib/format';

interface EscrowHeaderProps {
  escrow: any;
  userRole: string | null;
  onAction: (action: string) => void;
}

export function EscrowHeader({ escrow, userRole, onAction }: EscrowHeaderProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'PENDING_FUNDING': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'COMPLETED': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'DISPUTED': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'CANCELLED': return 'text-text-muted bg-gray-500/10 border-gray-500/30';
      default: return 'text-text-primary/60 bg-surface3 border-border';
    }
  };

  const progress = (parseFloat(escrow.releasedAmount) / parseFloat(escrow.totalAmount)) * 100;

  return (
    <div className="bg-gradient-to-b from-white/[0.08] to-white/[0.03] backdrop-blur-xl border border-white/[0.1] rounded-2xl p-6">
      {/* Top Row */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#0EA5E9] to-[#3FB5E9]">
              Escrow #{escrow.id.slice(-6).toUpperCase()}
            </h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(escrow.status)}`}>
              {escrow.status.replace(/_/g, ' ')}
            </span>
            {escrow.disputeActive && (
              <span className="px-3 py-1 rounded-full text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/30">
                DISPUTED
              </span>
            )}
          </div>
          
          {escrow.description && (
            <p className="text-text-primary/60 max-w-2xl">{escrow.description}</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          {userRole === 'creator' && escrow.status === 'PENDING_FUNDING' && (
            <button
              onClick={() => onAction('fund')}
              className="px-4 py-2 bg-gradient-to-r from-[#0052FF] to-[#0EA5E9] rounded-lg text-text-primary font-medium hover:from-[#0047E0] hover:to-[#0A96D4] transition-all"
            >
              Fund Escrow
            </button>
          )}
          
          {userRole === 'creator' && escrow.status === 'DRAFT' && (
            <button
              onClick={() => onAction('cancel')}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 font-medium transition-all"
            >
              Cancel
            </button>
          )}

          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
            }}
            className="p-2 bg-surface3 hover:bg-surface2 border border-white/[0.1] rounded-lg text-text-primary/60 hover:text-text-primary transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 0A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326" />
            </svg>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface2 border border-border rounded-lg p-4">
          <span className="text-text-primary/40 text-xs">TOTAL AMOUNT</span>
          <p className="text-xl font-semibold text-text-primary mt-1">
            {formatTokenAmount(escrow.totalAmount, escrow.tokenDecimals)} {escrow.tokenSymbol}
          </p>
        </div>
        
        <div className="bg-surface2 border border-border rounded-lg p-4">
          <span className="text-text-primary/40 text-xs">RELEASED</span>
          <p className="text-xl font-semibold text-[#0EA5E9] mt-1">
            {formatTokenAmount(escrow.releasedAmount, escrow.tokenDecimals)} {escrow.tokenSymbol}
          </p>
        </div>
        
        <div className="bg-surface2 border border-border rounded-lg p-4">
          <span className="text-text-primary/40 text-xs">REMAINING</span>
          <p className="text-xl font-semibold text-[#3FB5E9] mt-1">
            {formatTokenAmount(
              (parseFloat(escrow.totalAmount) - parseFloat(escrow.releasedAmount)).toString(),
              escrow.tokenDecimals
            )} {escrow.tokenSymbol}
          </p>
        </div>
        
        <div className="bg-surface2 border border-border rounded-lg p-4">
          <span className="text-text-primary/40 text-xs">MILESTONES</span>
          <p className="text-xl font-semibold text-text-primary mt-1">
            {escrow.milestones.filter((m: any) => m.status === 'RELEASED').length} / {escrow.milestones.length}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-text-primary/60 text-sm">Overall Progress</span>
          <span className="text-text-primary font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="relative h-3 bg-surface3 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#0052FF] to-[#0EA5E9]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </motion.div>
          
          {/* Milestone markers */}
          {escrow.milestones.map((milestone: any, index: number) => {
            const position = ((index + 1) / escrow.milestones.length) * 100;
            return (
              <div
                key={milestone.id}
                className="absolute top-1/2 -translate-y-1/2 w-1 h-5 bg-surface3"
                style={{ left: `${position}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex items-center justify-between mt-4 text-sm">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-text-primary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-text-primary/60">
            Started {new Date(escrow.startDate).toLocaleDateString()}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-text-primary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-text-primary/60">
            Ends {new Date(escrow.endDate).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}