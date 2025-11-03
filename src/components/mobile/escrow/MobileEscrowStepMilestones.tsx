'use client';

import React, { useState } from 'react';
import { FiPlus, FiTrash2, FiCalendar, FiTarget, FiAlertCircle, FiMenu, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { Reorder } from 'framer-motion';

interface Milestone {
  id: string;
  title: string;
  description: string;
  amount: number;
  deadline: string;
  deliverables: string[];
  verificationMethod: 'manual' | 'automatic' | 'oracle';
}

interface MilestonesStepProps {
  formData: {
    milestones: Milestone[];
    totalAmount: string;
  };
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

const MILESTONE_TEMPLATES = [
  {
    id: 'marketing',
    name: 'Marketing Campaign',
    milestones: [
      { title: 'Campaign Setup', amount: 25, deliverables: ['Strategy document', 'Content calendar'] },
      { title: 'Content Creation', amount: 35, deliverables: ['Social media posts', 'Blog articles'] },
      { title: 'Campaign Launch', amount: 25, deliverables: ['Live campaign', 'Initial metrics'] },
      { title: 'Results & Report', amount: 15, deliverables: ['Analytics report', 'ROI analysis'] },
    ]
  },
  {
    id: 'development',
    name: 'Development Project',
    milestones: [
      { title: 'Planning & Design', amount: 20, deliverables: ['Technical spec', 'Architecture'] },
      { title: 'MVP Development', amount: 40, deliverables: ['Core features', 'Basic UI'] },
      { title: 'Testing & QA', amount: 20, deliverables: ['Test results', 'Bug fixes'] },
      { title: 'Deployment', amount: 20, deliverables: ['Live deployment', 'Documentation'] },
    ]
  },
];

export function MobileEscrowStepMilestones({ formData, onChange, errors }: MilestonesStepProps) {
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: `m-${Date.now()}`,
      title: '',
      description: '',
      amount: 0,
      deadline: '',
      deliverables: [],
      verificationMethod: 'manual',
    };
    onChange('milestones', [...formData.milestones, newMilestone]);
    setExpandedMilestone(newMilestone.id);
  };

  const removeMilestone = (id: string) => {
    onChange('milestones', formData.milestones.filter(m => m.id !== id));
  };

  const updateMilestone = (id: string, field: string, value: any) => {
    onChange('milestones', formData.milestones.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const applyTemplate = (template: typeof MILESTONE_TEMPLATES[0]) => {
    const totalAmount = parseFloat(formData.totalAmount) || 0;
    const milestones = template.milestones.map((m, i) => ({
      id: `m-${Date.now()}-${i}`,
      title: m.title,
      description: '',
      amount: (totalAmount * m.amount / 100),
      deadline: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      deliverables: m.deliverables,
      verificationMethod: 'manual' as const,
    }));
    onChange('milestones', milestones);
    setShowTemplates(false);
  };

  const totalAllocated = formData.milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
  const totalAmount = parseFloat(formData.totalAmount) || 0;
  const remaining = totalAmount - totalAllocated;

  return (
    <div className="px-4 pb-24 space-y-6">
      {/* Progress Bar */}
      <div className="bg-surface2 rounded-xl p-4 border border-border">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-text-primary">Allocation Progress</span>
          <span className={`text-sm font-medium ${remaining === 0 ? 'text-success' : 'text-warning'}`}>
            {remaining > 0 ? `${remaining.toFixed(2)} remaining` : remaining < 0 ? `${Math.abs(remaining).toFixed(2)} over` : 'Perfect!'}
          </span>
        </div>
        <div className="w-full h-2 bg-surface3 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${
              remaining === 0 ? 'bg-success' : remaining > 0 ? 'bg-warning' : 'bg-danger'
            }`}
            style={{ width: `${Math.min(100, (totalAllocated / totalAmount) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-text-muted mt-2">
          {totalAllocated.toFixed(2)} / {totalAmount.toFixed(2)} {formData.totalAmount ? 'allocated' : 'Total amount not set'}
        </p>
      </div>

      {/* Templates */}
      <button
        type="button"
        onClick={() => setShowTemplates(!showTemplates)}
        className="w-full px-4 py-3 bg-primary/10 border border-primary/20 rounded-xl text-primary font-medium hover:bg-primary/20 transition-colors"
      >
        Use Template
      </button>

      {showTemplates && (
        <div className="space-y-2">
          {MILESTONE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => applyTemplate(template)}
              className="w-full p-3 bg-surface2 border border-border rounded-xl hover:border-primary/50 transition-all text-left"
            >
              <p className="font-medium text-text-primary text-sm">{template.name}</p>
              <p className="text-xs text-text-muted mt-1">
                {template.milestones.length} milestones
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Milestones FiList */}
      <div className="space-y-3">
        {formData.milestones.map((milestone, index) => (
          <div
            key={milestone.id}
            className="bg-surface2 border border-border rounded-xl overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpandedMilestone(expandedMilestone === milestone.id ? null : milestone.id)}
              className="w-full p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                  {index + 1}
                </div>
                <div className="text-left">
                  <p className="font-medium text-text-primary text-sm">
                    {milestone.title || `Milestone ${index + 1}`}
                  </p>
                  <p className="text-xs text-text-muted">
                    {milestone.amount || 0} tokens • {milestone.deadline || 'No deadline'}
                  </p>
                </div>
              </div>
              {expandedMilestone === milestone.id ? (
                <FiChevronUp size={18} className="text-text-muted" />
              ) : (
                <FiChevronDown size={18} className="text-text-muted" />
              )}
            </button>

            {expandedMilestone === milestone.id && (
              <div className="px-4 pb-4 space-y-3 border-t border-border">
                <div className="pt-3">
                  <label className="block text-xs font-medium text-text-primary mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={milestone.title}
                    onChange={(e) => updateMilestone(milestone.id, 'title', e.target.value)}
                    placeholder="Milestone title"
                    className="w-full px-3 py-2 bg-surface3 border border-border rounded-lg text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={milestone.amount}
                    onChange={(e) => updateMilestone(milestone.id, 'amount', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-3 py-2 bg-surface3 border border-border rounded-lg text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={milestone.deadline}
                    onChange={(e) => updateMilestone(milestone.id, 'deadline', e.target.value)}
                    className="w-full px-3 py-2 bg-surface3 border border-border rounded-lg text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">
                    Deliverables
                  </label>
                  <input
                    type="text"
                    placeholder="Enter deliverables separated by commas"
                    value={milestone.deliverables.join(', ')}
                    onChange={(e) => updateMilestone(milestone.id, 'deliverables', e.target.value.split(',').map(d => d.trim()).filter(Boolean))}
                    className="w-full px-3 py-2 bg-surface3 border border-border rounded-lg text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeMilestone(milestone.id)}
                  className="w-full px-3 py-2 bg-danger/10 text-danger rounded-lg text-sm font-medium hover:bg-danger/20 transition-colors"
                >
                  Remove Milestone
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Milestone Button */}
      <button
        type="button"
        onClick={addMilestone}
        className="w-full px-4 py-3 bg-surface2 border border-dashed border-border rounded-xl text-text-muted hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
      >
        <FiPlus size={18} />
        <span className="font-medium">Add Milestone</span>
      </button>

      {/* Error Message */}
      {errors.milestones && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 flex items-start gap-2">
          <FiAlertCircle size={16} className="text-danger mt-0.5" />
          <p className="text-sm text-danger">{errors.milestones}</p>
        </div>
      )}
    </div>
  );
}