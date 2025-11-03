'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { API_ENDPOINTS, apiRequest, wsManager, WS_EVENTS } from '@/lib/api/config';
// Types for escrow data
export interface Escrow {
  id: string;
  title: string;
  description: string;
  creator: string;
  kol: string;
  amount: string;
  status: 'pending' | 'active' | 'completed' | 'disputed' | 'cancelled';
  createdAt: string;
  deadline: string;
  milestones?: Milestone[];
}

export interface Milestone {
  id: string;
  escrowId: string;
  title: string;
  description: string;
  amount: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  deadline: string;
  deliverables?: string[];
}

export interface Activity {
  id: string;
  escrowId: string;
  type: string;
  description: string;
  timestamp: string;
  user: string;
}

export interface DashboardStats {
  totalEscrows: number;
  activeEscrows: number;
  totalValue: string;
  completionRate: number;
  pendingReleases: number;
  disputes: number;
}

// Hook for fetching escrows
export function useEscrows(filter?: 'creator' | 'kol' | 'all') {
  const { address } = useAccount();
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEscrows = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filter && filter !== 'all') {
        params.append('filter', filter);
      }
      // Always pass address as userAddress for public access
      if (address) {
        params.append('userAddress', address);
      } else {
        // If no wallet connected, just fetch empty
        setEscrows([]);
        setLoading(false);
        return;
      }

      const url = `${API_ENDPOINTS.escrows.list}?${params}`;
      const response = await apiRequest<{ 
        success: boolean; 
        data: Escrow[] 
      }>(url);
      
      if (response.success) {
        setEscrows(response.data || []);
      } else {
        // Don't throw error, just set empty array
        console.warn('No escrows found or error fetching escrows');
        setEscrows([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch escrows';
      setError(errorMessage);
      console.error('Error fetching escrows:', err);
      setEscrows([]);
    } finally {
      setLoading(false);
    }
  }, [address, filter]);

  useEffect(() => {
    fetchEscrows();
  }, [fetchEscrows]);

  return { escrows, loading, error, refetch: fetchEscrows };
}

// Hook for single escrow
export function useEscrow(escrowId: string) {
  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEscrow = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [escrowResponse, activitiesResponse] = await Promise.all([
        apiRequest<{ success: boolean; data: Escrow }>(
          API_ENDPOINTS.escrows.details(escrowId)
        ),
        apiRequest<{ success: boolean; data: Activity[] }>(
          API_ENDPOINTS.escrows.activities(escrowId)
        )
      ]);
      
      if (escrowResponse.success) {
        setEscrow(escrowResponse.data);
      } else {
        throw new Error('Escrow not found');
      }
      
      if (activitiesResponse.success) {
        setActivities(activitiesResponse.data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch escrow';
      setError(errorMessage);
      console.error('Error fetching escrow:', err);
      setEscrow(null);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [escrowId]);

  useEffect(() => {
    fetchEscrow();
  }, [fetchEscrow]);

  return { escrow, activities, loading, error, refetch: fetchEscrow };
}

// Hook for dashboard statistics
export function useDashboardStats(role?: 'ADMIN' | 'KOL' | 'USER') {
  const { address } = useAccount();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      
      try {
        let url: string;
        if (role === 'ADMIN') {
          url = API_ENDPOINTS.admin.dashboard;
        } else if (role === 'KOL') {
          url = API_ENDPOINTS.kol.deals;
        } else {
          url = API_ENDPOINTS.stats.escrows;
        }

        const response = await apiRequest<{ success: boolean; data: DashboardStats }>(url);
        
        if (response.success) {
          setStats(response.data);
        } else {
          throw new Error('Failed to fetch stats');
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        // Set empty stats on error
        setStats({
          totalEscrows: 0,
          activeEscrows: 0,
          totalValue: '0',
          completionRate: 0,
          pendingReleases: 0,
          disputes: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [address, role]);

  return { stats, loading };
}

// Hook for escrow contract operations
export function useEscrowContract() {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEscrow = useCallback(async (params: {
    projectName: string;
    dealType: string;
    dealDescription?: string;
    kolAddress: string;
    tokenAddress: string;
    tokenSymbol: string;
    totalAmount: string;
    milestones: Omit<Milestone, 'id' | 'escrowId' | 'createdAt' | 'updatedAt'>[];
    startDate: string;
    endDate: string;
    requiresVerification?: boolean;
    verificationMethod?: string;
    verifierAddresses?: string[];
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest<{ 
        success: boolean; 
        data: { 
          escrow: any;
          transactionHash: string;
          contractAddress: string;
        } 
      }>(API_ENDPOINTS.escrows.deploy, {
        method: 'POST',
        body: JSON.stringify(params),
      });
      
      if (!response.success) {
        throw new Error('Failed to deploy escrow');
      }
      
      return response.data.transactionHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deploy escrow';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fundEscrow = useCallback(async (escrowId: string, amount: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual contract call
      // Funding escrow
      
      return '0x' + Math.random().toString(16).substr(2, 64);
    } catch (err) {
      setError('Failed to fund escrow');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const releaseMilestone = useCallback(async (escrowId: string, milestoneId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual contract call
      // Releasing milestone
      
      return '0x' + Math.random().toString(16).substr(2, 64);
    } catch (err) {
      setError('Failed to release milestone');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const claimFunds = useCallback(async (escrowId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual contract call
      // Claiming funds from escrow
      
      return '0x' + Math.random().toString(16).substr(2, 64);
    } catch (err) {
      setError('Failed to claim funds');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitMilestoneProof = useCallback(async (
    escrowId: string, 
    milestoneId: string, 
    proofData: {
      proofUrl: string;
      description: string;
      evidenceLinks: string[];
    }
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API call
      // Submitting milestone proof
      
      return { success: true, milestoneId };
    } catch (err) {
      setError('Failed to submit proof');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const approveMilestone = useCallback(async (
    escrowId: string,
    milestoneId: string,
    approved: boolean,
    comments?: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API call
      // Approving milestone
      
      return { success: true, milestoneId };
    } catch (err) {
      setError('Failed to approve milestone');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const raiseDispute = useCallback(async (
    escrowId: string,
    reason: string,
    evidence: string[]
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API call
      // Raising dispute
      
      return { success: true, disputeId: 'dispute-' + Date.now() };
    } catch (err) {
      setError('Failed to raise dispute');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createEscrow,
    fundEscrow,
    releaseMilestone,
    claimFunds,
    submitMilestoneProof,
    approveMilestone,
    raiseDispute,
    loading,
    error
  };
}

// Hook for real-time updates via WebSocket
export function useEscrowUpdates(escrowId?: string) {
  const [updates, setUpdates] = useState<any[]>([]);
  
  useEffect(() => {
    if (!escrowId || !wsManager) return;
    
    // Subscribe to escrow-specific events
    const unsubscribeFunded = wsManager.on(WS_EVENTS.ESCROW_FUNDED, (data: any) => {
      if (data.escrowId === escrowId) {
        setUpdates(prev => [...prev, {
          type: 'funded',
          escrowId,
          timestamp: new Date().toISOString(),
          data
        }].slice(-10));
      }
    });

    const unsubscribeMilestone = wsManager.on(WS_EVENTS.ESCROW_MILESTONE_RELEASED, (data: any) => {
      if (data.escrowId === escrowId) {
        setUpdates(prev => [...prev, {
          type: 'milestone_released',
          escrowId,
          timestamp: new Date().toISOString(),
          data
        }].slice(-10));
      }
    });

    const unsubscribeDisputed = wsManager.on(WS_EVENTS.ESCROW_DISPUTED, (data: any) => {
      if (data.escrowId === escrowId) {
        setUpdates(prev => [...prev, {
          type: 'disputed',
          escrowId,
          timestamp: new Date().toISOString(),
          data
        }].slice(-10));
      }
    });

    const unsubscribeCompleted = wsManager.on(WS_EVENTS.ESCROW_COMPLETED, (data: any) => {
      if (data.escrowId === escrowId) {
        setUpdates(prev => [...prev, {
          type: 'completed',
          escrowId,
          timestamp: new Date().toISOString(),
          data
        }].slice(-10));
      }
    });
    
    return () => {
      unsubscribeFunded();
      unsubscribeMilestone();
      unsubscribeDisputed();
      unsubscribeCompleted();
    };
  }, [escrowId]);
  
  return updates;
}