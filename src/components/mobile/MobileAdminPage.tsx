'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileLayout, MobileCard } from './MobileLayout';
import {
  FiShield,
  FiUsers,
  FiActivity,
  FiDollarSign,
  FiTrendingUp,
  FiSettings,
  FiBell,
  FiLock,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiAlertTriangle,
  FiRefreshCw,
  FiChevronRight,
  FiFilter,
  FiSearch,
  FiMoreVertical,
  FiEye,
  FiEyeOff,
  FiZap,
  FiDatabase,
  FiServer,
  FiGlobe,
  FiUserCheck,
  FiUserX,
  FiFileText,
  FiDownload,
  FiUpload,
  FiTrash2,
  FiEdit3,
  FiCopy,
  FiArrowUpRight,
  FiArrowDownRight
} from 'react-icons/fi';
import { BottomSheet, MiniBottomSheet } from './BottomSheet';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';

interface StatCard {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: string;
}

interface User {
  id: string;
  address: string;
  role: 'admin' | 'kol' | 'user' | 'verifier';
  status: 'active' | 'suspended' | 'pending';
  escrowCount: number;
  totalVolume: string;
  joinedDate: string;
  lastActive: string;
}

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

// Mock data
const mockStats: StatCard[] = [
  { title: 'Total Users', value: '12,543', change: 12.5, icon: FiUsers, color: 'from-blue-500 to-blue-600' },
  { title: 'Active Escrows', value: '847', change: 8.3, icon: FiShield, color: 'from-green-500 to-green-600' },
  { title: 'Total Volume', value: '$2.4M', change: 25.7, icon: FiDollarSign, color: 'from-purple-500 to-purple-600' },
  { title: 'Platform Fees', value: '$48.2K', change: 15.2, icon: FiTrendingUp, color: 'from-orange-500 to-orange-600' }
];


const mockAlerts: SystemAlert[] = [
  {
    id: '1',
    type: 'warning',
    title: 'High Gas Prices',
    message: 'Network congestion detected. Gas prices above normal.',
    timestamp: '10 mins ago',
    resolved: false
  },
  {
    id: '2',
    type: 'error',
    title: 'Failed Transaction',
    message: 'Escrow #847 failed to process. Manual intervention required.',
    timestamp: '1 hour ago',
    resolved: false
  }
];

export function MobileAdminPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'escrows' | 'settings'>('overview');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSystemSheet, setShowSystemSheet] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SystemAlert | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUsers();
    setIsRefreshing(false);
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/admin/users`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setUsers(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-red-400 bg-red-400/20';
      case 'kol': return 'text-purple-400 bg-purple-400/20';
      case 'verifier': return 'text-blue-400 bg-blue-400/20';
      default: return 'text-text-muted bg-gray-400/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/20';
      case 'suspended': return 'text-red-400 bg-red-400/20';
      case 'pending': return 'text-yellow-400 bg-yellow-400/20';
      default: return 'text-text-muted bg-gray-400/20';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return FiAlertTriangle;
      case 'error': return FiXCircle;
      case 'success': return FiCheckCircle;
      default: return FiBell;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning': return 'text-yellow-400 bg-yellow-400/20';
      case 'error': return 'text-red-400 bg-red-400/20';
      case 'success': return 'text-green-400 bg-green-400/20';
      default: return 'text-blue-400 bg-blue-400/20';
    }
  };

  // Check admin access
  const isAdmin = true; // In production, check actual admin status

  if (!isConnected || !isAdmin) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full flex items-center justify-center">
            <FiLock className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-3">Admin Access Required</h2>
          <p className="text-text-primary/60 text-sm mb-8 max-w-xs mx-auto">
            You need admin privileges to access this page
          </p>
          <button
            onClick={() => router.push('/portfolio')}
            className="px-6 py-3 bg-gradient-to-r from-[#0052FF] to-[#0EA5E9] text-text-primary font-semibold rounded-xl"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <MobileLayout showNav title="Admin Panel">
      <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-14 z-30 bg-canvas/90 backdrop-blur-xl border-b border-border">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-text-primary">Admin Dashboard</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSystemSheet(true)}
                className="relative p-2 bg-surface3 rounded-lg"
              >
                <FiBell className="w-4 h-4 text-text-primary/60" />
                {mockAlerts.filter(a => !a.resolved).length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
              <button
                onClick={handleRefresh}
                className={`p-2 ${isRefreshing ? 'animate-spin' : ''}`}
              >
                <FiRefreshCw className="w-4 h-4 text-text-primary/60" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {(['overview', 'users', 'escrows', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-all ${
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
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="p-4"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {mockStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-surface2 backdrop-blur-xl rounded-2xl p-4 border border-border"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-text-primary" />
                      </div>
                      {stat.change && (
                        <span className={`text-xs flex items-center gap-0.5 ${
                          stat.change >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {stat.change >= 0 ? <FiArrowUpRight className="w-3 h-3" /> : <FiArrowDownRight className="w-3 h-3" />}
                          {Math.abs(stat.change)}%
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-bold text-text-primary mb-1">{stat.value}</p>
                    <p className="text-xs text-text-primary/40">{stat.title}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* System Status */}
            <div className="bg-surface2 rounded-2xl p-4 border border-border mb-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">System Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-400/20 rounded-lg flex items-center justify-center">
                      <FiServer className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-text-primary">API Server</p>
                      <p className="text-xs text-text-primary/40">Response time: 45ms</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-green-400/20 text-green-400 text-xs rounded-full">
                    Operational
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-400/20 rounded-lg flex items-center justify-center">
                      <FiDatabase className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-text-primary">Database</p>
                      <p className="text-xs text-text-primary/40">Uptime: 99.9%</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-green-400/20 text-green-400 text-xs rounded-full">
                    Healthy
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-400/20 rounded-lg flex items-center justify-center">
                      <FiGlobe className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm text-text-primary">Network</p>
                      <p className="text-xs text-text-primary/40">Gas: 25 Gwei</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-yellow-400/20 text-yellow-400 text-xs rounded-full">
                    Congested
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="bg-surface2 rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-text-primary">Recent Alerts</h3>
                <button
                  onClick={() => setShowSystemSheet(true)}
                  className="text-xs text-[#0EA5E9]"
                >
                  View All
                </button>
              </div>
              <div className="space-y-2">
                {mockAlerts.slice(0, 3).map((alert) => {
                  const Icon = getAlertIcon(alert.type);
                  return (
                    <button
                      key={alert.id}
                      onClick={() => setSelectedAlert(alert)}
                      className="w-full text-left p-3 bg-surface2 rounded-xl hover:bg-surface3 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getAlertColor(alert.type)}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-text-primary">{alert.title}</p>
                          <p className="text-xs text-text-primary/40 line-clamp-1">{alert.message}</p>
                          <p className="text-[10px] text-text-primary/30 mt-1">{alert.timestamp}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="p-4"
          >
            {/* FiSearch Bar */}
            <div className="relative mb-4">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-primary/40" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface3 border border-border rounded-xl pl-10 pr-10 py-3 text-sm text-text-primary placeholder-white/30"
              />
              <button
                onClick={() => setShowFilterSheet(true)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              >
                <FiFilter className="w-4 h-4 text-text-primary/40" />
              </button>
            </div>

            {/* User List */}
            <div className="space-y-3">
              {users.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedUser(user)}
                  className="bg-surface2 backdrop-blur-xl rounded-2xl p-4 border border-border"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-mono text-text-primary mb-1">{user.address}</p>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(user.status)}`}>
                          {user.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle more options
                      }}
                      className="p-1"
                    >
                      <FiMoreVertical className="w-4 h-4 text-text-primary/40" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <p className="text-xs text-text-primary/40">Escrows</p>
                      <p className="text-sm font-semibold text-text-primary">{user.escrowCount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-text-primary/40">Volume</p>
                      <p className="text-sm font-semibold text-text-primary">{user.totalVolume}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-text-primary/40">Active</p>
                      <p className="text-sm font-semibold text-text-primary">{user.lastActive}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="p-4 space-y-4"
          >
            <div className="bg-surface2 rounded-2xl p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Platform Settings</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-3 bg-surface2 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FiDollarSign className="w-4 h-4 text-text-primary/60" />
                    <div className="text-left">
                      <p className="text-sm text-text-primary">Platform Fee</p>
                      <p className="text-xs text-text-primary/40">Current: 2.5%</p>
                    </div>
                  </div>
                  <FiChevronRight className="w-4 h-4 text-text-primary/40" />
                </button>

                <button className="w-full flex items-center justify-between p-3 bg-surface2 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FiShield className="w-4 h-4 text-text-primary/60" />
                    <div className="text-left">
                      <p className="text-sm text-text-primary">Security</p>
                      <p className="text-xs text-text-primary/40">2FA, Whitelist</p>
                    </div>
                  </div>
                  <FiChevronRight className="w-4 h-4 text-text-primary/40" />
                </button>

                <button className="w-full flex items-center justify-between p-3 bg-surface2 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FiBell className="w-4 h-4 text-text-primary/60" />
                    <div className="text-left">
                      <p className="text-sm text-text-primary">Notifications</p>
                      <p className="text-xs text-text-primary/40">Email, Push</p>
                    </div>
                  </div>
                  <FiChevronRight className="w-4 h-4 text-text-primary/40" />
                </button>
              </div>
            </div>

            <div className="bg-surface2 rounded-2xl p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Data Management</h3>
              <div className="space-y-3">
                <button className="w-full py-3 bg-surface3 text-text-primary text-sm rounded-xl flex items-center justify-center gap-2">
                  <FiDownload className="w-4 h-4" />
                  Export Data
                </button>
                <button className="w-full py-3 bg-surface3 text-text-primary text-sm rounded-xl flex items-center justify-center gap-2">
                  <FiUpload className="w-4 h-4" />
                  Import Data
                </button>
                <button className="w-full py-3 bg-red-500/20 text-red-400 text-sm rounded-xl flex items-center justify-center gap-2">
                  <FiTrash2 className="w-4 h-4" />
                  Clear Cache
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Detail Bottom Sheet */}
      <BottomSheet
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="User Details"
        snapPoints={[70, 90]}
      >
        {selectedUser && (
          <div className="p-4 space-y-4">
            <div className="bg-surface2 rounded-xl p-4">
              <p className="text-xs text-text-primary/60 mb-2">Token Address</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-mono text-text-primary">{selectedUser.address}</p>
                <button className="p-2 bg-surface3 rounded-lg">
                  <FiCopy className="w-4 h-4 text-text-primary/60" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface2 rounded-xl p-3">
                <p className="text-xs text-text-primary/40 mb-1">Role</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(selectedUser.role)}`}>
                  {selectedUser.role}
                </span>
              </div>
              <div className="bg-surface2 rounded-xl p-3">
                <p className="text-xs text-text-primary/40 mb-1">Status</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedUser.status)}`}>
                  {selectedUser.status}
                </span>
              </div>
            </div>

            <div className="bg-surface2 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-text-primary mb-3">Activity Stats</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-primary/40">Total Escrows</span>
                  <span className="text-xs text-text-primary">{selectedUser.escrowCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-primary/40">Total Volume</span>
                  <span className="text-xs text-text-primary">{selectedUser.totalVolume}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-primary/40">Joined</span>
                  <span className="text-xs text-text-primary">{selectedUser.joinedDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-primary/40">Last Active</span>
                  <span className="text-xs text-text-primary">{selectedUser.lastActive}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {selectedUser.status === 'active' ? (
                <button className="py-3 bg-red-500/20 text-red-400 font-semibold rounded-xl">
                  Suspend User
                </button>
              ) : (
                <button className="py-3 bg-green-500/20 text-green-400 font-semibold rounded-xl">
                  Activate User
                </button>
              )}
              <button className="py-3 bg-surface3 text-text-primary font-semibold rounded-xl border border-border">
                View History
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* System Alerts Bottom Sheet */}
      <BottomSheet
        isOpen={showSystemSheet}
        onClose={() => setShowSystemSheet(false)}
        title="System Alerts"
        snapPoints={[60, 90]}
      >
        <div className="p-4 space-y-3">
          {mockAlerts.map((alert) => {
            const Icon = getAlertIcon(alert.type);
            return (
              <div
                key={alert.id}
                className="bg-surface2 rounded-xl p-4 border border-border"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getAlertColor(alert.type)}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="text-sm font-semibold text-text-primary">{alert.title}</h4>
                      {!alert.resolved && (
                        <button className="text-xs text-[#0EA5E9]">Resolve</button>
                      )}
                    </div>
                    <p className="text-xs text-text-primary/60 mb-2">{alert.message}</p>
                    <p className="text-[10px] text-text-primary/40">{alert.timestamp}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </BottomSheet>
      </div>
    </MobileLayout>
  );
}