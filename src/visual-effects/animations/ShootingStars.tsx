'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ShootingStarsProps {
  count?: number;
  className?: string;
}

export function ShootingStars({ count = 3, className = '' }: ShootingStarsProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="shooting-star"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{
            duration: 3,
            delay: i * 1.5,
            repeat: Infinity,
            repeatDelay: Math.random() * 5,
          }}
        />
      ))}
      
      <style jsx>{`
        .shooting-star {
          position: absolute;
          height: 2px;
          background: linear-gradient(90deg, transparent, #0EA5E9, #06B6D4, transparent);
          border-radius: 999px;
          filter: drop-shadow(0 0 6px rgba(14, 165, 233, 0.8));
          animation: shooting 3s ease-in-out infinite, tail 3s ease-in-out infinite;
        }
        
        .shooting-star::before {
          content: '';
          position: absolute;
          top: calc(50% - 1px);
          right: 0;
          height: 2px;
          background: linear-gradient(-45deg, transparent, #0EA5E9, transparent);
          transform: translateX(50%) rotateZ(45deg);
          border-radius: 100%;
          animation: shining 3s ease-in-out infinite;
        }
        
        .shooting-star::after {
          content: '';
          position: absolute;
          top: calc(50% - 1px);
          right: 0;
          height: 2px;
          background: linear-gradient(-45deg, transparent, #06B6D4, transparent);
          transform: translateX(50%) rotateZ(-45deg);
          border-radius: 100%;
          animation: shining 3s ease-in-out infinite;
        }
        
        .shooting-star:nth-child(1) {
          top: 10%;
          left: -10%;
          animation-delay: 0s;
        }
        
        .shooting-star:nth-child(2) {
          top: 30%;
          left: -10%;
          animation-delay: 1.5s;
        }
        
        .shooting-star:nth-child(3) {
          top: 50%;
          left: -10%;
          animation-delay: 3s;
        }
        
        @keyframes tail {
          0% {
            width: 0;
          }
          30% {
            width: 60px;
          }
          100% {
            width: 0;
          }
        }
        
        @keyframes shining {
          0% {
            width: 0;
          }
          50% {
            width: 20px;
          }
          100% {
            width: 0;
          }
        }
        
        @keyframes shooting {
          0% {
            transform: translateX(0) translateY(0) rotate(-45deg);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateX(150px) translateY(150px) rotate(-45deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}