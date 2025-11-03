'use client';

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { LoadingScreen } from '@/components/LoadingScreen';

export function useLoading() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const [progress, setProgress] = useState(0);

  const showLoading = useCallback((message: string = 'Loading...', withProgress: boolean = false) => {
    setLoadingMessage(message);
    setProgress(withProgress ? 50 : 0);
    setIsLoading(true);
  }, []);

  const hideLoading = useCallback(() => {
    setProgress(100);
    setIsLoading(false);
    setProgress(0);
  }, []);

  const LoadingPortal = useCallback(() => {
    if (!isLoading) return null;
    
    if (typeof window === 'undefined') return null;
    
    return createPortal(
      <LoadingScreen />,
      document.body
    );
  }, [isLoading]);

  return {
    isLoading,
    showLoading,
    hideLoading,
    LoadingPortal,
    setProgress
  };
}