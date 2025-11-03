'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { showToast } from '@/components/ToastProvider';

interface MilestoneSubmissionModalProps {
  milestoneId: string;
  escrowId: string;
  onClose: () => void;
  onSubmit: (data: {
    proofUrl: string;
    description: string;
    evidenceLinks: string[];
  }) => void;
}

export function MilestoneSubmissionModal({
  milestoneId,
  escrowId,
  onClose,
  onSubmit
}: MilestoneSubmissionModalProps) {
  const [proofUrl, setProofUrl] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceLinks, setEvidenceLinks] = useState<string[]>(['']);
  const [uploading, setUploading] = useState(false);

  const handleAddEvidenceLink = () => {
    setEvidenceLinks([...evidenceLinks, '']);
  };

  const handleRemoveEvidenceLink = (index: number) => {
    setEvidenceLinks(evidenceLinks.filter((_, i) => i !== index));
  };

  const handleEvidenceLinkChange = (index: number, value: string) => {
    const updated = [...evidenceLinks];
    updated[index] = value;
    setEvidenceLinks(updated);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      showToast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    
    try {
      // Mock file upload - in production, upload to IPFS or cloud storage
      const timestamp = Date.now();
      const mockUrl = `https://ipfs.io/ipfs/${timestamp.toString(36)}`;
      setProofUrl(mockUrl);
      showToast.success('File uploaded successfully');
    } catch (error) {
      showToast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!proofUrl && !description) {
      showToast.error('Please provide proof URL or description');
      return;
    }

    const validLinks = evidenceLinks.filter(link => link.trim() !== '');
    
    onSubmit({
      proofUrl,
      description,
      evidenceLinks: validLinks
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-2xl bg-gradient-to-b from-gray-900 via-black to-gray-900 border border-[#0052FF]/20 rounded-2xl p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-[#0EA5E9] to-[#3FB5E9]">
              Submit Milestone Proof
            </h2>
            <button
              onClick={onClose}
              className="text-text-primary/40 hover:text-text-primary/60 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Milestone Info */}
          <div className="bg-[#0052FF]/10 border border-[#0052FF]/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-[#0EA5E9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[#06B6D4] font-medium">Milestone Requirements</span>
            </div>
            <p className="text-text-primary/60 text-sm">
              Please provide evidence that the milestone deliverables have been completed according to the agreement.
              Include links to social media posts, reports, or any relevant proof.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm text-text-primary/60 mb-2">Upload Proof Document</label>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="proof-file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                />
                <label
                  htmlFor="proof-file"
                  className="flex items-center justify-center gap-3 w-full px-4 py-8 bg-surface2 hover:bg-surface3 border-2 border-dashed border-white/[0.1] hover:border-[#0052FF]/30 rounded-lg cursor-pointer transition-all"
                >
                  {uploading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-[#0052FF]/30 border-t-[#0052FF] rounded-full animate-spin" />
                      <span className="text-text-primary/60">Uploading...</span>
                    </div>
                  ) : proofUrl ? (
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-green-400">File uploaded</span>
                      <span className="text-text-primary/40 text-sm">(Click to change)</span>
                    </div>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-text-primary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <div className="text-center">
                        <p className="text-text-primary/60">Click to upload proof document</p>
                        <p className="text-text-primary/30 text-xs mt-1">PDF, DOC, PNG, JPG up to 10MB</p>
                      </div>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Proof URL */}
            <div>
              <label className="block text-sm text-text-primary/60 mb-2">Or Provide Proof URL</label>
              <input
                type="url"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 bg-surface3 border border-white/[0.1] rounded-lg text-text-primary placeholder:text-text-primary/30 focus:bg-surface2 focus:border-[#0052FF]/50 transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-text-primary/60 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what was delivered and how it meets the milestone requirements..."
                rows={4}
                className="w-full px-4 py-3 bg-surface3 border border-white/[0.1] rounded-lg text-text-primary placeholder:text-text-primary/30 focus:bg-surface2 focus:border-[#0052FF]/50 transition-all resize-none"
              />
            </div>

            {/* Evidence Links */}
            <div>
              <label className="block text-sm text-text-primary/60 mb-2">Evidence Links</label>
              <div className="space-y-2">
                {evidenceLinks.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => handleEvidenceLinkChange(index, e.target.value)}
                      placeholder="https://twitter.com/..."
                      className="flex-1 px-4 py-2 bg-surface3 border border-white/[0.1] rounded-lg text-text-primary text-sm placeholder:text-text-primary/30 focus:bg-surface2 focus:border-[#0052FF]/50 transition-all"
                    />
                    {evidenceLinks.length > 1 && (
                      <button
                        onClick={() => handleRemoveEvidenceLink(index)}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={handleAddEvidenceLink}
                  className="w-full py-2 bg-[#0052FF]/20 hover:bg-[#0052FF]/30 border border-[#0052FF]/30 rounded-lg text-[#06B6D4] text-sm font-medium transition-all"
                >
                  + Add Evidence Link
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 bg-gradient-to-r from-[#0052FF] to-[#0EA5E9] rounded-lg text-text-primary font-medium hover:from-[#0047E0] hover:to-[#0A96D4] transition-all shadow-lg shadow-[#0052FF]/20"
            >
              Submit Proof
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-surface3 hover:bg-surface2 border border-white/[0.1] rounded-lg text-text-primary/70 hover:text-text-primary transition-all"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}