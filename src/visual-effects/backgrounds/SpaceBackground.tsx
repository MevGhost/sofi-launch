'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animationRef = useRef<number>();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Memoized resize handler with debouncing
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Only reinitialize stars if we don't have any yet
    if (starsRef.current.length === 0) {
      initStars();
    }
  }, []);

  // Initialize stars with fewer particles for better performance
  const initStars = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    starsRef.current = [];
    // Only render stars in the visible area (top 50% of screen)
    const numStars = 200;
    
    // Use a seeded random for consistent stars
    let seed = 12345;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    for (let i = 0; i < numStars; i++) {
      starsRef.current.push({
        x: seededRandom() * canvas.width,
        y: seededRandom() * (canvas.height * 0.6), // Only spawn in top 60% of screen
        size: seededRandom() * 2 + 0.5,
        speed: seededRandom() * 0.5 + 0.1, // Original speed
        opacity: seededRandom() * 0.8 + 0.2
      });
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initial setup
    resizeCanvas();
    initStars();
    
    // Animation loop
    const animate = () => {
      // Clear the entire canvas for clean rendering
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw stars
      starsRef.current.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        // Move star upward
        star.y -= star.speed;

        // Reset star when it goes off screen or enters the earth area (bottom 40%)
        if (star.y < -10 || star.y > canvas.height * 0.6) {
          star.y = canvas.height * 0.6; // Reset to just above the earth area
          star.x = Math.random() * canvas.width;
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    // Debounced resize handler
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeCanvas, 250);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      clearTimeout(resizeTimeout);
    };
  }, [mounted, resizeCanvas, initStars]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Deep space gradient background */}
      <div 
        className="absolute inset-0" 
        style={{
          background: 'radial-gradient(ellipse at bottom, #0C1116 0%, #090a0f 100%)',
          willChange: 'auto'
        }}
      />
      
      {/* Stars canvas */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0"
        style={{ 
          opacity: 0.7,
          willChange: 'auto'
        }}
      />
      
      {/* Horizon glow effect - MAIN BLUE GLOW */}
      <div 
        className="absolute bottom-0 left-0 right-0 overflow-hidden"
        style={{ 
          height: '70%'
        }}
      >
        {/* Outer blue glow */}
        <div 
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: '-20%',
            width: '160%',
            height: '100%',
            borderRadius: '100%',
            background: '#038bff',
            filter: 'blur(50px)',
            opacity: 0.4
          }}
        />
        
        {/* Inner blue glow */}
        <div 
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: '-10%',
            width: '130%',
            height: '70%',
            borderRadius: '100%',
            background: '#51AFFF',
            filter: 'blur(40px)',
            opacity: 0.5
          }}
        />
        
        {/* Center bright spot */}
        <div 
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: '0%',
            width: '80%',
            height: '40%',
            borderRadius: '650px / 350px',
            background: '#B0DAFF',
            filter: 'blur(30px)',
            opacity: 0.6
          }}
        />
      </div>
      
      {/* Earth silhouette with proper glow */}
      <div 
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: '-50%',
          width: '200%',
          height: '100%',
          borderRadius: '100%',
          background: 'black',
          boxShadow: 'inset 0px 0px 100px 40px rgba(3, 139, 255, 0.5)'
        }}
      >
        {/* Edge glow on earth */}
        <div 
          className="absolute inset-0"
          style={{
            borderRadius: '100%',
            background: 'linear-gradient(to top, transparent 0%, transparent 60%, rgba(3, 139, 255, 0.2) 90%, rgba(3, 139, 255, 0.4) 100%)'
          }}
        />
      </div>
    </div>
  );
}