import { motion, AnimatePresence, MotionProps } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';
import React from 'react';

// Only use animations for critical UI feedback
const PERFORMANCE_MODE = process.env.NEXT_PUBLIC_PERFORMANCE_MODE === 'true';

interface OptimizedMotionProps extends MotionProps {
  children: React.ReactNode;
  disableAnimations?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

// Wrapper that conditionally applies animations based on performance settings
export function OptimizedMotion({
  children,
  disableAnimations = false,
  priority = 'medium',
  ...motionProps
}: OptimizedMotionProps) {
  const prefersReducedMotion = useReducedMotion();

  // Skip animations if:
  // 1. User prefers reduced motion
  // 2. Performance mode is enabled and priority is not high
  // 3. Animations are explicitly disabled
  const shouldSkipAnimation = 
    prefersReducedMotion || 
    disableAnimations || 
    (PERFORMANCE_MODE && priority !== 'high');

  if (shouldSkipAnimation) {
    return <>{children}</>;
  }

  // Only apply simple, performant animations
  const optimizedProps = {
    ...motionProps,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
      ...motionProps.transition,
    },
  };

  return <motion.div {...optimizedProps}>{children}</motion.div>;
}

// Simplified fade animation
export function FadeIn({ 
  children, 
  delay = 0,
  duration = 0.2,
  className,
}: { 
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion || PERFORMANCE_MODE) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Simplified slide animation
export function SlideIn({
  children,
  direction = 'up',
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion || PERFORMANCE_MODE) {
    return <div className={className}>{children}</div>;
  }

  const directionOffset = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directionOffset[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger children animations (only for critical lists)
export function StaggerChildren({
  children,
  staggerDelay = 0.1,
  className,
}: {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion || PERFORMANCE_MODE) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// Page transition wrapper
export function PageTransition({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion || PERFORMANCE_MODE) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Remove all decorative animations
export function removeDecorativeAnimations(Component: React.ComponentType<any>) {
  return function OptimizedComponent(props: any) {
    const prefersReducedMotion = useReducedMotion();
    
    if (prefersReducedMotion || PERFORMANCE_MODE) {
      // Return component without motion wrapper
      return <Component {...props} disableAnimations={true} />;
    }
    
    return <Component {...props} />;
  };
}