'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutShell, SectionHeader, Tabs, Chip } from '@/components/alien/Layout';
import { Button } from '@/components/alien/Button';
import { Card, MetricCard } from '@/components/alien/Card';
import { Input } from '@/components/alien/Input';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { showToast } from '@/components/ToastProvider';
import { useIsMobile } from '@/hooks/useIsMobile';
import dynamic from 'next/dynamic';
import {
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiPercent,
  FiAward,
  FiExternalLink,
  FiCheck,
  FiX,
  FiAlertTriangle,
  FiCalendar,
  FiUser,
  FiLink
} from 'react-icons/fi';

// Dynamically import mobile component
const MobileVerifierPage = dynamic(
  () => import('@/components/mobile/MobileVerifierPage').then(mod => ({ default: mod.MobileVerifierPage })),
  { 
    loading: () => <div className="min-h-screen bg-canvas animate-pulse" />,
    ssr: false 
  }
);

// Mock verifier addresses for demo
const VERIFIER_ADDRESSES = [
  '0x90F79bf6EB2c4f870365E785982E1f101E93b906', // Hardhat account 3
  '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', // Hardhat account 4
];

interface PendingReview {
  id: string;
  escrowId: string;
  milestoneId: string;
  project: string;
  kol: string;
  amount: string;
  proofType: string;
  proofUrl?: string;
  submittedAt: string;
  deadline: string;
  priority: 'high' | 'medium' | 'low';
}

interface VerifierStats {
  totalReviews: number;
  pendingReviews: number;
  completedReviews: number;
  approvalRate: number;
  averageReviewTime: string;
  earnings: string;
}

export default function VerifierDashboard() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'settings'>('pending');
  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if user is verifier - TEMPORARILY ALLOWING ALL FOR TESTING
  const isVerifier = true; // address && VERIFIER_ADDRESSES.map(a => a.toLowerCase()).includes(address.toLowerCase());

  // Mock verifier stats
  const stats: VerifierStats = {
    totalReviews: 89,
    pendingReviews: 7,
    completedReviews: 82,
    approvalRate: 92.3,
    averageReviewTime: '3.2 hours',
    earnings: '4500000000', // in USDC (6 decimals)
  };

  // Mock pending reviews
  const pendingReviews: PendingReview[] = [
    {
      id: 'rev-001',
      escrowId: 'esc-789',
      milestoneId: 'mil-003',
      project: 'DeFi Protocol X',
      kol: 'CryptoInfluencer',
      amount: '25000000000', // $25,000 USDC
      proofType: 'Social Media Campaign',
      proofUrl: 'https://twitter.com/proof/123',
      submittedAt: '2024-01-15T10:00:00Z',
      deadline: '2024-01-17T10:00:00Z',
      priority: 'high',
    },
    {
      id: 'rev-002',
      escrowId: 'esc-456',
      milestoneId: 'mil-002',
      project: 'NFT Marketplace Y',
      kol: 'Web3Creator',
      amount: '10000000000', // $10,000 USDC
      proofType: 'Video Review',
      proofUrl: 'https://youtube.com/watch?v=abc',
      submittedAt: '2024-01-14T15:30:00Z',
      deadline: '2024-01-18T15:30:00Z',
      priority: 'medium',
    },
    {
      id: 'rev-003',
      escrowId: 'esc-123',
      milestoneId: 'mil-001',
      project: 'Gaming Platform Z',
      kol: 'GameStreamer',
      amount: '5000000000', // $5,000 USDC
      proofType: 'Stream Highlights',
      submittedAt: '2024-01-13T09:00:00Z',
      deadline: '2024-01-19T09:00:00Z',
      priority: 'low',
    },
  ];

  const handleApprove = async (reviewId: string) => {
    setLoading(true);
    try {
      // TODO: Implement blockchain call
      showToast.success('Review approved successfully');
      setReviewModal(false);
    } catch (error) {
      showToast.error('Failed to approve review');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (reviewId: string) => {
    setLoading(true);
    try {
      // TODO: Implement blockchain call
      showToast.success('Review rejected');
      setReviewModal(false);
    } catch (error) {
      showToast.error('Failed to reject review');
    } finally {
      setLoading(false);
    }
  };

  // Check if user is connected
  if (!isConnected) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <FiUser className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-text-primary mb-2">Verifier Access Required</h2>
            <p className="text-text-secondary mb-6">Please connect your wallet to continue</p>
            <Button variant="primary">Connect Wallet</Button>
          </div>
        </div>
      </LayoutShell>
    );
  }

  // Check if user is verifier
  if (!isVerifier) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <FiAlertTriangle className="w-16 h-16 text-warning mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h2>
            <p className="text-text-secondary mb-6">This wallet is not registered as a verifier</p>
            <Button variant="secondary" onClick={() => router.push('/portfolio')}>
              Go to Homepage
            </Button>
          </div>
        </div>
      </LayoutShell>
    );
  }

  // Show mobile version if on mobile device
  if (isMobile) {
    return <MobileVerifierPage />;
  }

  return (
    <LayoutShell>
      <div className="p-6">
        {/* Header */}
        <SectionHeader
          title="Verifier Dashboard"
          subtitle="Review and verify milestone submissions"
          actions={
            <div className="flex items-center gap-2">
              <Chip variant="success">
                <FiAward size={14} className="mr-1" />
                Trusted Verifier
              </Chip>
            </div>
          }
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-6 gap-4 mb-8">
          <MetricCard
            label="Total Reviews"
            value={stats.totalReviews}
            icon={<FiCheckCircle size={20} />}
          />
          <MetricCard
            label="Completed"
            value={stats.completedReviews}
            change={{ value: '12', positive: true }}
            icon={<FiCheck size={20} />}
          />
          <MetricCard
            label="Pending"
            value={stats.pendingReviews}
            icon={<FiClock size={20} />}
          />
          <MetricCard
            label="Approval Rate"
            value={`${stats.approvalRate}%`}
            icon={<FiPercent size={20} />}
          />
          <MetricCard
            label="Avg Review Time"
            value={stats.averageReviewTime}
            icon={<FiClock size={20} />}
          />
          <MetricCard
            label="Total Earnings"
            value={`$${(parseFloat(stats.earnings) / 1000000).toFixed(0)}`}
            change={{ value: '500', positive: true }}
            icon={<FiDollarSign size={20} />}
          />
        </div>

        {/* Tabs */}
        <Tabs
          tabs={[
            { value: 'pending', label: `Pending (${stats.pendingReviews})` },
            { value: 'history', label: 'History' },
            { value: 'settings', label: 'Settings' },
          ]}
          value={activeTab}
          onChange={(tab) => setActiveTab(tab as any)}
        />

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'pending' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {pendingReviews.map((review) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Card hover>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-text-primary">{review.project}</h3>
                          <p className="text-sm text-text-muted">KOL: {review.kol}</p>
                        </div>
                        <Chip variant={
                          review.priority === 'high' ? 'danger' :
                          review.priority === 'medium' ? 'warning' :
                          'default'
                        }>
                          {review.priority}
                        </Chip>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between">
                          <span className="text-micro uppercase tracking-wide text-text-muted">Amount</span>
                          <span className="text-sm font-medium text-text-primary">
                            ${(parseFloat(review.amount) / 1000000).toFixed(0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-micro uppercase tracking-wide text-text-muted">Type</span>
                          <span className="text-sm text-text-secondary">{review.proofType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-micro uppercase tracking-wide text-text-muted">Deadline</span>
                          <span className="text-sm text-text-secondary flex items-center gap-1">
                            <FiCalendar size={12} />
                            {new Date(review.deadline).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {review.proofUrl && (
                        <div className="mb-4">
                          <a
                            href={review.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors duration-fast"
                          >
                            <FiLink size={14} />
                            View Proof
                            <FiExternalLink size={12} />
                          </a>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleApprove(review.id)}
                          loading={loading}
                        >
                          <FiCheck size={14} className="mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleReject(review.id)}
                          loading={loading}
                        >
                          <FiX size={14} className="mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}

              {pendingReviews.length === 0 && (
                <div className="col-span-full">
                  <Card>
                    <div className="p-12 text-center">
                      <FiCheckCircle className="w-12 h-12 text-text-muted mx-auto mb-4" />
                      <p className="text-text-secondary">No pending reviews</p>
                      <p className="text-sm text-text-muted mt-2">
                        You're all caught up! Check back later for new submissions.
                      </p>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <Card>
              <div className="p-6">
                <p className="text-text-secondary">Review history coming soon...</p>
              </div>
            </Card>
          )}

          {activeTab === 'settings' && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Verifier Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Notification Preferences
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm text-text-primary">Email notifications for new reviews</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm text-text-primary">Push notifications for high priority</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Availability Status
                    </label>
                    <select className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-text-primary focus:border-primary focus:outline-none">
                      <option>Available</option>
                      <option>Busy</option>
                      <option>Away</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </LayoutShell>
  );
}