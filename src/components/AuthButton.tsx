'use client';

import React, { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/alien/Button';
import { FiLogOut, FiUser, FiShield, FiCheck } from 'react-icons/fi';
import { cn } from '@/lib/utils';

export function AuthButton({ className }: { className?: string }) {
  const { address, isConnected } = useAccount();
  const { user, isAuthenticated, isLoading, login, logout, isAdmin, isKOL, isVerifier } = useAuth();

  // Auto-login when wallet connects
  useEffect(() => {
    if (isConnected && address && !isAuthenticated && !isLoading) {
      // Small delay to ensure wallet is fully connected
      const timer = setTimeout(() => {
        login();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, address, isAuthenticated, isLoading, login]);

  if (!isConnected) {
    return <ConnectButton />;
  }

  if (isLoading) {
    return (
      <Button variant="secondary" disabled className={className}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
        Authenticating...
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button 
        variant="primary" 
        onClick={login}
        className={className}
        icon={<FiUser size={16} />}
      >
        Sign In
      </Button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface2 rounded-lg">
        <FiCheck className="text-success" size={16} />
        <span className="text-sm text-text-primary">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        {isAdmin && (
          <span className="px-2 py-0.5 bg-danger/20 text-danger text-xs rounded-full font-medium">
            ADMIN
          </span>
        )}
        {isKOL && (
          <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full font-medium">
            KOL
          </span>
        )}
        {isVerifier && (
          <span className="px-2 py-0.5 bg-warning/20 text-warning text-xs rounded-full font-medium">
            VERIFIER
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={logout}
        icon={<FiLogOut size={16} />}
        className="text-text-muted hover:text-danger"
      >
        Sign Out
      </Button>
    </div>
  );
}