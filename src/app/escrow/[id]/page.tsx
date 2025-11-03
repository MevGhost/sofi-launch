'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutShell, SectionHeader } from '@/components/alien/Layout';
import { Button } from '@/components/alien/Button';
import { Card } from '@/components/alien/Card';
import { useEscrow, useEscrowContract, useEscrowUpdates } from '@/hooks/useEscrows';
import { useAccount } from 'wagmi';
import { showToast } from '@/components/ToastProvider';
import { EscrowHeader } from '@/components/escrow/detail/EscrowHeader';
import { MilestoneTimeline } from '@/components/escrow/detail/MilestoneTimeline';
import { ActivityFeed } from '@/components/escrow/detail/ActivityFeed';
import { EscrowActions } from '@/components/escrow/detail/EscrowActions';
import { DisputePanel } from '@/components/escrow/detail/DisputePanel';
import { MilestoneSubmissionModal } from '@/components/escrow/milestone/MilestoneSubmissionModal';

export default function EscrowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();
  const { escrow, activities, loading, error } = useEscrow(params.id as string);
  const { releaseMilestone, claimFunds, raiseDispute, loading: actionLoading } = useEscrowContract();
  const updates = useEscrowUpdates(params.id as string);
  
  const [activeTab, setActiveTab] = useState<'milestones' | 'activity' | 'details'>('milestones');
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  // Determine user role in this escrow
  const getUserRole = () => {
    if (!escrow || !address) return null;
    if (escrow.creator.toLowerCase() === address.toLowerCase()) return 'creator';
    if (escrow.kol.toLowerCase() === address.toLowerCase()) return 'kol';
    // Check if user is a verifier (would need to check verifier list)
    return 'viewer';
  };

  const userRole = getUserRole();

  // Handle real-time updates
  useEffect(() => {
    if (updates.length > 0) {
      const latestUpdate = updates[updates.length - 1];
      if (latestUpdate.type === 'milestone_released') {
        showToast.success('Milestone funds released!');
      } else if (latestUpdate.type === 'milestone_submitted') {
        showToast.info('New milestone submission received');
      }
    }
  }, [updates]);

  const handleReleaseMilestone = async (milestoneId: string) => {
    try {
      await releaseMilestone(params.id as string, milestoneId);
      showToast.success('Milestone released successfully');
    } catch (error) {
      showToast.error('Failed to release milestone');
    }
  };

  const handleClaimFunds = async () => {
    try {
      await claimFunds(params.id as string);
      showToast.success('Funds claimed successfully');
    } catch (error) {
      showToast.error('Failed to claim funds');
    }
  };

  const handleRaiseDispute = async (reason: string, evidence: string[]) => {
    try {
      await raiseDispute(params.id as string, reason, evidence);
      showToast.success('Dispute raised successfully');
      setShowDisputeForm(false);
    } catch (error) {
      showToast.error('Failed to raise dispute');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative z-10">
          <div className="w-16 h-16 border-4 border-[#0052FF]/30 border-t-[#0052FF] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !escrow) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative z-10 text-center">
          <h2 className="text-2xl font-bold font-display text-text-primary mb-4">Escrow Not Found</h2>
          <p className="text-text-muted mb-6">{error || 'The escrow you are looking for does not exist.'}</p>
          <button
            onClick={() => router.push('/portfolio?tab=escrows')}
            className="px-6 py-3 bg-gradient-to-r from-[#0052FF] to-[#06B6D4] rounded-lg text-text-primary font-medium hover:from-[#0047E0] hover:to-[#06B6D4] transition-all"
          >
            Back to Escrows
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      
      <div className="relative z-10 pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <EscrowHeader 
              escrow={escrow} 
              userRole={userRole}
              onAction={(action) => {
                if (action === 'fund') {
                  showToast.info('Funding modal coming soon');
                } else if (action === 'cancel') {
                  showToast.info('Cancel functionality coming soon');
                }
              }}
            />
          </motion.div>

          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-8 mb-6"
          >
            <div className="flex gap-2 p-1 bg-surface2 backdrop-blur-xl rounded-lg border border-border">
              {['milestones', 'activity', 'details'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all capitalize ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-[#0052FF]/20 to-[#06B6D4]/20 text-text-primary border border-[#0052FF]/30'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface3'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-2 space-y-6"
            >
              {activeTab === 'milestones' && (
                <MilestoneTimeline
                  milestones={escrow.milestones || []}
                  userRole={userRole}
                  onRelease={handleReleaseMilestone}
                  onSubmitProof={(milestoneId) => {
                    setSelectedMilestone(milestoneId);
                    setShowSubmissionModal(true);
                  }}
                  onApprove={(milestoneId) => {
                    showToast.info('Approval interface coming soon');
                  }}
                  loading={actionLoading}
                />
              )}

              {activeTab === 'activity' && (
                <ActivityFeed 
                  activities={activities}
                  escrowId={params.id as string}
                />
              )}

              {activeTab === 'details' && (
                <div className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6 space-y-6">
                  <h3 className="text-xl font-semibold text-text-primary">Escrow Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <span className="text-text-primary/40 text-sm">Contract Address</span>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-text-primary font-mono text-sm">
                          {(escrow as any).contractAddress ? 
                            `${(escrow as any).contractAddress.slice(0, 6)}...${(escrow as any).contractAddress.slice(-4)}` :
                            'Not deployed yet'
                          }
                        </p>
                        {(escrow as any).contractAddress && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText((escrow as any).contractAddress!);
                              showToast.success('Address copied');
                            }}
                            className="text-[#0EA5E9] hover:text-[#06B6D4]"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-text-primary/40 text-sm">Chain</span>
                      <p className="text-text-primary mt-1">Base {(escrow as any).chainId === 84532 ? 'Sepolia' : 'Mainnet'}</p>
                    </div>

                    <div>
                      <span className="text-text-primary/40 text-sm">Start Date</span>
                      <p className="text-text-primary mt-1">
                        {new Date((escrow as any).startDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <span className="text-text-primary/40 text-sm">End Date</span>
                      <p className="text-text-primary mt-1">
                        {new Date((escrow as any).endDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <span className="text-text-primary/40 text-sm">Created At</span>
                      <p className="text-text-primary mt-1">
                        {new Date(escrow.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <span className="text-text-primary/40 text-sm">Last Updated</span>
                      <p className="text-text-primary mt-1">
                        {new Date((escrow as any).updatedAt || escrow.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Token Information */}
                  <div className="pt-6 border-t border-border">
                    <h4 className="text-text-primary font-medium mb-4">Token Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-text-primary/40 text-sm">Token Address</span>
                        <p className="text-text-primary font-mono text-sm mt-1">
                          {(escrow as any).tokenAddress.slice(0, 6)}...{(escrow as any).tokenAddress.slice(-4)}
                        </p>
                      </div>
                      <div>
                        <span className="text-text-primary/40 text-sm">Token Symbol</span>
                        <p className="text-text-primary mt-1">{(escrow as any).tokenSymbol}</p>
                      </div>
                      <div>
                        <span className="text-text-primary/40 text-sm">Decimals</span>
                        <p className="text-text-primary mt-1">{(escrow as any).tokenDecimals}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dispute Panel */}
              {(escrow as any).disputeActive && (
                <DisputePanel 
                  escrowId={params.id as string}
                  userRole={userRole}
                  onResolve={(resolution) => {
                    showToast.info('Dispute resolution coming soon');
                  }}
                />
              )}
            </motion.div>

            {/* Right Column - Actions & Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="space-y-6"
            >
              <EscrowActions
                escrow={escrow}
                userRole={userRole}
                onClaim={handleClaimFunds}
                onDispute={() => setShowDisputeForm(true)}
                onEmergencyWithdraw={() => {
                  showToast.info('Emergency withdraw coming soon');
                }}
                loading={actionLoading}
              />

              {/* Quick Stats */}
              <div className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6">
                <h3 className="text-text-primary font-medium mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-primary/60 text-sm">Progress</span>
                    <span className="text-text-primary font-medium">
                      {Math.round((parseFloat((escrow as any).releasedAmount) / parseFloat((escrow as any).totalAmount)) * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-primary/60 text-sm">Milestones</span>
                    <span className="text-text-primary">
                      {(escrow.milestones || []).filter(m => m.status === 'approved').length}/{(escrow.milestones || []).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-primary/60 text-sm">Time Remaining</span>
                    <span className="text-text-primary">
                      {Math.max(0, Math.ceil((new Date((escrow as any).endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days
                    </span>
                  </div>
                </div>
              </div>

              {/* Participants */}
              <div className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6">
                <h3 className="text-text-primary font-medium mb-4">Participants</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-text-primary/40 text-xs">CREATOR</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0052FF] to-[#06B6D4]" />
                      <div>
                        <p className="text-text-primary text-sm font-medium">
                          {escrow.creator.slice(0, 6)}...{escrow.creator.slice(-4)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-text-primary/40 text-xs">KOL</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4]" />
                      <div>
                        <p className="text-text-primary text-sm font-medium">
                          {escrow.kol.slice(0, 6)}...{escrow.kol.slice(-4)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Milestone Submission Modal */}
      {showSubmissionModal && selectedMilestone && (
        <MilestoneSubmissionModal
          milestoneId={selectedMilestone}
          escrowId={params.id as string}
          onClose={() => {
            setShowSubmissionModal(false);
            setSelectedMilestone(null);
          }}
          onSubmit={(data) => {
            showToast.success('Proof submitted successfully');
            setShowSubmissionModal(false);
            setSelectedMilestone(null);
          }}
        />
      )}

      {/* Dispute Form Modal */}
      {showDisputeForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-canvas/90 backdrop-blur-xl border border-[#0052FF]/20 rounded-2xl p-6"
          >
            <h3 className="text-xl font-semibold text-text-primary mb-4">Raise Dispute</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-primary/60 mb-2">Reason</label>
                <textarea
                  id="dispute-reason"
                  rows={3}
                  className="w-full px-4 py-3 bg-surface3 border border-white/[0.1] rounded-lg text-text-primary placeholder:text-text-primary/30 focus:bg-surface2 focus:border-[#0052FF]/50 transition-all resize-none"
                  placeholder="Describe the issue..."
                />
              </div>
              
              <div>
                <label className="block text-sm text-text-primary/60 mb-2">Evidence Links</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-surface3 border border-white/[0.1] rounded-lg text-text-primary placeholder:text-text-primary/30 focus:bg-surface2 focus:border-[#0052FF]/50 transition-all"
                  placeholder="Add evidence URLs (comma separated)"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  const reason = (document.getElementById('dispute-reason') as HTMLTextAreaElement).value;
                  handleRaiseDispute(reason, []);
                }}
                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-[#06B6D4] rounded-lg text-text-primary font-medium hover:from-red-600 hover:to-[#06B6D4] transition-all"
              >
                Submit Dispute
              </button>
              <button
                onClick={() => setShowDisputeForm(false)}
                className="px-6 py-3 bg-surface3 hover:bg-surface2 border border-white/[0.1] rounded-lg text-text-primary/70 hover:text-text-primary transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}