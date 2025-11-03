'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect if the current device is mobile
 * Uses 768px as the breakpoint (md in Tailwind)
 * @returns boolean indicating if device is mobile
 */
export function useIsMobile(): boolean {
  // Initialize with a check if we're on client side
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    // Check if window is defined (client-side)
    if (typeof window === 'undefined') return;

    const checkMobile = () => {
      // Check both window width and touch capability
      const width = window.innerWidth < 768;
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Consider mobile if narrow screen OR has touch (tablets)
      setIsMobile(width);
    };

    // Initial check
    checkMobile();

    // Listen for resize events
    window.addEventListener('resize', checkMobile);
    
    // Also check on orientation change
    window.addEventListener('orientationchange', checkMobile);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  return isMobile;
}

/**
 * Hook to detect device type with more granularity
 */
export function useDeviceType() {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkDevice = () => {
      const width = window.innerWidth;
      
      if (width < 640) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);

    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return deviceType;
}

/**
 * Hook to check if device has touch capability
 */
export function useHasTouch(): boolean {
  const [hasTouch, setHasTouch] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setHasTouch(checkTouch);
  }, []);

  return hasTouch;
}