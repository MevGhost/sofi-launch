'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { 
  RainbowKitProvider,
  darkTheme,
  Theme
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ToastProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { wagmiConfig } from '@/lib/wagmi-config';
import { useState, useRef } from 'react';

// Create query client instance once to prevent re-initialization
let queryClientSingleton: QueryClient | null = null;

function getQueryClient() {
  if (!queryClientSingleton) {
    queryClientSingleton = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 minute
          refetchOnWindowFocus: false,
        },
      },
    });
  }
  return queryClientSingleton;
}

// Custom S4Labs theme based on dark theme
const s4LabsTheme: Theme = darkTheme({
  accentColor: '#0EA5E9',
  accentColorForeground: 'white',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'large',
});

// Customize further with black theme
s4LabsTheme.colors.modalBackground = '#0A0A0A';
s4LabsTheme.colors.modalBorder = 'rgba(255, 255, 255, 0.08)';
s4LabsTheme.colors.profileForeground = '#0A0A0A';
s4LabsTheme.colors.selectedOptionBorder = 'rgba(255, 255, 255, 0.2)';
s4LabsTheme.colors.connectButtonBackground = '#141414';
s4LabsTheme.colors.connectButtonText = '#FFFFFF';
s4LabsTheme.colors.connectButtonInnerBackground = '#1F1F1F';
s4LabsTheme.colors.menuItemBackground = '#141414';

export function Providers({ children }: { children: React.ReactNode }) {
  // Use a stable query client instance
  const queryClient = useRef(getQueryClient()).current;
  
  return (
    <ErrorBoundary>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider 
            theme={s4LabsTheme}
            modalSize="wide"
            showRecentTransactions={false}
            avatar={() => null}
          >
            {children}
            <ToastProvider />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}