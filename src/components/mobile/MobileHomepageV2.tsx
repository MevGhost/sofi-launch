'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { MobileLayout, MobileCard, MobileMetricCard } from './MobileLayout';
import { Button } from '@/components/alien/Button';
import { 
  FiTrendingUp,
  FiZap,
  FiDollarSign,
  FiArrowRight,
  FiSearch,
  FiShield,
  FiActivity
} from 'react-icons/fi';
import { cn } from '@/lib/utils';

// Dynamically import visual effects for mobile
const AnimatedBackground = dynamic(
  () => import('@/visual-effects/backgrounds/AnimatedBackground').then(mod => ({ default: mod.AnimatedBackground })),
  { ssr: false }
);

interface TokenData {
  name: string;
  symbol: string;
  price: string;
  change: number;
  marketCap: string;
  volume: string;
}

const trendingTokens: TokenData[] = [
  { name: 'AlienBase', symbol: 'ALB', price: '0.0234', change: 15.2, marketCap: '2.3M', volume: '890K' },
  { name: 'MoonPepe', symbol: 'MPEPE', price: '0.00089', change: -3.4, marketCap: '890K', volume: '234K' },
  { name: 'BaseGod', symbol: 'BGOD', price: '0.0567', change: 8.9, marketCap: '5.6M', volume: '1.2M' },
];

// Typewriter effect component
function TypewriterText({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text]);

  return (
    <span>
      {displayText}
      {currentIndex < text.length && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  );
}

export function MobileHomepageV2() {
  const router = useRouter();

  return (
    <>
      {/* Animated background - lighter version for mobile */}
      <AnimatedBackground />
      
      <MobileLayout showNav>
        <div className="min-h-screen relative">
          {/* Hero Section with animations */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="px-4 pt-8 pb-6"
          >
            <h1 className="text-3xl font-bold text-white mb-2">
              <TypewriterText text="Welcome to S4 Labs" />
            </h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="text-sm text-white/70 mb-6"
            >
              Token launchpad on Base L2
            </motion.p>

            {/* Quick Actions with staggered animation */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="grid grid-cols-2 gap-3 mb-6"
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="primary"
                  className="w-full justify-center bg-gradient-to-r from-[#0052FF] to-[#0EA5E9] border-0"
                  onClick={() => router.push('/token/new')}
                  icon={<FiZap size={16} />}
                >
                  Launch Token
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="secondary"
                  className="w-full justify-center bg-white/10 backdrop-blur-lg"
                  onClick={() => router.push('/browse')}
                  icon={<FiSearch size={16} />}
                >
                  Browse
                </Button>
              </motion.div>
            </motion.div>

            {/* Stats Grid with animations */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="grid grid-cols-2 gap-3"
            >
              <div className="bg-black/40 backdrop-blur-lg border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FiDollarSign size={16} className="text-[#0EA5E9]" />
                  <span className="text-xs text-white/60">Total Volume</span>
                </div>
                <div className="text-xl font-bold text-white">$12.5M</div>
                <div className="text-xs text-green-400 mt-1">+12.3%</div>
              </div>
              <div className="bg-black/40 backdrop-blur-lg border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FiActivity size={16} className="text-[#0EA5E9]" />
                  <span className="text-xs text-white/60">Active Tokens</span>
                </div>
                <div className="text-xl font-bold text-white">1,234</div>
                <div className="text-xs text-green-400 mt-1">+45 today</div>
              </div>
            </motion.div>
          </motion.section>

          {/* Trending Tokens with enhanced cards */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="px-4 pb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">
                Trending Tokens
              </h2>
              <Link
                href="/browse"
                className="text-xs text-[#0EA5E9] flex items-center gap-1"
              >
                View all
                <FiArrowRight size={12} />
              </Link>
            </div>

            <div className="space-y-3">
              {trendingTokens.map((token, index) => (
                <motion.div
                  key={token.symbol}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => router.push(`/token/${token.symbol.toLowerCase()}`)}
                  className="bg-black/40 backdrop-blur-lg border border-white/10 rounded-lg p-4 cursor-pointer hover:border-[#0EA5E9]/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white">{token.name}</span>
                        <span className="text-xs text-white/50">{token.symbol}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-white/70">${token.price}</span>
                        <span className={cn(
                          'font-medium',
                          token.change > 0 ? 'text-green-400' : 'text-red-400'
                        )}>
                          {token.change > 0 ? '+' : ''}{token.change}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/50">MCap</div>
                      <div className="text-sm font-medium text-white">${token.marketCap}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Features Section */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="px-4 pb-20"
          >
            <h2 className="text-sm font-semibold text-white mb-4">
              Why S4 Labs?
            </h2>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <FiZap />, title: 'Fast', desc: 'Base L2 Speed' },
                { icon: <FiShield />, title: 'Secure', desc: 'Audited Contracts' },
                { icon: <FiTrendingUp />, title: 'Fair', desc: 'Bonding Curves' },
                { icon: <FiDollarSign />, title: 'Escrow', desc: 'KOL Protection' },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2 + index * 0.1, duration: 0.5 }}
                  className="bg-black/40 backdrop-blur-lg border border-white/10 rounded-lg p-4 text-center hover:border-[#0EA5E9]/50 transition-all"
                >
                  <div className="text-[#0EA5E9] mb-2 flex justify-center">
                    {React.cloneElement(feature.icon, { size: 24 })}
                  </div>
                  <div className="text-sm font-semibold text-white">{feature.title}</div>
                  <div className="text-xs text-white/60 mt-1">{feature.desc}</div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Floating Action Button */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.5, type: "spring", stiffness: 200 }}
            className="fixed bottom-20 right-4 z-40"
          >
            <button
              onClick={() => router.push('/escrow/new')}
              className="w-14 h-14 bg-gradient-to-r from-[#0052FF] to-[#0EA5E9] rounded-full shadow-lg flex items-center justify-center"
            >
              <FiShield className="text-white" size={24} />
            </button>
          </motion.div>
        </div>
      </MobileLayout>
    </>
  );
}