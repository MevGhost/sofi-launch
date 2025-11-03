'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { formatTokenAmount } from '@/lib/format';

interface EscrowActionsProps {
  escrow: any;
  userRole: string | null;
  onClaim: () => void;
  onDispute: () => void;
  onEmergencyWithdraw: () => void;
  loading?: boolean;
}

export function EscrowActions({
  escrow,
  userRole,
  onClaim,
  onDispute,
  onEmergencyWithdraw,
  loading
}: EscrowActionsProps) {
  const hasClaimableFunds = () => {
    if (userRole !== 'kol') return false;
    
    // Check if any milestones are released but not claimed
    const releasedMilestones = escrow.milestones.filter((m: any) => m.status === 'RELEASED');
    return releasedMilestones.length > 0;
  };

  const getClaimableAmount = () => {
    const releasedMilestones = escrow.milestones.filter((m: any) => m.status === 'RELEASED');
    const total = releasedMilestones.reduce((sum: number, m: any) => sum + parseFloat(m.amount), 0);
    return total.toString();
  };

  const canRaiseDispute = () => {
    return (userRole === 'creator' || userRole === 'kol') && 
           escrow.status === 'ACTIVE' && 
           !escrow.disputeActive;
  };

  const canEmergencyWithdraw = () => {
    return userRole === 'creator' && 
           (escrow.status === 'DRAFT' || escrow.status === 'PENDING_FUNDING');
  };

  return (
    <div className="bg-gradient-to-b from-[#0052FF]/10 to-[#0EA5E9]/10 backdrop-blur-xl border border-[#0052FF]/30 rounded-2xl p-6">
      <h3 className="text-text-primary font-medium mb-4">Actions</h3>
      
      <div className="space-y-3">
        {/* Claim Funds */}
        {hasClaimableFunds() && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-surface3 border border-white/[0.1] rounded-lg p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-primary/60 text-sm">Claimable Amount</span>
                <span className="text-green-400 font-semibold">
                  {formatTokenAmount(getClaimableAmount(), escrow.tokenDecimals)} {escrow.tokenSymbol}
                </span>
              </div>
              <p className="text-text-primary/40 text-xs mb-3">
                Funds from released milestones are ready to claim
              </p>
              <button
                onClick={onClaim}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg text-text-primary font-medium hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/20"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Claiming...
                  </div>
                ) : (
                  'Claim Funds'
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Fund Escrow */}
        {userRole === 'creator' && escrow.status === 'PENDING_FUNDING' && (
          <button
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-[#0052FF] to-[#0EA5E9] rounded-lg text-text-primary font-medium hover:from-[#0047E0] hover:to-[#0A96D4] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Fund Escrow
          </button>
        )}

        {/* Raise Dispute */}
        {canRaiseDispute() && (
          <button
            onClick={onDispute}
            disabled={loading}
            className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 font-medium transition-all"
          >
            Raise Dispute
          </button>
        )}

        {/* Emergency Withdraw */}
        {canEmergencyWithdraw() && (
          <button
            onClick={onEmergencyWithdraw}
            disabled={loading}
            className="w-full py-3 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-orange-400 font-medium transition-all"
          >
            Emergency Withdraw
          </button>
        )}

        {/* View on Explorer */}
        {escrow.contractAddress && (
          <a
            href={`https://basescan.org/address/${escrow.contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-surface3 hover:bg-surface2 border border-white/[0.1] rounded-lg text-text-primary/70 hover:text-text-primary font-medium transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View on Explorer
          </a>
        )}

        {/* Export Data */}
        <button
          onClick={() => {
            // Export escrow data as JSON
            const data = JSON.stringify(escrow, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `escrow-${escrow.id}.json`;
            a.click();
          }}
          className="w-full py-3 bg-surface3 hover:bg-surface2 border border-white/[0.1] rounded-lg text-text-primary/70 hover:text-text-primary font-medium transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Data
        </button>
      </div>

      {/* Status Info */}
      {escrow.status === 'COMPLETED' && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-green-400 text-sm font-medium">Escrow Completed</p>
          </div>
          <p className="text-green-400/70 text-xs mt-1">
            All milestones have been released and claimed
          </p>
        </div>
      )}

      {escrow.disputeActive && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-red-400 text-sm font-medium">Dispute Active</p>
          </div>
          <p className="text-red-400/70 text-xs mt-1">
            This escrow is under dispute resolution
          </p>
        </div>
      )}
    </div>
  );
}