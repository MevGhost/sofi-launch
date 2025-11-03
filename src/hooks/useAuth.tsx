'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { API_ENDPOINTS, apiRequest } from '@/lib/api/config';
import { showToast } from '@/components/ToastProvider';
import { useRouter } from 'next/navigation';

interface AuthUser {
  id: string;
  address: string;
  role: 'USER' | 'ADMIN' | 'KOL' | 'VERIFIER';
  createdAt: string;
  nonce?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AUTH_TOKEN_KEY = 's4labs_auth_token';
const AUTH_USER_KEY = 's4labs_auth_user';

export function useAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const loginInProgressRef = useRef(false);
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Load auth state from localStorage on mount
  useEffect(() => {
    const loadAuthState = () => {
      try {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        const userStr = localStorage.getItem(AUTH_USER_KEY);
        
        if (token && userStr) {
          const user = JSON.parse(userStr);
          setAuthState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          // Set default auth header
          setAuthHeader(token);
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Failed to load auth state:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadAuthState();
  }, []);

  // Auto-logout when wallet disconnects
  useEffect(() => {
    if (!isConnected && authState.isAuthenticated) {
      logout();
    }
  }, [isConnected]);

  // Verify address matches authenticated user
  useEffect(() => {
    if (address && authState.user && address.toLowerCase() !== authState.user.address.toLowerCase()) {
      logout();
    }
  }, [address, authState.user]);

  const setAuthHeader = (token: string | null) => {
    if (token) {
      // Set default header for all future requests
      if (typeof window !== 'undefined') {
        (window as any).__AUTH_TOKEN = token;
      }
    } else {
      if (typeof window !== 'undefined') {
        delete (window as any).__AUTH_TOKEN;
      }
    }
  };

  const login = useCallback(async () => {
    // Prevent duplicate login attempts
    if (loginInProgressRef.current) {
      console.log('Login already in progress, skipping...');
      return false;
    }
    
    if (authState.isAuthenticated && authState.user?.address?.toLowerCase() === address?.toLowerCase()) {
      console.log('Already authenticated with current address');
      return true;
    }
    
    if (!address || !isConnected) {
      showToast.error('Please connect your wallet first');
      return false;
    }

    try {
      loginInProgressRef.current = true;
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Step 1: Get nonce from server
      const nonceResponse = await apiRequest<{ 
        success: boolean; 
        data: { nonce: string } 
      }>(API_ENDPOINTS.auth.nonce, {
        method: 'POST',
        body: JSON.stringify({ address }),
      });

      if (!nonceResponse.success) {
        throw new Error('Failed to get nonce');
      }

      const { nonce } = nonceResponse.data;

      // Step 2: Create message payload
      const messagePayload = {
        nonce,
        timestamp: new Date().toISOString(),
        chain: 'base-sepolia',
        chainType: 'evm'
      };
      const messageString = JSON.stringify(messagePayload);
      
      // Step 3: Sign message with wallet
      const displayMessage = `Sign this message to authenticate with S4 Labs.\n\nNonce: ${nonce}`;
      const signature = await signMessageAsync({ message: messageString });

      // Step 4: Verify signature on server
      const loginResponse = await apiRequest<{
        success: boolean;
        data: {
          token: string;
          user: AuthUser;
        };
      }>(API_ENDPOINTS.auth.login, {
        method: 'POST',
        body: JSON.stringify({
          address,
          signature,
          message: messageString,
          chainType: 'evm'
        }),
      });

      if (!loginResponse.success) {
        throw new Error('Authentication failed');
      }

      const { token, user } = loginResponse.data;

      // Step 4: Store auth state
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      setAuthHeader(token);

      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });

      showToast.success('Successfully authenticated');
      return true;
    } catch (error) {
      loginInProgressRef.current = false;
      console.error('Login error:', error);
      showToast.error(error instanceof Error ? error.message : 'Authentication failed');
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return false;
    } finally {
      loginInProgressRef.current = false;
    }
  }, [address, isConnected, authState.isAuthenticated, authState.user?.address, signMessageAsync]);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setAuthHeader(null);
    
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });

    // Call logout endpoint to invalidate token on server
    apiRequest(API_ENDPOINTS.auth.logout, { method: 'POST' }).catch(() => {
      // Ignore logout errors
    });
  }, []);

  const verifyAuth = useCallback(async () => {
    if (!authState.token) return false;

    try {
      const response = await apiRequest<{
        success: boolean;
        data: { valid: boolean; user: AuthUser };
      }>(API_ENDPOINTS.auth.verify, {
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      if (response.success && response.data.valid) {
        setAuthState(prev => ({
          ...prev,
          user: response.data.user,
        }));
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      console.error('Auth verification failed:', error);
      logout();
      return false;
    }
  }, [authState.token, logout]);

  const isAdmin = authState.user?.role === 'ADMIN';
  const isKOL = authState.user?.role === 'KOL';
  const isVerifier = authState.user?.role === 'VERIFIER';

  return {
    user: authState.user,
    token: authState.token,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    isAdmin,
    isKOL,
    isVerifier,
    login,
    logout,
    verifyAuth,
  };
}

// HOC for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requireAdmin?: boolean;
    requireKOL?: boolean;
    requireVerifier?: boolean;
    redirectTo?: string;
  }
) {
  return function ProtectedComponent(props: P) {
    const { isAuthenticated, isAdmin, isKOL, isVerifier, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        showToast.error('Please login to access this page');
        router.push(options?.redirectTo || '/');
      }

      if (!isLoading && isAuthenticated) {
        if (options?.requireAdmin && !isAdmin) {
          showToast.error('Admin access required');
          router.push('/');
        }
        if (options?.requireKOL && !isKOL) {
          showToast.error('KOL access required');
          router.push('/');
        }
        if (options?.requireVerifier && !isVerifier) {
          showToast.error('Verifier access required');
          router.push('/');
        }
      }
    }, [isLoading, isAuthenticated, isAdmin, isKOL, isVerifier, router]);

    if (isLoading) {
      return (
        <div className="min-h-screen bg-canvas flex items-center justify-center">
          <div className="text-text-primary">Loading...</div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    if (options?.requireAdmin && !isAdmin) return null;
    if (options?.requireKOL && !isKOL) return null;
    if (options?.requireVerifier && !isVerifier) return null;

    return <Component {...props} />;
  };
}