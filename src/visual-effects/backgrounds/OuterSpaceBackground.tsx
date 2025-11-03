'use client';

import React from 'react';

export function OuterSpaceBackground() {
  // Disable when performance mode enabled (class on body)
  if (typeof document !== 'undefined' && document.body.classList.contains('performance-mode')) {
    return null;
  }

  return (
    <>
      {/* Stars Layer - Base background */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: `#000 url('/icons/stars.png') repeat top center`,
        }}
      />
      
      {/* Twinkling Layer - Animated twinkling effect */}
      <div 
        className="fixed inset-0 z-[1]"
        style={{
          background: `transparent url('/icons/twinkling.png') repeat top center`,
          animation: 'move-twink-back 200s linear infinite',
        }}
      />
      
      {/* Clouds/Nebula Layer - Animated clouds */}
      <div 
        className="fixed inset-0 z-[2]"
        style={{
          background: `transparent url('/icons/clouds.png') repeat top center`,
          animation: 'move-clouds-back 200s linear infinite',
          opacity: 0.7, // Slightly transparent to not overpower content
        }}
      />
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes move-twink-back {
          from {
            background-position: 0 0;
          }
          to {
            background-position: -10000px 5000px;
          }
        }
        
        @keyframes move-clouds-back {
          from {
            background-position: 0 0;
          }
          to {
            background-position: 10000px 0;
          }
        }
      `}</style>
    </>
  );
}