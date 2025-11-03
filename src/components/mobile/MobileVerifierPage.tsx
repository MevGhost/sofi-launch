'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileLayout, MobileCard } from './MobileLayout';
import {
  FiShield,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiFileText,
  FiSearch,
  FiFilter,
  FiAlertTriangle,
  FiEye,
  FiTrendingUp,
  FiAward,
  FiDollarSign,
  FiUsers,
  FiActivity,
  FiChevronRight,
  FiRefreshCw,
  FiStar,
  FiMessageSquare,
  FiUpload,
  FiCamera,
  FiLink,
  FiExternalLink,
  FiInfo,
  FiZap,
  FiTarget,
  FiHash,
  FiCalendar,
  FiBarChart2
} from 'react-icons/fi';
import { BottomSheet, MiniBottomSheet } from './BottomSheet';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface VerificationTask {
  id: string;
  escrowId: string;
  title: string;
  project: string;
  kol: string;
  milestone: string;
  amount: string;
  deadline: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  priority: 'high' | 'medium' | 'low';
  proofType: 'link' | 'image' | 'document' | 'metrics';
  submittedProof?: {
    type: string;
    url?: string;
    description?: string;
    metrics?: {
      views?: number;
      engagement?: number;
      clicks?: number;
    };
  };
}

interface VerifierStats {
  totalReviewed: number;
  approvalRate: number;
  avgResponseTime: string;
  earnings: string;
  reputation: number;
  rank: number;
}

// Mock data
const mockTasks: VerificationTask[] = [
  {
    id: '1',
    escrowId: 'ESC001',
    title: 'Twitter Campaign Verification',
    project: 'AlienBase',
    kol: '0x1234...5678',
    milestone: 'Social Media Launch',
    amount: '2,500 USDC',
    deadline: '2 hours',
    status: 'pending',
    priority: 'high',
    proofType: 'link',
    submittedProof: {
      type: 'link',
      url: 'https://twitter.com/example/status/123',
      description: 'Tweet with 10K+ impressions',
      metrics: {
        views: 12500,
        engagement: 850,
        clicks: 320
      }
    }
  },
  {
    id: '2',
    escrowId: 'ESC002',
    title: 'Content Creation Review',
    project: 'MoonDoge',
    kol: '0xabcd...efgh',
    milestone: 'Video Publication',
    amount: '5,000 USDC',
    deadline: '1 day',
    status: 'in_review',
    priority: 'medium',
    proofType: 'link'
  }
];

const mockStats: VerifierStats = {
  totalReviewed: 247,
  approvalRate: 94.2,
  avgResponseTime: '2.5 hours',
  earnings: '8,750 USDC',
  reputation: 98,
  rank: 12
};

export function MobileVerifierPage() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const [activeTab, setActiveTab] = useState<'tasks' | 'history' | 'stats'>('tasks');
  const [selectedTask, setSelectedTask] = useState<VerificationTask | null>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_review'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'approve' | 'reject' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // TODO: Implement actual API call to refresh verifier data
    setIsRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-400/20';
      case 'in_review': return 'text-blue-400 bg-blue-400/20';
      case 'approved': return 'text-green-400 bg-green-400/20';
      case 'rejected': return 'text-red-400 bg-red-400/20';
      default: return 'text-text-muted bg-gray-400/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-text-muted';
    }
  };

  const getProofIcon = (type: string) => {
    switch (type) {
      case 'link': return FiLink;
      case 'image': return FiCamera;
      case 'document': return FiFileText;
      case 'metrics': return FiBarChart2;
      default: return FiFileText;
    }
  };

  const filteredTasks = mockTasks.filter(task => {
    if (filterStatus === 'all') return true;
    return task.status === filterStatus;
  });

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#0052FF]/20 to-[#0EA5E9]/20 rounded-full flex items-center justify-center">
            <FiShield className="w-10 h-10 text-[#0EA5E9]" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-3">Verifier Dashboard</h2>
          <p className="text-text-primary/60 text-sm mb-8 max-w-xs mx-auto">
            Connect your wallet to access verification tasks and manage reviews
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <MobileLayout showNav title="Verifier Dashboard">
      <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-14 z-30 bg-canvas/90 backdrop-blur-xl border-b border-border">
        {/* Stats Card */}
        <div className="p-4">
          <div className="bg-gradient-to-br from-[#0052FF]/10 to-[#0EA5E9]/10 rounded-2xl p-4 border border-border mb-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-text-primary/60 mb-1">Verifier Dashboard</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-text-primary">{mockStats.totalReviewed}</h2>
                  <span className="text-xs text-text-primary/40">reviews</span>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                className={`p-2 ${isRefreshing ? 'animate-spin' : ''}`}
              >
                <FiRefreshCw className="w-4 h-4 text-text-primary/60" />
              </button>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-[10px] text-text-primary/40">Approval Rate</p>
                <p className="text-sm font-semibold text-green-400">{mockStats.approvalRate}%</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-text-primary/40">Avg Response</p>
                <p className="text-sm font-semibold text-text-primary">{mockStats.avgResponseTime}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-text-primary/40">Rank</p>
                <p className="text-sm font-semibold text-[#0EA5E9]">#{mockStats.rank}</p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2">
            {(['tasks', 'history', 'stats'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-[#0052FF] to-[#0EA5E9] text-text-primary'
                    : 'bg-surface3 text-text-primary/60 border border-border'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* FiFilter Bar (for tasks tab) */}
        {activeTab === 'tasks' && (
          <div className="px-4 pb-3 flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 overflow-x-auto">
              {(['all', 'pending', 'in_review'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    filterStatus === status
                      ? 'bg-gradient-to-r from-[#0052FF] to-[#0EA5E9] text-text-primary'
                      : 'bg-surface3 text-text-primary/60 border border-border'
                  }`}
                >
                  {status === 'all' ? 'All' : status.replace('_', ' ')}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowFilterSheet(true)}
              className="p-2 bg-surface3 rounded-lg border border-border"
            >
              <FiFilter className="w-3.5 h-3.5 text-text-primary/60" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <motion.div
            key="tasks"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="p-4 space-y-3"
          >
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <FiShield className="w-12 h-12 text-text-primary/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">No Tasks Available</h3>
                <p className="text-sm text-text-primary/40">Check back later for new verification tasks</p>
              </div>
            ) : (
              filteredTasks.map((task, index) => {
                const ProofIcon = getProofIcon(task.proofType);
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedTask(task)}
                    className="bg-surface2 backdrop-blur-xl rounded-2xl p-4 border border-border"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-text-primary line-clamp-1">
                            {task.title}
                          </h3>
                          <FiZap className={`w-3 h-3 ${getPriorityColor(task.priority)}`} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-text-primary/40">
                            {task.project}
                          </span>
                        </div>
                      </div>
                      <FiChevronRight className="w-4 h-4 text-text-primary/40" />
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <FiDollarSign className="w-3 h-3 text-text-primary/40" />
                        <span className="text-xs text-text-primary">{task.amount}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiClock className="w-3 h-3 text-text-primary/40" />
                        <span className="text-xs text-text-primary/60">{task.deadline}</span>
                      </div>
                    </div>

                    {/* Proof Type */}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <ProofIcon className="w-3 h-3 text-text-primary/40" />
                        <span className="text-xs text-text-primary/40">
                          {task.proofType} proof
                        </span>
                      </div>
                      {task.submittedProof && (
                        <span className="text-xs text-green-400">Proof submitted</span>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="p-4 space-y-3"
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-surface2 rounded-xl p-4 border border-border"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Marketing Campaign</p>
                    <p className="text-xs text-text-primary/40">Reviewed 2 days ago</p>
                  </div>
                  <span className="px-2 py-1 bg-green-400/20 text-green-400 text-xs rounded-full">
                    Approved
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-text-primary/60">500 USDC</span>
                  <span className="text-text-primary/60">•</span>
                  <span className="text-text-primary/60">Response: 1.5h</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="p-4 space-y-4"
          >
            {/* Earnings Card */}
            <div className="bg-gradient-to-br from-[#0052FF]/10 to-[#0EA5E9]/10 rounded-2xl p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Total Earnings</h3>
              <p className="text-2xl font-bold text-text-primary mb-1">{mockStats.earnings}</p>
              <div className="flex items-center gap-1">
                <FiTrendingUp className="w-3 h-3 text-green-400" />
                <span className="text-xs text-green-400">+18.5% this month</span>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-surface2 rounded-2xl p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Performance</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-primary/60">Reputation Score</span>
                    <span className="text-xs text-text-primary">{mockStats.reputation}/100</span>
                  </div>
                  <div className="h-2 bg-surface3 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${mockStats.reputation}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-[#0052FF] to-[#0EA5E9]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-primary/60">Approval Rate</span>
                    <span className="text-xs text-text-primary">{mockStats.approvalRate}%</span>
                  </div>
                  <div className="h-2 bg-surface3 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${mockStats.approvalRate}%` }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-surface2 rounded-2xl p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Achievements</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: FiAward, label: 'Top Verifier', earned: true },
                  { icon: FiTarget, label: 'Quick Response', earned: true },
                  { icon: FiStar, label: 'Perfect Score', earned: false }
                ].map((achievement, idx) => {
                  const Icon = achievement.icon;
                  return (
                    <div
                      key={idx}
                      className={`text-center p-3 rounded-xl ${
                        achievement.earned
                          ? 'bg-gradient-to-br from-[#0052FF]/10 to-[#0EA5E9]/10 border border-[#0EA5E9]/30'
                          : 'bg-surface2 border border-border opacity-50'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${
                        achievement.earned ? 'text-[#0EA5E9]' : 'text-text-primary/30'
                      }`} />
                      <p className="text-[10px] text-text-primary/60">{achievement.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Detail Bottom Sheet */}
      <BottomSheet
        isOpen={!!selectedTask}
        onClose={() => {
          setSelectedTask(null);
          setReviewDecision(null);
          setReviewNotes('');
        }}
        title="Verification Task"
        snapPoints={[70, 95]}
      >
        {selectedTask && (
          <div className="p-4 space-y-4">
            {/* Task Header */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">{selectedTask.title}</h3>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTask.status)}`}>
                  {selectedTask.status.replace('_', ' ')}
                </span>
                <span className="text-xs text-text-primary/40">•</span>
                <span className="text-xs text-text-primary/40">{selectedTask.deadline} remaining</span>
              </div>
            </div>

            {/* Details */}
            <div className="bg-surface2 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-primary/40">Project</span>
                <span className="text-xs text-text-primary">{selectedTask.project}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-primary/40">KOL</span>
                <span className="text-xs font-mono text-text-primary">{selectedTask.kol}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-primary/40">Milestone</span>
                <span className="text-xs text-text-primary">{selectedTask.milestone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-primary/40">Amount</span>
                <span className="text-xs font-semibold text-text-primary">{selectedTask.amount}</span>
              </div>
            </div>

            {/* Submitted Proof */}
            {selectedTask.submittedProof && (
              <div className="bg-surface2 rounded-xl p-3">
                <h4 className="text-sm font-semibold text-text-primary mb-2">Submitted Proof</h4>
                
                {selectedTask.submittedProof.url && (
                  <a
                    href={selectedTask.submittedProof.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 bg-surface2 rounded-lg mb-2"
                  >
                    <div className="flex items-center gap-2">
                      <FiLink className="w-4 h-4 text-[#0EA5E9]" />
                      <span className="text-xs text-text-primary">View Proof</span>
                    </div>
                    <FiExternalLink className="w-3 h-3 text-text-primary/40" />
                  </a>
                )}

                {selectedTask.submittedProof.description && (
                  <p className="text-xs text-text-primary/60 mb-2">
                    {selectedTask.submittedProof.description}
                  </p>
                )}

                {selectedTask.submittedProof.metrics && (
                  <div className="grid grid-cols-3 gap-2">
                    {selectedTask.submittedProof.metrics.views && (
                      <div className="text-center p-2 bg-surface2 rounded-lg">
                        <p className="text-sm font-semibold text-text-primary">
                          {selectedTask.submittedProof.metrics.views.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-text-primary/40">Views</p>
                      </div>
                    )}
                    {selectedTask.submittedProof.metrics.engagement && (
                      <div className="text-center p-2 bg-surface2 rounded-lg">
                        <p className="text-sm font-semibold text-text-primary">
                          {selectedTask.submittedProof.metrics.engagement.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-text-primary/40">Engagement</p>
                      </div>
                    )}
                    {selectedTask.submittedProof.metrics.clicks && (
                      <div className="text-center p-2 bg-surface2 rounded-lg">
                        <p className="text-sm font-semibold text-text-primary">
                          {selectedTask.submittedProof.metrics.clicks.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-text-primary/40">Clicks</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Review Section */}
            {selectedTask.status === 'pending' && (
              <div>
                <h4 className="text-sm font-semibold text-text-primary mb-2">Your Review</h4>
                <textarea
                  placeholder="Add review notes (optional)..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full bg-surface3 border border-border rounded-xl p-3 text-sm text-text-primary placeholder-white/30 resize-none h-20 mb-3"
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setReviewDecision('approve')}
                    className="py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-text-primary font-semibold rounded-xl"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setReviewDecision('reject')}
                    className="py-3 bg-gradient-to-r from-red-500 to-pink-500 text-text-primary font-semibold rounded-xl"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

            {/* Info Note */}
            <div className="bg-surface2 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <FiInfo className="w-4 h-4 text-[#0EA5E9] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-text-primary/60">
                  Review carefully. Your decision affects milestone release and your reputation score.
                </p>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* FiFilter Bottom Sheet */}
      <MiniBottomSheet
        isOpen={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
      >
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">Filter Tasks</h3>
          
          <div>
            <p className="text-sm text-text-primary/60 mb-2">Priority</p>
            <div className="grid grid-cols-3 gap-2">
              <button className="py-2 bg-surface3 rounded-lg text-xs text-text-primary">All</button>
              <button className="py-2 bg-gradient-to-r from-[#0052FF] to-[#0EA5E9] rounded-lg text-xs text-text-primary">High</button>
              <button className="py-2 bg-surface3 rounded-lg text-xs text-text-primary">Medium</button>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-text-primary/60 mb-2">Proof Type</p>
            <div className="grid grid-cols-2 gap-2">
              <button className="py-2 bg-surface3 rounded-lg text-xs text-text-primary">Link</button>
              <button className="py-2 bg-surface3 rounded-lg text-xs text-text-primary">Image</button>
              <button className="py-2 bg-surface3 rounded-lg text-xs text-text-primary">Document</button>
              <button className="py-2 bg-surface3 rounded-lg text-xs text-text-primary">Metrics</button>
            </div>
          </div>
          
          <button
            onClick={() => setShowFilterSheet(false)}
            className="w-full py-3 bg-gradient-to-r from-[#0052FF] to-[#0EA5E9] text-text-primary font-semibold rounded-xl"
          >
            Apply Filters
          </button>
        </div>
      </MiniBottomSheet>
      </div>
    </MobileLayout>
  );
}