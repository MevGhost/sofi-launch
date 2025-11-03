'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiCode, FiZap, FiTrendingUp, FiArrowRight, FiLayers, FiCpu, FiGlobe } from 'react-icons/fi';

export const CreativeProcessFlow = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const steps = [
    {
      number: "01",
      title: "Configure",
      subtitle: "Design Your Token",
      description: "Set parameters, supply, and bonding curve",
      icon: <FiCode />,
      color: "#0EA5E9",
      gradient: "from-[#0EA5E9] to-[#0052FF]",
      features: ["No coding required", "Instant preview", "Gas estimation"],
      visual: (
        <div className="relative w-full h-full flex items-center justify-center">
          <motion.div
            className="absolute w-32 h-32 rounded-full"
            style={{
              background: 'radial-gradient(circle, #0EA5E920, transparent)',
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <div className="relative grid grid-cols-3 gap-2">
            {[...Array(9)].map((_, i) => (
              <motion.div
                key={i}
                className="w-4 h-4 bg-[#0EA5E9] rounded-sm"
                initial={{ scale: 0, rotate: 0 }}
                animate={{ 
                  scale: 1, 
                  rotate: 45,
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{ 
                  delay: i * 0.1,
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 1
                }}
              />
            ))}
          </div>
        </div>
      )
    },
    {
      number: "02", 
      title: "Deploy",
      subtitle: "Launch to Blockchain",
      description: "One-click deployment with verification",
      icon: <FiZap />,
      color: "#0052FF",
      gradient: "from-[#0052FF] to-[#8B5CF6]",
      features: ["Anti-bot protection", "Fair launch start", "Live trading"],
      visual: (
        <div className="relative w-full h-full flex items-center justify-center">
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
          >
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-24 h-24 border-2 border-[#0052FF] rounded-full"
                style={{
                  borderStyle: 'dashed',
                }}
                animate={{
                  rotate: i % 2 === 0 ? 360 : -360,
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 10 + i * 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            ))}
          </motion.div>
          <FiCpu className="w-12 h-12 text-[#0052FF] relative z-10" />
        </div>
      )
    },
    {
      number: "03",
      title: "Graduate",
      subtitle: "Achieve Success",
      description: "Automatic DEX listing at $69K",
      icon: <FiTrendingUp />,
      color: "#8B5CF6",
      gradient: "from-[#8B5CF6] to-[#0EA5E9]",
      features: ["$12K liquidity", "LP tokens burned", "Permanent liquidity"],
      visual: (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Rotating star path */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <svg className="w-24 h-24" viewBox="0 0 100 100">
              <motion.path
                d="M 50,15 L 60,35 L 82,35 L 65,50 L 75,70 L 50,55 L 25,70 L 35,50 L 18,35 L 40,35 Z"
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 1
                }}
              />
            </svg>
          </motion.div>
          {/* Center globe icon */}
          <div className="relative z-10">
            <FiGlobe className="w-10 h-10 text-[#8B5CF6]" />
          </div>
        </div>
      )
    }
  ];

  return (
    <section className="relative py-32 px-4 z-10 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(90deg, #0EA5E9 1px, transparent 1px),
                            linear-gradient(180deg, #0EA5E9 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
            transform: 'perspective(500px) rotateX(60deg)',
            transformOrigin: 'center center'
          }} />
        </div>

        {/* Section Header */}
        <motion.div 
          className="text-center mb-20 relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 font-display">
            Your Journey to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0EA5E9] to-[#0052FF]">Success</span>
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            From idea to liquidity in three revolutionary steps
          </p>
        </motion.div>

        {/* Main Interactive Display */}
        <div className="relative">
          {/* Progress Bar */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-white/10 -translate-y-1/2 z-0">
            <motion.div
              className="h-full bg-gradient-to-r from-[#0EA5E9] to-[#8B5CF6]"
              initial={{ width: "0%" }}
              animate={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>

          {/* Steps Container */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                className="relative"
                onMouseEnter={() => setHoveredStep(index)}
                onMouseLeave={() => setHoveredStep(null)}
                onClick={() => setActiveStep(index)}
              >

                {/* Card */}
                <motion.div
                  className={`
                    relative bg-black/40 backdrop-blur-xl border rounded-2xl p-8 cursor-pointer
                    transition-all duration-300 h-full flex flex-col
                    ${activeStep === index ? 'border-white/30 bg-black/60' : 'border-white/10'}
                  `}
                  whileHover={{ scale: 1.02, y: -5 }}
                  style={{
                    boxShadow: activeStep === index ? `0 20px 40px ${step.color}20` : 'none',
                  }}
                >
                  {/* Active Indicator */}
                  <motion.div
                    className="absolute -top-px -left-px -right-px h-1 rounded-t-2xl"
                    style={{
                      background: `linear-gradient(90deg, ${step.color}, ${step.color === '#0EA5E9' ? '#0052FF' : step.color === '#0052FF' ? '#8B5CF6' : '#0EA5E9'})`,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: activeStep === index ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                  />

                  {/* Visual Display Area */}
                  <div className="h-32 mb-6 rounded-xl bg-white/5 overflow-hidden">
                    {step.visual}
                  </div>

                  {/* Step Number Badge */}
                  <div className="flex items-center gap-4 mb-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg"
                      style={{
                        background: `linear-gradient(135deg, ${step.color}20, ${step.color}10)`,
                        color: step.color,
                        border: `1px solid ${step.color}30`,
                      }}
                    >
                      {step.number}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{step.title}</h3>
                      <p className="text-xs text-white/50">{step.subtitle}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-white/60 mb-6">{step.description}</p>

                  {/* Features */}
                  <div className="space-y-2 flex-grow">
                    {step.features.map((feature, i) => (
                      <motion.div
                        key={i}
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ 
                          opacity: hoveredStep === index ? 1 : 0.7,
                          x: hoveredStep === index ? 0 : -10
                        }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <div 
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: step.color }}
                        />
                        <span className="text-sm text-white/50">{feature}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Action Indicator */}
                  <motion.div
                    className="absolute bottom-4 right-4"
                    animate={{
                      x: hoveredStep === index ? 5 : 0,
                      opacity: hoveredStep === index ? 1 : 0.3,
                    }}
                  >
                    <FiArrowRight className="w-5 h-5 text-white/30" />
                  </motion.div>
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* Mobile Step Indicator */}
          <div className="flex justify-center gap-2 mt-8 md:hidden">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                className={`
                  h-2 rounded-full transition-all
                  ${activeStep === index ? 'w-8 bg-[#0EA5E9]' : 'w-2 bg-white/30'}
                `}
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};