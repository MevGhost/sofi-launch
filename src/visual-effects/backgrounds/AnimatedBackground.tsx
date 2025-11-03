'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function AnimatedBackground() {
  const [stars, setStars] = useState<Array<{ size: number; shouldTwinkle: boolean; left: number; top: number; opacity: number; duration: number; delay: number }>>([]);
  
  useEffect(() => {
    // Generate stars only on client side
    const generatedStars = [...Array(50)].map(() => ({
      size: 0.5 + Math.random() * 1,
      shouldTwinkle: Math.random() > 0.7,
      left: Math.random() * 100,
      top: Math.random() * 100,
      opacity: 0.4 + Math.random() * 0.4,
      duration: 4 + Math.random() * 4,
      delay: Math.random() * 20
    }));
    setStars(generatedStars);
  }, []);
  
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-blue-950/20 to-blue-950/20" />
      
      {/* Animated Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-20 left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
      />
      
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -30, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute bottom-20 right-20 w-96 h-96 bg-[#0EA5E9]/10 rounded-full blur-3xl"
      />
      
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          x: [0, 40, 0],
          y: [0, -40, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#0052FF]/5 rounded-full blur-3xl"
      />
      
      {/* Grid Pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      
      {/* Stars (Static with subtle twinkle) */}
      {stars.map((star, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
          }}
          initial={{ opacity: star.opacity }}
          animate={star.shouldTwinkle ? {
            opacity: [0.4, 0.9, 0.4],
          } : {}}
          transition={star.shouldTwinkle ? {
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeInOut",
          } : {}}
        />
      ))}
    </div>
  );
}