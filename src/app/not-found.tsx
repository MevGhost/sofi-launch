'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="text-8xl font-bold text-gradient mb-4">404</div>
        <h1 className="text-3xl font-bold text-text-primary mb-4">Page Not Found</h1>
        <p className="text-text-primary/60 mb-8">
          Looks like this token got rugged! The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <div className="flex gap-4 justify-center">
          <Link 
            href="/"
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-text-primary font-semibold rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all"
          >
            Go Home
          </Link>
          <Link 
            href="/browse"
            className="px-6 py-3 glass glass-hover border border-white/[0.1] text-text-primary font-semibold rounded-lg transition-all"
          >
            Browse Tokens
          </Link>
        </div>
        
        <div className="mt-12">
          <p className="text-text-primary/40 text-sm">
            Need help? Contact us at{' '}
            <a href="mailto:support@s4labs.xyz" className="text-blue-400 hover:text-blue-300">
              support@s4labs.xyz
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}