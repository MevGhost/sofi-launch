'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { formatTokenAmount } from '@/lib/format';

interface MilestoneTimelineProps {
  milestones: any[];
  userRole: string | null;
  onRelease: (milestoneId: string) => void;
  onSubmitProof: (milestoneId: string) => void;
  onApprove: (milestoneId: string) => void;
  loading?: boolean;
}

export function MilestoneTimeline({
  milestones,
  userRole,
  onRelease,
  onSubmitProof,
  onApprove,
  loading
}: MilestoneTimelineProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RELEASED': return 'bg-green-500';
      case 'APPROVED': return 'bg-blue-500';
      case 'SUBMITTED': return 'bg-yellow-500';
      case 'UNDER_REVIEW': return 'bg-orange-500';
      case 'REJECTED': return 'bg-red-500';
      case 'DISPUTED': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RELEASED':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'APPROVED':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'SUBMITTED':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const canRelease = (milestone: any) => {
    return userRole === 'creator' && milestone.status === 'APPROVED';
  };

  const canSubmitProof = (milestone: any) => {
    return userRole === 'kol' && (milestone.status === 'PENDING' || milestone.status === 'REJECTED');
  };

  const canApprove = (milestone: any) => {
    return userRole === 'verifier' && milestone.status === 'SUBMITTED';
  };

  return (
    <div className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6">
      <h3 className="text-xl font-semibold text-text-primary mb-6">Milestone Timeline</h3>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-[#0052FF] via-[#0EA5E9] to-[#0052FF] opacity-30" />
        
        {/* Milestones */}
        <div className="space-y-6">
          {milestones.map((milestone, index) => (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex gap-4"
            >
              {/* Timeline dot */}
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-text-primary ${getStatusColor(milestone.status)}`}>
                  {getStatusIcon(milestone.status)}
                </div>
                {index < milestones.length - 1 && (
                  <div className="absolute top-12 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gradient-to-b from-[#0052FF]/30 to-transparent" />
                )}
              </div>

              {/* Milestone content */}
              <div className="flex-1 bg-surface3 border border-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-text-primary font-medium text-lg">{milestone.title}</h4>
                    {milestone.description && (
                      <p className="text-text-primary/60 text-sm mt-1">{milestone.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[#0EA5E9] font-semibold">
                      {formatTokenAmount(milestone.amount, 6)} USDC
                    </p>
                    <p className="text-text-primary/40 text-xs mt-1">
                      {new Date(milestone.releaseDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    milestone.status === 'RELEASED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    milestone.status === 'APPROVED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    milestone.status === 'SUBMITTED' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                    milestone.status === 'UNDER_REVIEW' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                    milestone.status === 'REJECTED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    'bg-gray-500/20 text-text-muted border border-gray-500/30'
                  }`}>
                    {milestone.status}
                  </span>
                  
                  {milestone.releaseHash && (
                    <a
                      href={`https://basescan.org/tx/${milestone.releaseHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0EA5E9] hover:text-[#06B6D4] text-xs flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View TX
                    </a>
                  )}
                </div>

                {/* Required Proofs */}
                {milestone.requiredProofs && milestone.requiredProofs.length > 0 && (
                  <div className="mb-3">
                    <span className="text-text-primary/40 text-xs">REQUIRED PROOFS</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {milestone.requiredProofs.map((proof: string) => (
                        <span
                          key={proof}
                          className="px-2 py-1 bg-[#0052FF]/10 border border-[#0052FF]/20 rounded-full text-xs text-[#06B6D4]"
                        >
                          {proof.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Proof URL */}
                {milestone.proofUrl && (
                  <div className="mb-3">
                    <span className="text-text-primary/40 text-xs">SUBMITTED PROOF</span>
                    <a
                      href={milestone.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[#0EA5E9] hover:text-[#06B6D4] text-sm mt-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      View Proof
                    </a>
                  </div>
                )}

                {/* Verifications */}
                {milestone.verifications && milestone.verifications.length > 0 && (
                  <div className="mb-3">
                    <span className="text-text-primary/40 text-xs">VERIFICATIONS</span>
                    <div className="mt-1 space-y-1">
                      {milestone.verifications.map((verification: any) => (
                        <div key={verification.id} className="flex items-center gap-2 text-sm">
                          <span className={`w-2 h-2 rounded-full ${verification.approved ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-text-primary/60">
                            {verification.verifier.address.slice(0, 6)}...{verification.verifier.address.slice(-4)}
                          </span>
                          {verification.comments && (
                            <span className="text-text-primary/40 text-xs">- {verification.comments}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {canRelease(milestone) && (
                    <button
                      onClick={() => onRelease(milestone.id)}
                      disabled={loading}
                      className="px-4 py-2 bg-gradient-to-r from-[#0052FF] to-[#0EA5E9] rounded-lg text-text-primary text-sm font-medium hover:from-[#0047E0] hover:to-[#0A96D4] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Release Funds
                    </button>
                  )}
                  
                  {canSubmitProof(milestone) && (
                    <button
                      onClick={() => onSubmitProof(milestone.id)}
                      className="px-4 py-2 bg-[#0052FF]/20 hover:bg-[#0052FF]/30 border border-[#0052FF]/30 rounded-lg text-[#06B6D4] text-sm font-medium transition-all"
                    >
                      Submit Proof
                    </button>
                  )}
                  
                  {canApprove(milestone) && (
                    <button
                      onClick={() => onApprove(milestone.id)}
                      className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-300 text-sm font-medium transition-all"
                    >
                      Review & Approve
                    </button>
                  )}
                  
                  {milestone.status === 'RELEASED' && (
                    <span className="px-4 py-2 text-green-400 text-sm flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Funds Released
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}