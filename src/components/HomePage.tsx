'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Button } from '@/components/alien/Button';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileHomepageV2 } from '@/components/mobile/MobileHomepageV2';
import { 
  FiArrowRight,
  FiZap,
  FiShield,
  FiTrendingUp,
  FiUsers,
  FiLock,
  FiGlobe,
  FiBarChart2,
  FiDollarSign,
  FiTarget,
  FiAlertCircle,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiExternalLink,
  FiGitBranch,
  FiAward,
  FiClock,
  FiCode,
  FiDatabase,
  FiLayers,
  FiPercent,
  FiPieChart,
  FiRefreshCw,
  FiStar,
  FiTerminal,
  FiUserCheck,
  FiActivity
} from 'react-icons/fi';
import { BsDiscord, BsTelegram, BsGithub, BsMedium } from 'react-icons/bs';
import { RiTwitterXFill } from 'react-icons/ri';
import { CreativeProcessFlow } from '@/components/CreativeProcessFlow';
import { FeatureShowcase } from '@/components/FeatureShowcase';
import { apiRequest, API_ENDPOINTS } from '@/lib/api/config';

// Dynamically import visual effects for performance
const OuterSpaceBackground = dynamic(
  () => import('@/visual-effects/backgrounds/OuterSpaceBackground').then(mod => ({ default: mod.OuterSpaceBackground })),
  { ssr: false }
);

const ParticleMorphCube = dynamic(
  () => import('@/visual-effects/particles/ParticleMorphCube'),
  { 
    ssr: false,
    loading: () => <div className="absolute inset-0" />
  }
);

const ShootingStars = dynamic(
  () => import('@/visual-effects/animations/ShootingStars').then(mod => ({ default: mod.ShootingStars })),
  { ssr: false }
);

// Animated counter component
const AnimatedCounter = ({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
};

export default function HomePage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('creators');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  if (isMobile) {
    return <MobileHomepageV2 />;
  }

  // Platform statistics
  const stats = [
    { label: 'Total Value Locked', value: 4500000, prefix: '$', suffix: '', icon: <FiDatabase /> },
    { label: 'Projects Launched', value: 127, suffix: '+', icon: <FiGlobe /> },
    { label: 'Active Users', value: 8400, suffix: '+', icon: <FiUsers /> },
    { label: 'SOL Staked', value: 2800000, suffix: '', icon: <FiLock /> },
  ];

  // Trust badges
  const trustBadges = [
    { label: 'Audited by CertiK', icon: <FiAward />, status: 'coming' },
    { label: '100% Decentralized', icon: <FiGitBranch />, status: 'active' },
    { label: 'Liquidity Auto-Locked', icon: <FiLock />, status: 'active' },
    { label: 'Anti-Rug Mechanisms', icon: <FiShield />, status: 'active' },
    { label: 'KYC Available', icon: <FiUserCheck />, status: 'active' },
  ];

  // Features for creators vs investors
  const creatorFeatures = [
    {
      icon: <FiCode className="w-6 h-6" />,
      title: 'No-Code Launch',
      description: 'Deploy professional tokens without writing a single line of code. Simple form, instant deployment.'
    },
    {
      icon: <FiTrendingUp className="w-6 h-6" />,
      title: 'Fair Launch Mechanics',
      description: 'Bonding curves ensure equitable token distribution. No pre-sales, no team allocation abuse.'
    },
    {
      icon: <FiTarget className="w-6 h-6" />,
      title: 'Integrated Escrow',
      description: 'Milestone-based vesting built into every project. Release funds as you deliver results.'
    },
    {
      icon: <FiPercent className="w-6 h-6" />,
      title: 'SOL Benefits',
      description: '50% discount on all platform fees when paying with SOL tokens. Stack rewards for extra benefits.'
    },
    {
      icon: <FiStar className="w-6 h-6" />,
      title: 'Marketing Support',
      description: 'Get featured placement and community exposure. Leverage our 8000+ active user base.'
    },
    {
      icon: <FiUserCheck className="w-6 h-6" />,
      title: 'Multi-Verifier System',
      description: 'Enhanced trust through decentralized verification. Multiple validators ensure transparency.'
    },
  ];

  const investorFeatures = [
    {
      icon: <FiShield className="w-6 h-6" />,
      title: 'Vetted Projects',
      description: 'Rigorous screening process with optional KYC. Smart contract audits available for all projects.'
    },
    {
      icon: <FiDollarSign className="w-6 h-6" />,
      title: 'Early Access',
      description: 'Get in at ground floor prices through bonding curves. Fair entry for all participants.'
    },
    {
      icon: <FiLock className="w-6 h-6" />,
      title: 'Protected Investment',
      description: 'Automatic liquidity locks and anti-dump mechanisms. Your funds are SAFU.'
    },
    {
      icon: <FiPieChart className="w-6 h-6" />,
      title: 'SOL Rewards',
      description: 'Earn bonus allocation in IDOs when staking ALB. Higher tiers unlock exclusive launches.'
    },
    {
      icon: <FiActivity className="w-6 h-6" />,
      title: 'Transparent Metrics',
      description: 'Real-time charts, holder stats, and on-chain verification. Complete transparency always.'
    },
    {
      icon: <FiUsers className="w-6 h-6" />,
      title: 'Community Governance',
      description: 'Vote on featured projects with SOL tokens. Shape the platform\'s future direction.'
    },
  ];



  // FAQ items
  const faqItems = [
    {
      question: 'How much does it cost to launch a token?',
      answer: 'Token creation costs approximately 0.01 SOL in gas fees on Solana. Platform fees are 2% of funds raised (1% with SOL payment). There are no upfront costs or hidden fees.'
    },
    {
      question: 'What is a bonding curve?',
      answer: 'A bonding curve is a mathematical formula that determines token price based on supply. As more tokens are purchased, the price increases. This ensures fair price discovery and prevents large holders from dumping.'
    },
    {
      question: 'How does graduation to DEX work?',
      answer: 'When your token reaches $69,000 market cap, it automatically graduates to Raydium/Orca. SoFi Launch adds $12,000 in liquidity and burns the LP tokens, ensuring permanent liquidity.'
    },
    {
      question: 'What are the benefits of using SOL tokens?',
      answer: 'SOL holders get 50% discount on platform fees, guaranteed allocations in IDOs, governance voting rights, revenue sharing from platform fees, and access to exclusive launches.'
    },
    {
      question: 'How does the escrow system work?',
      answer: 'Projects can set milestone-based payment schedules. Funds are held in smart contracts and released only when milestones are verified by multi-sig validators. This protects both creators and investors.'
    },
    {
      question: 'What chains are supported?',
      answer: 'Currently, SoFi Launch operates on Solana and AlienBase. Multi-chain support for Ethereum mainnet, BSC, and Arbitrum is coming soon.'
    },
    {
      question: 'How are projects vetted?',
      answer: 'All projects undergo automated smart contract scanning. Optional KYC and manual review are available. Community members can also report suspicious projects for investigation.'
    },
    {
      question: 'What happens to locked liquidity?',
      answer: 'Upon graduation, liquidity is permanently locked by burning LP tokens. This means the liquidity can never be removed, ensuring long-term trading stability for successful projects.'
    }
  ];

  // State for recent activity and launches
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [upcomingLaunches, setUpcomingLaunches] = useState<any[]>([]);
  const [recentTokens, setRecentTokens] = useState<any[]>([]);

  useEffect(() => {
    // Fetch recent tokens and format as activity
    const fetchRecentActivity = async () => {
      try {
        // Get recent trades from portfolio endpoint (if authenticated) or recent tokens
        const params = new URLSearchParams({
          sortBy: 'newest',
          limit: '10'
        });
        
        const response = await apiRequest<{
          success: boolean;
          data: {
            tokens: any[];
          }
        }>(`${API_ENDPOINTS.tokens.list}?${params}`);
        
        if (response?.success && response.data?.tokens) {
          // Format tokens as activity items
          const activities = response.data.tokens.slice(0, 4).map((token: any, index: number) => {
            // Calculate actual time since creation if createdAt is available
            let timeAgo = 'Recently';
            if (token.createdAt) {
              const created = new Date(token.createdAt);
              const now = new Date();
              const diffMs = now.getTime() - created.getTime();
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              const diffMins = Math.floor(diffMs / (1000 * 60));
              
              if (diffMins < 60) {
                timeAgo = `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
              } else if (diffHours < 24) {
                timeAgo = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
              } else {
                const diffDays = Math.floor(diffHours / 24);
                timeAgo = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
              }
            }
            
            return {
              type: token.bondingProgress >= 100 ? 'graduation' : 'launch',
              token: token.symbol,
              tokenName: token.name,
              time: timeAgo,
              price: `$${parseFloat(token.price || '0.00001').toFixed(6)}`,
              change: `${token.change24h >= 0 ? '+' : ''}${(token.change24h || 0).toFixed(1)}%`,
              marketCap: token.marketCap,
              liquidity: token.liquidity
            };
          });
          setRecentActivity(activities);
        }
      } catch (error) {
        console.error('Error fetching recent activity:', error);
        setRecentActivity([]);
      }
    };

    // Fetch recent token launches
    const fetchUpcomingLaunches = async () => {
      try {
        const params = new URLSearchParams({
          sortBy: 'newest', 
          limit: '3'
        });
        
        const response = await apiRequest<{
          success: boolean;
          data: {
            tokens: any[];
          }
        }>(`${API_ENDPOINTS.tokens.list}?${params}`);
        
        if (response?.success && response.data?.tokens) {
          const launches = response.data.tokens.map((token: any) => ({
            name: token.name,
            symbol: token.symbol,
            description: token.description || 'A new token on Base',
            launch: 'Live now',
            target: '$69,000',
            albBonus: '10%',
            badges: ['Live']
          }));
          setUpcomingLaunches(launches);
        }
      } catch (error) {
        console.error('Error fetching launches:', error);
        setUpcomingLaunches([]);
      }
    };

    fetchRecentActivity();
    fetchUpcomingLaunches();
  }, []);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background layers */}
      {/* Hide heavy background in performance mode */}
      {typeof document !== 'undefined' && !document.body.classList.contains('performance-mode') && (
        <OuterSpaceBackground />
      )}
      <ShootingStars count={2} className="z-[3]" />

      {/* Header with Launch App */}
      <header className="absolute top-8 left-0 right-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link href="/" className="group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black/50 backdrop-blur-sm border border-white/10 rounded-md flex items-center justify-center transition-all group-hover:scale-110 group-hover:border-[#0EA5E9]/50">
                  <span className="text-white font-bold text-sm font-display">SoFi</span>
                </div>
                <span className="text-white/80 text-sm hidden sm:block">Token Launchpad</span>
              </div>
            </Link>

            {/* Nav and Launch Button */}
            <div className="flex items-center gap-6">
              <nav className="hidden lg:flex items-center gap-6">
                <Link href="/docs" className="text-white/60 hover:text-white text-sm transition-colors">Docs</Link>
                <Link href="/privacy" className="text-white/60 hover:text-white text-sm transition-colors">Privacy</Link>
                <Link href="/terms" className="text-white/60 hover:text-white text-sm transition-colors">Terms</Link>
              </nav>
              <button
                onClick={() => router.push('/app')}
                className="group px-6 py-2.5 bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl font-medium text-white transition-all hover:scale-105 hover:border-[#0EA5E9]/50"
              >
                <span className="flex items-center gap-2">
                  Launch App
                  <FiArrowRight className="w-4 h-4 text-[#0EA5E9] transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            {/* Left Content */}
            <div className="text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1 bg-[#0EA5E9]/10 border border-[#0EA5E9]/20 rounded-full text-xs text-[#0EA5E9] mb-6"
              >
                <span className="w-2 h-2 bg-[#0EA5E9] rounded-full animate-pulse" />
                Powered by Solana
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 apple-text font-display"
              >
                Launch Your Token<br/>
                <span className="text-[#0EA5E9]">on Solana</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg md:text-xl lg:text-2xl text-white/70 mb-8 max-w-xl"
              >
                The premier decentralized launchpad with integrated milestone escrows. 
                Fair launches, community-driven success.
              </motion.p>
              
              {/* Live Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="grid grid-cols-2 gap-6 max-w-md mt-12"
              >
                {stats.slice(0, 2).map((stat, index) => (
                  <div key={index} className="text-left">
                    <div className="flex items-center gap-2 text-[#0EA5E9] mb-1">
                      {stat.icon}
                      <span className="text-xs text-white/50 uppercase tracking-wider">{stat.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                    </p>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right Visual */}
            <div className="relative h-[500px] lg:h-[600px]">
              <ParticleMorphCube particleCount={15000} />
            </div>
          </div>
        </div>
      </section>

      {/* Platform Stats Bar */}
      <section className="relative py-12 px-4 z-10 border-y border-white/10 bg-black/40 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center"
              >
                <div className="flex items-center justify-center gap-2 text-[#0EA5E9] mb-2">
                  {stat.icon}
                  <span className="text-xs text-white/50 uppercase tracking-wider">{stat.label}</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="relative py-8 px-4 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-6">
            {trustBadges.map((badge, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                  badge.status === 'active' 
                    ? 'bg-[#0EA5E9]/5 border-[#0EA5E9]/20 text-[#0EA5E9]'
                    : 'bg-white/5 border-white/10 text-white/50'
                }`}
              >
                {badge.icon}
                <span className="text-sm font-medium">{badge.label}</span>
                {badge.status === 'coming' && (
                  <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full">Soon</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why SoFi Launch - Tabbed Section */}
      <section className="relative py-20 px-4 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-display">
              Built for Everyone in DeFi
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8">
              Whether you\'re launching a project or seeking opportunities, SoFi Launch provides the tools you need
            </p>
            
            {/* Tab Switcher */}
            <div className="inline-flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
              <button
                onClick={() => setActiveTab('creators')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'creators'
                    ? 'bg-[#0EA5E9] text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                For Creators
              </button>
              <button
                onClick={() => setActiveTab('investors')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'investors'
                    ? 'bg-[#0EA5E9] text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                For Investors
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {(activeTab === 'creators' ? creatorFeatures : investorFeatures).map((feature, index) => (
                <div
                  key={index}
                  className="bg-black/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:border-[#0EA5E9]/50 hover:scale-105 transition-all"
                >
                  <div className="w-12 h-12 bg-[#0EA5E9]/10 rounded-lg flex items-center justify-center text-[#0EA5E9] mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-white/60">
                    {feature.description}
                  </p>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Creative Process Flow */}
      <CreativeProcessFlow />

      {/* Live Activity Feed */}
      <section className="relative py-20 px-4 z-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-display">
              Live Platform Activity
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Real-time updates from the SoFi Launch ecosystem
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <div className="bg-black/40 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FiActivity className="text-[#0EA5E9]" />
                Recent Activity
              </h3>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {activity.type === 'launch' && (
                        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                          <FiZap className="w-4 h-4 text-green-500" />
                        </div>
                      )}
                      {activity.type === 'graduation' && (
                        <div className="w-8 h-8 bg-[#0EA5E9]/20 rounded-full flex items-center justify-center">
                          <FiTrendingUp className="w-4 h-4 text-[#0EA5E9]" />
                        </div>
                      )}
                      {activity.type === 'milestone' && (
                        <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <FiTarget className="w-4 h-4 text-purple-500" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-white">
                          {activity.type === 'launch' && `${activity.token} launched`}
                          {activity.type === 'graduation' && `${activity.token} graduated to DEX`}
                          {activity.type === 'milestone' && `${activity.project} milestone completed`}
                        </p>
                        <p className="text-xs text-white/50">{activity.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {activity.price && (
                        <p className="text-sm text-white">{activity.price}</p>
                      )}
                      {activity.change && (
                        <p className={`text-xs ${activity.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                          {activity.change}
                        </p>
                      )}
                      {activity.liquidity && (
                        <p className="text-sm text-white">{activity.liquidity}</p>
                      )}
                      {activity.amount && (
                        <p className="text-sm text-white">{activity.amount}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Launches */}
            <div className="bg-black/40 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FiClock className="text-[#0EA5E9]" />
                Upcoming Launches
              </h3>
              <div className="space-y-3">
                {upcomingLaunches.map((launch, index) => (
                  <div
                    key={index}
                    className="p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-white">
                          {launch.name} ({launch.symbol})
                        </h4>
                        <p className="text-xs text-white/50">{launch.description}</p>
                      </div>
                      <div className="flex gap-1">
                        {launch.badges.map((badge: string, i: number) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-[#0EA5E9]/20 text-[#0EA5E9] rounded-full">
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50">Launches in {launch.launch}</span>
                      <span className="text-white/50">Target: {launch.target}</span>
                      <span className="text-[#0EA5E9]">SOL Bonus: {launch.albBonus}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase */}
      <FeatureShowcase />

      {/* FAQ Section */}
      <section className="relative py-20 px-4 z-10 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-display">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-white/70">
              Everything you need to know about SoFi Launch
            </p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-black/40 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                >
                  <span className="text-white font-medium">{item.question}</span>
                  {expandedFaq === index ? (
                    <FiChevronUp className="w-5 h-5 text-[#0EA5E9]" />
                  ) : (
                    <FiChevronDown className="w-5 h-5 text-white/50" />
                  )}
                </button>
                <AnimatePresence>
                  {expandedFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-6 pb-4"
                    >
                      <p className="text-white/60 text-sm">{item.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/docs" className="text-[#0EA5E9] hover:text-[#0EA5E9]/80 transition-colors">
              View Full Documentation <FiExternalLink className="inline w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="relative z-10 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-16">
            {/* Logo */}
            <Link href="/" className="group" aria-label="Return to SoFi Launch Homepage">
              <div className="w-10 h-10 bg-black border border-white/10 rounded-md flex items-center justify-center transition-all group-hover:scale-110 group-hover:border-[#0EA5E9]/50 relative overflow-hidden">
                <span className="text-white font-bold text-sm font-display tracking-wider">S4</span>
                {/* Blue accent */}
                <div className="absolute top-2 right-2">
                  <svg width="6" height="6" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <line x1="0" y1="3" x2="6" y2="3" stroke="#0EA5E9" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="3" y1="0" x2="3" y2="6" stroke="#0EA5E9" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
            </Link>

            {/* Footer Content */}
            <div className="flex flex-col md:flex-row gap-16 md:gap-32 flex-1">
              <div className="flex flex-col gap-5 max-w-2xl">
                <p className="text-[10px] uppercase text-white/40 tracking-wider">
                  © 2025 SoFi Launch. All rights reserved.
                </p>
                <p className="text-[10px] uppercase text-white/40 leading-relaxed">
                  SoFi Launch is dedicated to enhancing the trading experience on DeFi by offering a CEX-like interface combined with the privacy benefits of decentralized finance. SoFi Launch is developed and managed independently of the Coinbase / Base team
                </p>
                <div className="flex gap-8 mt-2">
                  <Link href="/privacy" className="text-[10px] uppercase text-white/60 hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                  <Link href="/terms" className="text-[10px] uppercase text-white/60 hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </div>
              </div>

              {/* Back to Top Button */}
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="ml-auto group"
                aria-label="Scroll to Top"
                title="Back to Top"
              >
                <div className="w-10 h-10 bg-black border border-white/10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:border-[#0EA5E9]/50">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 19V5M7 10L11.285 4.8583C12.0618 3.5636 13.9382 3.5636 14.715 4.8583L19 10" stroke="#0EA5E9" strokeWidth="1.5"/>
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}