'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { API_ENDPOINTS, apiRequest, wsManager, WS_EVENTS } from '@/lib/api/config';

export interface PlatformStats {
  totalEscrows: number;
  activeEscrows: number;
  totalVolume: string;
  platformFees: string;
  totalUsers: number;
  activeDisputes: number;
  pendingApprovals: number;
  securityAlerts: number;
}

export interface AdminAction {
  id: string;
  type: 'MILESTONE_RELEASE' | 'DISPUTE_RESOLUTION' | 'EMERGENCY_CLAWBACK' | 'FEE_WITHDRAWAL';
  escrow?: string;
  amount?: string;
  parties?: string;
  reason?: string;
  destination?: string;
  time: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface AdminActivity {
  id: string;
  action: string;
  user: string;
  amount?: string;
  escrow?: string;
  milestone?: string;
  contract?: string;
  time: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

/**
 * Hook for admin dashboard statistics
 */
export function useAdminStats() {
  const { address } = useAccount();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest<{ success: boolean; data: PlatformStats }>(
        API_ENDPOINTS.admin.dashboard
      );
      
      if (response.success) {
        setStats(response.data);
      } else {
        throw new Error('Failed to fetch admin stats');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch admin stats';
      setError(errorMessage);
      console.error('Error fetching admin stats:', err);
      
      // Fallback to mock data for development
      if (process.env.NODE_ENV === 'development') {
        setStats({
          totalEscrows: 142,
          activeEscrows: 47,
          totalVolume: '2847500000000',
          platformFees: '71187500000',
          totalUsers: 3291,
          activeDisputes: 3,
          pendingApprovals: 8,
          securityAlerts: 1,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to WebSocket events for real-time updates
  useEffect(() => {
    if (!wsManager) return;

    const unsubscribeEscrow = wsManager.on(WS_EVENTS.ESCROW_CREATED, () => {
      fetchStats(); // Refresh stats when new escrow is created
    });

    const unsubscribeDispute = wsManager.on(WS_EVENTS.ESCROW_DISPUTED, () => {
      fetchStats(); // Refresh stats when dispute is raised
    });

    return () => {
      unsubscribeEscrow();
      unsubscribeDispute();
    };
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

/**
 * Hook for admin pending actions
 */
export function useAdminActions() {
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest<{ success: boolean; data: AdminAction[] }>(
        `${API_ENDPOINTS.admin.escrows}?status=pending`
      );
      
      if (response.success) {
        setActions(response.data);
      } else {
        throw new Error('Failed to fetch pending actions');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch pending actions';
      setError(errorMessage);
      console.error('Error fetching pending actions:', err);
      
      // Fallback to mock data for development
      if (process.env.NODE_ENV === 'development') {
        setActions([
          { id: '1', type: 'MILESTONE_RELEASE', escrow: '#ESC789', amount: '$50,000', time: '2 hours ago' },
          { id: '2', type: 'DISPUTE_RESOLUTION', escrow: '#ESC456', parties: 'TeamX vs KOL123', time: '5 hours ago' },
          { id: '3', type: 'EMERGENCY_CLAWBACK', escrow: '#ESC123', reason: 'Contract breach', time: '1 day ago' },
          { id: '4', type: 'FEE_WITHDRAWAL', amount: '$71,187.50', destination: 'Treasury', time: '3 days ago' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const approveAction = useCallback(async (actionId: string) => {
    try {
      const response = await apiRequest<{ success: boolean }>(
        `${API_ENDPOINTS.admin.escrows}/${actionId}/approve`,
        {
          method: 'POST',
        }
      );
      
      if (response.success) {
        await fetchActions(); // Refresh the list
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error approving action:', err);
      return false;
    }
  }, [fetchActions]);

  const rejectAction = useCallback(async (actionId: string, reason?: string) => {
    try {
      const response = await apiRequest<{ success: boolean }>(
        `${API_ENDPOINTS.admin.escrows}/${actionId}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }
      );
      
      if (response.success) {
        await fetchActions(); // Refresh the list
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error rejecting action:', err);
      return false;
    }
  }, [fetchActions]);

  return { actions, loading, error, approveAction, rejectAction, refetch: fetchActions };
}

/**
 * Hook for admin operations
 */
export function useAdminOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emergencyPause = useCallback(async (contractAddress?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest<{ success: boolean; transactionHash: string }>(
        `${API_ENDPOINTS.admin.contracts}/emergency-pause`,
        {
          method: 'POST',
          body: JSON.stringify({ contractAddress }),
        }
      );
      
      if (!response.success) {
        throw new Error('Failed to activate emergency pause');
      }
      
      return response.transactionHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to activate emergency pause';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const withdrawFees = useCallback(async (destination: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest<{ success: boolean; transactionHash: string }>(
        `${API_ENDPOINTS.admin.fees}/withdraw`,
        {
          method: 'POST',
          body: JSON.stringify({ destination }),
        }
      );
      
      if (!response.success) {
        throw new Error('Failed to withdraw fees');
      }
      
      return response.transactionHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw fees';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (settings: Record<string, any>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest<{ success: boolean }>(
        API_ENDPOINTS.admin.settings,
        {
          method: 'PUT',
          body: JSON.stringify(settings),
        }
      );
      
      if (!response.success) {
        throw new Error('Failed to update settings');
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resolveDispute = useCallback(async (
    escrowId: string,
    resolution: 'creator' | 'kol' | 'split',
    splitPercentage?: number
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest<{ success: boolean; transactionHash: string }>(
        API_ENDPOINTS.escrows.dispute(escrowId),
        {
          method: 'POST',
          body: JSON.stringify({ resolution, splitPercentage }),
        }
      );
      
      if (!response.success) {
        throw new Error('Failed to resolve dispute');
      }
      
      return response.transactionHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resolve dispute';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    emergencyPause,
    withdrawFees,
    updateSettings,
    resolveDispute,
    loading,
    error
  };
}

/**
 * Hook for admin user management
 */
export function useAdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (filter?: {
    role?: 'kol' | 'creator' | 'all';
    status?: 'active' | 'suspended' | 'all';
    search?: string;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filter?.role) params.append('role', filter.role);
      if (filter?.status) params.append('status', filter.status);
      if (filter?.search) params.append('search', filter.search);

      const response = await apiRequest<{ success: boolean; data: any[] }>(
        `${API_ENDPOINTS.admin.users}?${params}`
      );
      
      if (response.success) {
        setUsers(response.data);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(errorMessage);
      console.error('Error fetching users:', err);
      
      // Fallback to empty array
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const suspendUser = useCallback(async (userId: string, reason: string) => {
    try {
      const response = await apiRequest<{ success: boolean }>(
        `${API_ENDPOINTS.admin.users}/${userId}/suspend`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }
      );
      
      if (response.success) {
        await fetchUsers(); // Refresh the list
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error suspending user:', err);
      return false;
    }
  }, [fetchUsers]);

  const activateUser = useCallback(async (userId: string) => {
    try {
      const response = await apiRequest<{ success: boolean }>(
        `${API_ENDPOINTS.admin.users}/${userId}/activate`,
        {
          method: 'POST',
        }
      );
      
      if (response.success) {
        await fetchUsers(); // Refresh the list
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error activating user:', err);
      return false;
    }
  }, [fetchUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, error, suspendUser, activateUser, refetch: fetchUsers };
}