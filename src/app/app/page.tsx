'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { AppLayout } from '@/components/AppLayout';

export default function AppPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  useEffect(() => {
    // If wallet is connected, redirect to browse
    if (isConnected) {
      router.push('/browse');
    } else if (openConnectModal) {
      // Open the RainbowKit modal automatically
      openConnectModal();
    }
  }, [isConnected, router, openConnectModal]);

  return (
    <AppLayout isConnected={isConnected}>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Welcome to S4 Labs</h2>
          <p className="text-text-secondary mb-8">Connect your wallet to access the platform</p>
          {openConnectModal && (
            <button
              onClick={openConnectModal}
              className="px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}