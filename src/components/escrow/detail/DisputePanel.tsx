'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface DisputePanelProps {
  escrowId: string;
  userRole: string | null;
  onResolve: (resolution: string) => void;
}

export function DisputePanel({ escrowId, userRole, onResolve }: DisputePanelProps) {
  // Mock dispute data - would come from API
  const dispute = {
    id: 'dispute-1',
    raisedBy: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8',
    reason: 'Milestone deliverables do not meet the agreed requirements. The social media campaign had significantly lower engagement than promised.',
    evidence: [
      'https://twitter.com/proof1',
      'https://analytics.com/report',
    ],
    status: 'OPEN',
    createdAt: '2024-01-20T10:00:00Z',
    comments: [
      {
        id: 'comment-1',
        user: '0x5aAeb6053f3E94C9b9A09f33669435E7Ef1BeAed',
        role: 'KOL',
        message: 'The engagement metrics were affected by external factors beyond my control.',
        timestamp: '2024-01-20T11:00:00Z',
      },
      {
        id: 'comment-2',
        user: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8',
        role: 'CREATOR',
        message: 'The agreement clearly stated minimum engagement requirements which were not met.',
        timestamp: '2024-01-20T12:00:00Z',
      },
    ],
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-text-primary flex items-center gap-2">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Active Dispute
        </h3>
        <span className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-red-400 text-sm font-medium">
          {dispute.status}
        </span>
      </div>

      {/* Dispute Details */}
      <div className="space-y-4 mb-6">
        <div>
          <span className="text-text-primary/40 text-sm">Raised By</span>
          <p className="text-text-primary font-mono text-sm mt-1">
            {dispute.raisedBy.slice(0, 6)}...{dispute.raisedBy.slice(-4)}
          </p>
        </div>

        <div>
          <span className="text-text-primary/40 text-sm">Reason</span>
          <p className="text-text-primary/80 mt-1">{dispute.reason}</p>
        </div>

        {dispute.evidence.length > 0 && (
          <div>
            <span className="text-text-primary/40 text-sm">Evidence</span>
            <div className="mt-2 space-y-1">
              {dispute.evidence.map((link, index) => (
                <a
                  key={index}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#0EA5E9] hover:text-[#06B6D4] text-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Evidence {index + 1}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Comments/Discussion */}
      {dispute.comments.length > 0 && (
        <div className="border-t border-red-500/20 pt-4 mb-4">
          <h4 className="text-text-primary font-medium mb-3">Discussion</h4>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {dispute.comments.map((comment) => (
              <div key={comment.id} className="bg-surface2 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-text-primary/60 font-mono text-xs">
                      {comment.user.slice(0, 6)}...{comment.user.slice(-4)}
                    </span>
                    <span className="px-2 py-0.5 bg-[#0052FF]/20 border border-[#0052FF]/30 rounded-full text-[#06B6D4] text-xs">
                      {comment.role}
                    </span>
                  </div>
                  <span className="text-text-primary/40 text-xs">
                    {new Date(comment.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-text-primary/80 text-sm">{comment.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Actions */}
      {userRole === 'admin' && dispute.status === 'OPEN' && (
        <div className="border-t border-red-500/20 pt-4">
          <h4 className="text-text-primary font-medium mb-3">Admin Resolution</h4>
          <div className="space-y-3">
            <textarea
              id="resolution-text"
              rows={3}
              className="w-full px-4 py-3 bg-surface3 border border-white/[0.1] rounded-lg text-text-primary placeholder:text-text-primary/30 focus:bg-surface2 focus:border-red-500/50 transition-all resize-none"
              placeholder="Enter resolution details..."
            />
            <div className="flex gap-3">
              <button
                onClick={() => onResolve('favor-creator')}
                className="flex-1 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-300 font-medium transition-all"
              >
                Favor Creator
              </button>
              <button
                onClick={() => onResolve('favor-kol')}
                className="flex-1 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-300 font-medium transition-all"
              >
                Favor KOL
              </button>
              <button
                onClick={() => onResolve('split')}
                className="flex-1 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-lg text-yellow-300 font-medium transition-all"
              >
                Split 50/50
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info for non-admins */}
      {userRole !== 'admin' && (
        <div className="border-t border-red-500/20 pt-4">
          <div className="flex items-center gap-2 text-red-400/70 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>This dispute is awaiting admin review and resolution</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}