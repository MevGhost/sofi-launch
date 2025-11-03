'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiZap, FiShield, FiLock, FiTarget, FiUsers, FiGitBranch,
  FiPercent, FiActivity, FiAward, FiDatabase, FiLayers, FiCpu,
  FiCheck, FiChevronRight
} from 'react-icons/fi';

export const FeatureShowcase = () => {
  const [activeCategory, setActiveCategory] = useState(0);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  const categories = [
    {
      name: "Launch Mechanics",
      icon: <FiZap />,
      color: "#0EA5E9",
      bgGradient: "from-[#0EA5E9]/5 to-transparent",
      features: [
        { id: 'bonding', name: "Bonding Curve Launch", description: "Fair price discovery mechanism" },
        { id: 'price', name: "Fair Price Discovery", description: "No manipulation, pure market dynamics" },
        { id: 'antibot', name: "Anti-Bot Protection", description: "MEV protection built-in" },
        { id: 'limits', name: "Maximum TX Limits", description: "Prevent whale manipulation" }
      ]
    },
    {
      name: "Security Features", 
      icon: <FiShield />,
      color: "#0052FF",
      bgGradient: "from-[#0052FF]/5 to-transparent",
      features: [
        { id: 'autolock', name: "Liquidity Auto-Lock", description: "Permanent liquidity guarantee" },
        { id: 'vesting', name: "Team Token Vesting", description: "Prevents team dumps" },
        { id: 'honeypot', name: "Honeypot Detection", description: "Auto-scan for malicious code" },
        { id: 'rugpull', name: "Rug-Pull Prevention", description: "Multi-layer protection system" }
      ]
    },
    {
      name: "Escrow System",
      icon: <FiTarget />,
      color: "#8B5CF6",
      bgGradient: "from-[#8B5CF6]/5 to-transparent",
      features: [
        { id: 'milestone', name: "Milestone Payments", description: "Release funds on delivery" },
        { id: 'multisig', name: "Multi-Sig Approvals", description: "Decentralized verification" },
        { id: 'dispute', name: "Dispute Resolution", description: "Fair arbitration system" },
        { id: 'autorelease', name: "Automatic Release", description: "Smart contract automation" }
      ]
    },
    {
      name: "ALB Integration",
      icon: <FiPercent />,
      color: "#10B981",
      bgGradient: "from-[#10B981]/5 to-transparent",
      features: [
        { id: 'discount', name: "50% Fee Discount", description: "Half price with ALB" },
        { id: 'staking', name: "Staking Rewards", description: "Earn passive income" },
        { id: 'governance', name: "Governance Rights", description: "Vote on platform decisions" },
        { id: 'revenue', name: "Revenue Sharing", description: "Share platform success" }
      ]
    }
  ];

  return (
    <section className="relative py-32 px-4 z-10 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 relative z-10">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4 font-display"
          >
            Built for the <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0EA5E9] to-[#0052FF]">Future</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-white/60 max-w-2xl mx-auto"
          >
            A comprehensive suite of tools designed for the next generation of DeFi
          </motion.p>
        </div>

        {/* Main Content Area */}
        <div className="relative">
          {/* Category Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {categories.map((category, idx) => (
              <motion.button
                key={idx}
                onClick={() => setActiveCategory(idx)}
                className={`
                  group relative px-6 py-3 rounded-xl transition-all
                  ${activeCategory === idx 
                    ? 'bg-white/10 border-white/20' 
                    : 'bg-black/20 border-white/5 hover:bg-white/5'}
                  border backdrop-blur-sm
                `}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                {activeCategory === idx && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: `linear-gradient(135deg, ${category.color}10, transparent)`,
                      borderColor: `${category.color}30`
                    }}
                  />
                )}
                <div className="relative flex items-center gap-2">
                  <div style={{ color: activeCategory === idx ? category.color : 'white' }} className="opacity-70">
                    {React.cloneElement(category.icon, { className: "w-4 h-4" })}
                  </div>
                  <span className={`text-sm font-medium ${activeCategory === idx ? 'text-white' : 'text-white/60'}`}>
                    {category.name}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Feature Grid Display */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              {/* Category Header */}
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                  style={{
                    background: `linear-gradient(135deg, ${categories[activeCategory].color}20, ${categories[activeCategory].color}10)`,
                    border: `1px solid ${categories[activeCategory].color}30`
                  }}
                >
                  <div style={{ color: categories[activeCategory].color }}>
                    {React.cloneElement(categories[activeCategory].icon, { className: "w-8 h-8" })}
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{categories[activeCategory].name}</h3>
                <p className="text-white/50">Essential tools for modern token launches</p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {categories[activeCategory].features.map((feature, idx) => (
                  <motion.div
                    key={feature.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      transition: { delay: idx * 0.05 }
                    }}
                    className="group relative"
                    onMouseEnter={() => setHoveredFeature(feature.id)}
                    onMouseLeave={() => setHoveredFeature(null)}
                  >
                    <div className={`
                      relative bg-black/30 backdrop-blur-sm border border-white/10 
                      rounded-xl p-6 transition-all duration-300
                      ${hoveredFeature === feature.id ? 'border-white/20 bg-black/40' : ''}
                    `}>
                      {/* Hover Gradient */}
                      {hoveredFeature === feature.id && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`absolute inset-0 rounded-xl bg-gradient-to-br ${categories[activeCategory].bgGradient}`}
                        />
                      )}
                      
                      {/* Content */}
                      <div className="relative">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{
                                background: `linear-gradient(135deg, ${categories[activeCategory].color}20, transparent)`,
                                border: `1px solid ${categories[activeCategory].color}30`
                              }}
                            >
                              <FiCheck style={{ color: categories[activeCategory].color }} className="w-4 h-4" />
                            </div>
                            <h4 className="text-lg font-semibold text-white">{feature.name}</h4>
                          </div>
                          <motion.div
                            animate={{ 
                              x: hoveredFeature === feature.id ? 5 : 0,
                              opacity: hoveredFeature === feature.id ? 1 : 0.3
                            }}
                          >
                            <FiChevronRight className="w-5 h-5 text-white/50" />
                          </motion.div>
                        </div>
                        <p className="text-sm text-white/50 ml-13">{feature.description}</p>
                        
                        {/* Progress Bar Decoration */}
                        <div className="mt-4 ml-13">
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: categories[activeCategory].color }}
                              initial={{ width: 0 }}
                              animate={{ 
                                width: hoveredFeature === feature.id ? '100%' : '60%',
                                opacity: hoveredFeature === feature.id ? 0.5 : 0.2
                              }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Bottom Stats */}
              <div className="grid grid-cols-4 gap-4 mt-12 max-w-2xl mx-auto">
                {[
                  { label: 'Features', value: '16+' },
                  { label: 'Chains', value: '2' },
                  { label: 'Security', value: '100%' },
                  { label: 'Uptime', value: '99.9%' }
                ].map((stat, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      transition: { delay: 0.3 + idx * 0.05 }
                    }}
                    className="text-center"
                  >
                    <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-xs text-white/40 uppercase tracking-wider">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};