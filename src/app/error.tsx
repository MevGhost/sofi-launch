'use client';

import React from 'react';
import { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Error logged for debugging purposes
  }, [error]);

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <svg className="w-16 h-16 text-yellow-500 mb-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h1 className="text-3xl font-bold text-text-primary mb-4">Something went wrong!</h1>
        <p className="text-text-primary/60 mb-8">
          Don&apos;t worry, your funds are SAFU. An unexpected error occurred while processing your request.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-text-primary font-semibold rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all"
          >
            Try Again
          </button>
          <a 
            href="/"
            className="px-6 py-3 glass glass-hover border border-white/[0.1] text-text-primary font-semibold rounded-lg transition-all"
          >
            Go Home
          </a>
        </div>
        
        {error.digest && (
          <div className="mt-8 p-4 bg-surface2 rounded-lg">
            <p className="text-text-primary/40 text-xs font-mono">
              Error ID: {error.digest}
            </p>
          </div>
        )}
        
        <div className="mt-8">
          <p className="text-text-primary/40 text-sm">
            If this issue persists, please contact{' '}
            <a href="mailto:support@s4labs.xyz" className="text-blue-400 hover:text-blue-300">
              support@s4labs.xyz
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}