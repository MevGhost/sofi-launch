'use client';

import React, { useState, useEffect } from 'react';
import { LayoutShell, SectionHeader } from '@/components/alien/Layout';
import { Button } from '@/components/alien/Button';
import { Card } from '@/components/alien/Card';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { showToast } from '@/components/ToastProvider';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAdminStats, useAdminActions, useAdminOperations } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import dynamic from 'next/dynamic';

// Dynamically import mobile component
const MobileAdminPage = dynamic(
  () => import('@/components/mobile/MobileAdminPage').then(mod => ({ default: mod.MobileAdminPage })),
  { 
    loading: () => <div className="min-h-screen bg-canvas animate-pulse" />,
    ssr: false 
  }
);

// Mock admin addresses for demo
const ADMIN_ADDRESSES = [
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Hardhat account 0
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Hardhat account 1
];

export default function AdminDashboard() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const isMobile = useIsMobile();
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'escrows' | 'security' | 'users' | 'settings'>('overview');
  
  // Use real API hooks
  const { stats, loading: statsLoading } = useAdminStats();
  const { actions: pendingActions, loading: actionsLoading, approveAction, rejectAction } = useAdminActions();
  const { emergencyPause, withdrawFees, loading: operationsLoading } = useAdminOperations();

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      showToast.error('Admin access required');
      router.push('/');
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const loading = statsLoading || actionsLoading || operationsLoading;

  // TODO: Fetch admin activity from API
  // Will be populated from admin operations and system events
  const recentActivity: any[] = [];

  const handleEmergencyPause = async () => {
    try {
      await emergencyPause();
      showToast.success('Emergency pause activated');
    } catch (error) {
      showToast.error('Failed to activate emergency pause');
    }
  };

  const handleWithdrawFees = async () => {
    try {
      const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || address!;
      await withdrawFees(treasuryAddress);
      showToast.success('Platform fees withdrawn to treasury');
    } catch (error) {
      showToast.error('Failed to withdraw fees');
    }
  };

  const handleApproveAction = async (actionId: string) => {
    const success = await approveAction(actionId);
    if (success) {
      showToast.success('Action approved successfully');
    } else {
      showToast.error('Failed to approve action');
    }
  };

  const handleRejectAction = async (actionId: string, reason?: string) => {
    const success = await rejectAction(actionId, reason);
    if (success) {
      showToast.success('Action rejected successfully');
    } else {
      showToast.error('Failed to reject action');
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] pt-28">
          <div className="animate-pulse text-text-primary">Checking permissions...</div>
        </div>
      </LayoutShell>
    );
  }

  // This check is redundant since we redirect in useEffect, but keep for safety
  if (!isAuthenticated || !isAdmin) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] pt-28">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-full blur-xl opacity-50 animate-pulse" />
              <div className="relative w-full h-full bg-canvas rounded-full border-2 border-red-500 flex items-center justify-center">
                <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-text-primary mb-4">Access Denied</h2>
            <p className="text-text-muted mb-2">This area is restricted to platform administrators</p>
            <p className="text-text-muted text-sm opacity-60">Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
          </div>
        </div>
      </LayoutShell>
    );
  }

  // Show mobile version if on mobile device
  if (isMobile) {
    return (
      <>
        <MobileAdminPage />
      </>
    );
  }

  return (
    <LayoutShell>
      <div className="container mx-auto px-4 pt-6 pb-8">
        {/* Admin Header */}
        <div
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-text-primary mb-2 font-display tracking-wider flex items-center gap-3">
                ADMIN PANEL
                <span className="text-xs px-2 py-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full text-text-primary font-bold">
                  RESTRICTED
                </span>
              </h1>
              <p className="text-text-muted font-mono text-sm">
                Platform Administration & Security Controls
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleEmergencyPause}
                disabled={loading}
                aria-label="Emergency pause platform"
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg border border-red-500/30 font-medium transition-all disabled:opacity-50"
              >
                Emergency Pause
              </button>
              <button
                onClick={handleWithdrawFees}
                disabled={loading}
                aria-label="Withdraw platform fees"
                className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg border border-green-500/30 font-medium transition-all disabled:opacity-50"
              >
                Withdraw Fees
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className="mb-8"
        >
          <div className="flex gap-4 border-b border-border">
            {(['overview', 'escrows', 'security', 'users', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 px-2 font-medium transition-all relative capitalize ${
                  activeTab === tab
                    ? 'text-text-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#0052FF] to-[#06B6D4]"
                  />
                )}
                {tab === 'security' && stats?.securityAlerts && stats.securityAlerts > 0 && (
                  <span className="ml-2 text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">
                    {stats.securityAlerts}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div
                className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-text-muted text-sm">Total Escrows</p>
                  <svg className="w-5 h-5 text-[#0EA5E9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-text-primary">{stats?.totalEscrows || 0}</p>
                <p className="text-green-400 text-sm mt-2">+12% from last month</p>
              </div>

              <div
                className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-text-muted text-sm">Total Volume</p>
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-text-primary">${stats ? (parseFloat(stats.totalVolume) / 1000000).toFixed(2) : '0.00'}M</p>
                <p className="text-green-400 text-sm mt-2">+24% from last month</p>
              </div>

              <div
                className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-text-muted text-sm">Platform Fees</p>
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-text-primary">${stats ? (parseFloat(stats.platformFees) / 1000000).toFixed(2) : '0.00'}K</p>
                <p className="text-blue-400 text-sm mt-2">2.5% fee rate</p>
              </div>

              <div
                className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-text-muted text-sm">Active Disputes</p>
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-text-primary">{stats?.activeDisputes || 0}</p>
                <p className="text-red-400 text-sm mt-2">Requires attention</p>
              </div>
            </div>

            {/* Pending Actions */}
            <div
              className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-text-primary mb-6">Pending Actions</h3>
              <div className="space-y-4">
                {pendingActions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between p-4 bg-surface3 rounded-xl hover:bg-surface3 opacity-80 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${
                        action.type === 'DISPUTE_RESOLUTION' ? 'bg-red-500' : 
                        action.type === 'EMERGENCY_CLAWBACK' ? 'bg-orange-500' :
                        'bg-yellow-500'
                      } animate-pulse`} />
                      <div>
                        <p className="text-text-primary font-medium">{action.type.replace(/_/g, ' ')}</p>
                        <p className="text-text-muted opacity-60 text-sm">
                          {action.escrow && `Escrow: ${action.escrow}`}
                          {action.amount && ` • Amount: ${action.amount}`}
                          {action.parties && ` • ${action.parties}`}
                          {action.reason && ` • ${action.reason}`}
                          {action.destination && ` • To: ${action.destination}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-text-muted opacity-60 text-sm">{action.time}</span>
                      <button className="px-3 py-1.5 bg-[#0052FF]/20 hover:bg-[#0052FF]/30 text-[#0EA5E9] rounded-lg text-sm font-medium transition-all">
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div
              className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-text-primary mb-6">Recent Platform Activity</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-text-muted text-sm">Action</th>
                      <th className="px-4 py-3 text-left text-text-muted text-sm">User/System</th>
                      <th className="px-4 py-3 text-left text-text-muted text-sm">Details</th>
                      <th className="px-4 py-3 text-left text-text-muted text-sm">Time</th>
                      <th className="px-4 py-3 text-left text-text-muted text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((activity) => (
                      <tr key={activity.id} className="border-b border-border opacity-60 hover:bg-surface3">
                        <td className="px-4 py-3 text-text-primary">{activity.action}</td>
                        <td className="px-4 py-3 text-text-secondary font-mono text-sm">{activity.user}</td>
                        <td className="px-4 py-3 text-text-muted text-sm">
                          {activity.amount && `Amount: ${activity.amount}`}
                          {activity.escrow && `Escrow: ${activity.escrow}`}
                          {activity.milestone && `Milestone: ${activity.milestone}`}
                          {activity.contract && `Contract: ${activity.contract}`}
                        </td>
                        <td className="px-4 py-3 text-text-muted opacity-60 text-sm">{activity.time}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            activity.status === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            activity.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {activity.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div
            className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6"
          >
            <h3 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Security Controls
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-text-secondary font-medium">Contract Controls</h4>
                <button className="w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 text-left transition-all">
                  <div className="flex items-center justify-between">
                    <span>Pause Factory Contract</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </button>
                <button className="w-full px-4 py-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/30 text-left transition-all">
                  <div className="flex items-center justify-between">
                    <span>Update Implementation</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                </button>
              </div>
              <div className="space-y-4">
                <h4 className="text-text-secondary font-medium">Multi-Sig Status</h4>
                <div className="p-4 bg-surface3 rounded-lg">
                  <p className="text-text-muted text-sm mb-2">Current Signers: 3/5</p>
                  <p className="text-text-muted text-sm mb-2">Pending Transactions: 2</p>
                  <p className="text-text-muted text-sm">Last Execution: 2 hours ago</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Escrows Tab */}
        {activeTab === 'escrows' && (
          <div className="space-y-6">
            {/* Escrows Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div
                className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6"
              >
                <p className="text-text-muted text-sm mb-2">Active Escrows</p>
                <p className="text-2xl font-bold text-text-primary">47</p>
                <p className="text-green-400 text-sm mt-2">↑ 23% this week</p>
              </div>
              <div
                className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6"
              >
                <p className="text-text-muted text-sm mb-2">Paused Escrows</p>
                <p className="text-2xl font-bold text-text-primary">3</p>
                <p className="text-yellow-400 text-sm mt-2">Requires review</p>
              </div>
              <div
                className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6"
              >
                <p className="text-text-muted text-sm mb-2">Completed Today</p>
                <p className="text-2xl font-bold text-text-primary">8</p>
                <p className="text-blue-400 text-sm mt-2">$1.2M released</p>
              </div>
            </div>

            {/* Escrows Table */}
            <div
              className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-text-primary">All Escrows</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Search escrows..."
                    className="px-4 py-2 bg-surface3 border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-[#0EA5E9]/50"
                  />
                  <select className="px-4 py-2 bg-surface3 border border-border rounded-lg text-text-primary focus:outline-none focus:border-[#0EA5E9]/50">
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-text-muted text-sm">Escrow ID</th>
                      <th className="px-4 py-3 text-left text-text-muted text-sm">Project</th>
                      <th className="px-4 py-3 text-left text-text-muted text-sm">KOL</th>
                      <th className="px-4 py-3 text-left text-text-muted text-sm">Amount</th>
                      <th className="px-4 py-3 text-left text-text-muted text-sm">Progress</th>
                      <th className="px-4 py-3 text-left text-text-muted text-sm">Status</th>
                      <th className="px-4 py-3 text-left text-text-muted text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 'ESC001', project: '0x742d...bEb8', kol: '0x5aAe...eAed', amount: '$250,000', progress: 60, status: 'active', fee: '2.5%' },
                      { id: 'ESC002', project: '0xfB69...d359', kol: '0x3C44...93BC', amount: '$100,000', progress: 30, status: 'paused', fee: '2.5%' },
                      { id: 'ESC003', project: '0x1234...5678', kol: '0xABCD...EF01', amount: '$500,000', progress: 100, status: 'completed', fee: '2.5%' },
                      { id: 'ESC004', project: '0x9876...5432', kol: '0xFEDC...BA98', amount: '$75,000', progress: 45, status: 'active', fee: '3.0%' },
                      { id: 'ESC005', project: '0x1111...2222', kol: '0x3333...4444', amount: '$150,000', progress: 0, status: 'pending', fee: '2.5%' },
                    ].map((escrow) => (
                      <tr key={escrow.id} className="border-b border-border opacity-60 hover:bg-surface3">
                        <td className="px-4 py-3 text-text-primary font-mono">{escrow.id}</td>
                        <td className="px-4 py-3 text-text-secondary font-mono text-sm">{escrow.project}</td>
                        <td className="px-4 py-3 text-text-secondary font-mono text-sm">{escrow.kol}</td>
                        <td className="px-4 py-3 text-text-primary">{escrow.amount}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-surface3 opacity-60 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-[#0052FF] to-[#06B6D4]"
                                style={{ width: `${escrow.progress}%` }}
                              />
                            </div>
                            <span className="text-text-muted text-sm">{escrow.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            escrow.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            escrow.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            escrow.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            'bg-gray-500/20 text-text-muted border border-gray-500/30'
                          }`}>
                            {escrow.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {escrow.status === 'paused' ? (
                              <button className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-xs font-medium transition-all">
                                Resume
                              </button>
                            ) : escrow.status === 'active' ? (
                              <button className="px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded text-xs font-medium transition-all">
                                Pause
                              </button>
                            ) : null}
                            <button className="px-3 py-1 bg-[#0052FF]/20 hover:bg-[#0052FF]/30 text-[#0EA5E9] rounded text-xs font-medium transition-all">
                              View
                            </button>
                            <button className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded text-xs font-medium transition-all">
                              Fee: {escrow.fee}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex items-center justify-between mt-6">
                <p className="text-text-muted opacity-60 text-sm">Showing 1 to 5 of 142 escrows</p>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-surface3 hover:bg-surface2 opacity-90 text-text-primary rounded transition-all">Previous</button>
                  <button className="px-3 py-1 bg-[#0052FF]/20 text-text-primary rounded">1</button>
                  <button className="px-3 py-1 bg-surface3 hover:bg-surface2 opacity-90 text-text-primary rounded transition-all">2</button>
                  <button className="px-3 py-1 bg-surface3 hover:bg-surface2 opacity-90 text-text-primary rounded transition-all">3</button>
                  <button className="px-3 py-1 bg-surface3 hover:bg-surface2 opacity-90 text-text-primary rounded transition-all">Next</button>
                </div>
              </div>
            </div>

            {/* Emergency Actions */}
            <div
              className="bg-red-500/[0.05] backdrop-blur-xl border border-red-500/[0.2] rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Emergency Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 transition-all">
                  Pause All Escrows
                </button>
                <button className="px-4 py-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/30 transition-all">
                  Emergency Clawback
                </button>
                <button className="px-4 py-3 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg border border-yellow-500/30 transition-all">
                  Freeze Withdrawals
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* User Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div
                className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6"
              >
                <p className="text-text-muted text-sm mb-2">Total Users</p>
                <p className="text-2xl font-bold text-text-primary">3,291</p>
                <p className="text-green-400 text-sm mt-2">+142 this week</p>
              </div>
              <div
                className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6"
              >
                <p className="text-text-muted text-sm mb-2">Verified KOLs</p>
                <p className="text-2xl font-bold text-text-primary">284</p>
                <p className="text-blue-400 text-sm mt-2">8.6% of total</p>
              </div>
              <div
                className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6"
              >
                <p className="text-text-muted text-sm mb-2">Active Projects</p>
                <p className="text-2xl font-bold text-text-primary">423</p>
                <p className="text-purple-400 text-sm mt-2">12.9% of total</p>
              </div>
              <div
                className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6"
              >
                <p className="text-text-muted text-sm mb-2">Banned Users</p>
                <p className="text-2xl font-bold text-text-primary">17</p>
                <p className="text-red-400 text-sm mt-2">0.5% of total</p>
              </div>
            </div>

            {/* Users Table */}
            <div
              className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-text-primary">User Management</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Search by address or username..."
                    className="px-4 py-2 bg-surface3 border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-[#0EA5E9]/50 w-64"
                  />
                  <select className="px-4 py-2 bg-surface3 border border-border rounded-lg text-text-primary focus:outline-none focus:border-[#0EA5E9]/50">
                    <option value="all">All Users</option>
                    <option value="kol">KOLs</option>
                    <option value="project">Projects</option>
                    <option value="verified">Verified</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-text-muted text-sm">Address</th>
                      <th className="px-4 py-3 text-left text-text-muted text-sm">Username</th>
                      <th className="px-4 py-3 text-left text-text-muted text-sm">Type</th>
                      <th className="px-4 py-3 text-left text-text-muted text-sm">Escrows</th>
                      <th className="px-4 py-3 text-left text-text-muted text-sm">Volume</th>
                      <th className="px-4 py-3 text-left text-text-muted text-sm">Status</th>
                      <th className="px-4 py-3 text-left text-text-muted text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { address: '0x742d...bEb8', username: 'CryptoWhale', type: 'KOL', escrows: 23, volume: '$2.5M', status: 'verified', joined: '2024-01-15' },
                      { address: '0x5aAe...eAed', username: 'MoonProject', type: 'Project', escrows: 8, volume: '$750K', status: 'active', joined: '2024-02-20' },
                      { address: '0xfB69...d359', username: 'DeFiGuru', type: 'KOL', escrows: 45, volume: '$5.2M', status: 'verified', joined: '2023-11-10' },
                      { address: '0x3C44...93BC', username: null, type: 'User', escrows: 0, volume: '$0', status: 'banned', joined: '2024-03-01' },
                      { address: '0x1234...5678', username: 'AlphaDAO', type: 'Project', escrows: 12, volume: '$1.8M', status: 'active', joined: '2024-01-28' },
                      { address: '0xABCD...EF01', username: 'TechInfluencer', type: 'KOL', escrows: 31, volume: '$3.7M', status: 'pending', joined: '2024-03-15' },
                    ].map((user, index) => (
                      <tr key={index} className="border-b border-border opacity-60 hover:bg-surface3">
                        <td className="px-4 py-3 text-text-primary font-mono text-sm">{user.address}</td>
                        <td className="px-4 py-3 text-text-primary">{user.username || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.type === 'KOL' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                            user.type === 'Project' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            'bg-gray-500/20 text-text-muted border border-gray-500/30'
                          }`}>
                            {user.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-primary">{user.escrows}</td>
                        <td className="px-4 py-3 text-text-primary">{user.volume}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.status === 'verified' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            user.status === 'active' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            user.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {user.status === 'banned' ? (
                              <button className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-xs font-medium transition-all">
                                Unban
                              </button>
                            ) : (
                              <button className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs font-medium transition-all">
                                Ban
                              </button>
                            )}
                            {user.type === 'KOL' && user.status === 'pending' && (
                              <button className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-xs font-medium transition-all">
                                Verify
                              </button>
                            )}
                            <button className="px-3 py-1 bg-[#0052FF]/20 hover:bg-[#0052FF]/30 text-[#0EA5E9] rounded text-xs font-medium transition-all">
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex items-center justify-between mt-6">
                <p className="text-text-muted opacity-60 text-sm">Showing 1 to 6 of 3,291 users</p>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-surface3 hover:bg-surface2 opacity-90 text-text-primary rounded transition-all">Previous</button>
                  <button className="px-3 py-1 bg-[#0052FF]/20 text-text-primary rounded">1</button>
                  <button className="px-3 py-1 bg-surface3 hover:bg-surface2 opacity-90 text-text-primary rounded transition-all">2</button>
                  <button className="px-3 py-1 bg-surface3 hover:bg-surface2 opacity-90 text-text-primary rounded transition-all">3</button>
                  <button className="px-3 py-1 bg-surface3 hover:bg-surface2 opacity-90 text-text-primary rounded transition-all">Next</button>
                </div>
              </div>
            </div>

            {/* KOL Verification Queue */}
            <div
              className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-text-primary mb-4">Pending KOL Verifications</h3>
              <div className="space-y-3">
                {[
                  { username: 'CryptoExpert', followers: '125K', platform: 'Twitter', submitted: '2 hours ago' },
                  { username: 'BlockchainGuru', followers: '89K', platform: 'YouTube', submitted: '5 hours ago' },
                  { username: 'DeFiMaster', followers: '234K', platform: 'Twitter', submitted: '1 day ago' },
                ].map((verification, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-surface3 rounded-xl hover:bg-surface3 opacity-80 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                      <div>
                        <p className="text-text-primary font-medium">{verification.username}</p>
                        <p className="text-text-muted opacity-60 text-sm">{verification.platform} • {verification.followers} followers</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-text-muted opacity-60 text-sm">{verification.submitted}</span>
                      <button className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-all">
                        Approve
                      </button>
                      <button className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-all">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Platform Settings */}
            <div
              className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-text-primary mb-6">Platform Configuration</h3>
              
              <div className="space-y-6">
                {/* Fee Settings */}
                <div>
                  <h4 className="text-text-secondary font-medium mb-4">Fee Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-text-muted text-sm mb-2">Platform Fee (%)</label>
                      <input
                        type="number"
                        defaultValue="2.5"
                        step="0.1"
                        min="0"
                        max="10"
                        className="w-full px-4 py-2 bg-surface3 border border-border rounded-lg text-text-primary focus:outline-none focus:border-[#0EA5E9]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-text-muted text-sm mb-2">Minimum Escrow Amount (USDC)</label>
                      <input
                        type="number"
                        defaultValue="1000"
                        step="100"
                        min="0"
                        className="w-full px-4 py-2 bg-surface3 border border-border rounded-lg text-text-primary focus:outline-none focus:border-[#0EA5E9]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-text-muted text-sm mb-2">Dispute Resolution Fee (USDC)</label>
                      <input
                        type="number"
                        defaultValue="100"
                        step="10"
                        min="0"
                        className="w-full px-4 py-2 bg-surface3 border border-border rounded-lg text-text-primary focus:outline-none focus:border-[#0EA5E9]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-text-muted text-sm mb-2">Fee Recipient Address</label>
                      <input
                        type="text"
                        defaultValue="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8"
                        className="w-full px-4 py-2 bg-surface3 border border-border rounded-lg text-text-primary font-mono text-sm focus:outline-none focus:border-[#0EA5E9]/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Contract Addresses */}
                <div>
                  <h4 className="text-text-secondary font-medium mb-4">Contract Addresses</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-text-muted text-sm mb-2">Escrow Factory (Base)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          defaultValue="0x5FbDB2315678afecb367f032d93F642f64180aa3"
                          className="flex-1 px-4 py-2 bg-surface3 border border-border rounded-lg text-text-primary font-mono text-sm focus:outline-none focus:border-[#0EA5E9]/50"
                          readOnly
                        />
                        <button className="px-4 py-2 bg-[#0052FF]/20 hover:bg-[#0052FF]/30 text-[#0EA5E9] rounded-lg font-medium transition-all">
                          Update
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-text-muted text-sm mb-2">Admin Factory (Base)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          defaultValue="0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
                          className="flex-1 px-4 py-2 bg-surface3 border border-border rounded-lg text-text-primary font-mono text-sm focus:outline-none focus:border-[#0EA5E9]/50"
                          readOnly
                        />
                        <button className="px-4 py-2 bg-[#0052FF]/20 hover:bg-[#0052FF]/30 text-[#0EA5E9] rounded-lg font-medium transition-all">
                          Update
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-text-muted text-sm mb-2">Solana Program ID</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          defaultValue="3yZrv8dZYgK2RB94gGnECWKrKC3zkdmCodUtP6qqm5dk"
                          className="flex-1 px-4 py-2 bg-surface3 border border-border rounded-lg text-text-primary font-mono text-sm focus:outline-none focus:border-[#0EA5E9]/50"
                          readOnly
                        />
                        <button className="px-4 py-2 bg-[#0052FF]/20 hover:bg-[#0052FF]/30 text-[#0EA5E9] rounded-lg font-medium transition-all">
                          Update
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Maintenance Mode */}
                <div>
                  <h4 className="text-text-secondary font-medium mb-4">Maintenance Mode</h4>
                  <div className="flex items-center justify-between p-4 bg-surface3 rounded-xl">
                    <div>
                      <p className="text-text-primary">Platform Status</p>
                      <p className="text-text-muted opacity-60 text-sm">Toggle maintenance mode for the entire platform</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-500/30 transition-colors">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-green-400 transition-transform translate-x-6" />
                    </button>
                  </div>
                </div>

                {/* Oracle Settings */}
                <div>
                  <h4 className="text-text-secondary font-medium mb-4">Oracle Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-text-muted text-sm mb-2">Chainlink Price Feed (ETH/USD)</label>
                      <input
                        type="text"
                        defaultValue="0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"
                        className="w-full px-4 py-2 bg-surface3 border border-border rounded-lg text-text-primary font-mono text-sm focus:outline-none focus:border-[#0EA5E9]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-text-muted text-sm mb-2">Price Update Frequency (seconds)</label>
                      <input
                        type="number"
                        defaultValue="3600"
                        step="60"
                        min="60"
                        className="w-full px-4 py-2 bg-surface3 border border-border rounded-lg text-text-primary focus:outline-none focus:border-[#0EA5E9]/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-3 pt-4">
                  <button className="px-6 py-2 bg-surface3 hover:bg-surface2 opacity-90 text-text-primary rounded-lg font-medium transition-all">
                    Reset to Defaults
                  </button>
                  <button className="px-6 py-2 bg-gradient-to-r from-[#0052FF] to-[#06B6D4] hover:opacity-90 text-text-primary rounded-lg font-medium transition-all">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>

            {/* Access Control */}
            <div
              className="bg-surface2 backdrop-blur-xl border border-border rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-text-primary mb-6">Access Control</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-text-secondary font-medium mb-4">Admin Addresses</h4>
                  <div className="space-y-3">
                    {[
                      '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
                      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
                    ].map((address, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-surface3 rounded-lg">
                        <span className="text-text-primary font-mono text-sm">{address}</span>
                        <button className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs font-medium transition-all">
                          Remove
                        </button>
                      </div>
                    ))}
                    <button className="w-full px-4 py-2 bg-[#0052FF]/20 hover:bg-[#0052FF]/30 text-[#0EA5E9] rounded-lg font-medium transition-all">
                      Add Admin Address
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-text-secondary font-medium mb-4">Multi-Signature Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-text-muted text-sm mb-2">Required Signatures</label>
                      <input
                        type="number"
                        defaultValue="2"
                        min="1"
                        max="5"
                        className="w-full px-4 py-2 bg-surface3 border border-border rounded-lg text-text-primary focus:outline-none focus:border-[#0EA5E9]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-text-muted text-sm mb-2">Total Signers</label>
                      <input
                        type="number"
                        defaultValue="3"
                        min="1"
                        max="10"
                        className="w-full px-4 py-2 bg-surface3 border border-border rounded-lg text-text-primary focus:outline-none focus:border-[#0EA5E9]/50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}