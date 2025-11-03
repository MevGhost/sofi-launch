'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';
import { FiX } from 'react-icons/fi';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: number[]; // Percentage heights
  initialSnap?: number;
  showHandle?: boolean;
  showCloseButton?: boolean;
  backdrop?: boolean;
  backdropBlur?: boolean;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = [50, 90],
  initialSnap = 0,
  showHandle = true,
  showCloseButton = true,
  backdrop = true,
  backdropBlur = true,
}: BottomSheetProps) {
  const [currentSnapIndex, setCurrentSnapIndex] = useState(initialSnap);
  const controls = useAnimation();
  const constraintsRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Calculate snap height
  const getSnapHeight = useCallback((index: number) => {
    const windowHeight = window.innerHeight;
    const percentage = snapPoints[Math.min(index, snapPoints.length - 1)];
    return windowHeight * (percentage / 100);
  }, [snapPoints]);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when open
      document.body.style.overflow = 'hidden';
      controls.start({
        y: window.innerHeight - getSnapHeight(currentSnapIndex),
        transition: { type: 'spring', damping: 30, stiffness: 300 }
      });
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, currentSnapIndex, controls, getSnapHeight]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const velocity = info.velocity.y;
    const draggedDistance = info.offset.y;
    
    // Close if dragged down significantly
    if (draggedDistance > 150 || velocity > 500) {
      onClose();
      return;
    }

    // Snap to nearest point
    const currentHeight = window.innerHeight - info.point.y;
    const windowHeight = window.innerHeight;
    
    let nearestSnapIndex = 0;
    let minDistance = Infinity;
    
    snapPoints.forEach((percentage, index) => {
      const snapHeight = windowHeight * (percentage / 100);
      const distance = Math.abs(currentHeight - snapHeight);
      if (distance < minDistance) {
        minDistance = distance;
        nearestSnapIndex = index;
      }
    });

    setCurrentSnapIndex(nearestSnapIndex);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          {backdrop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className={`fixed inset-0 bg-canvas/60 z-40 ${
                backdropBlur ? 'backdrop-blur-sm' : ''
              }`}
            />
          )}

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: window.innerHeight }}
            animate={controls}
            exit={{ y: window.innerHeight }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 bg-canvas/95 backdrop-blur-2xl border-t border-border rounded-t-3xl overflow-hidden"
            style={{ height: '100vh' }}
          >
            {/* Handle */}
            {showHandle && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1 bg-surface3 rounded-full" />
            )}

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-semibold text-text-primary">{title || ''}</h3>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg bg-surface3 hover:bg-surface2 flex items-center justify-center transition-colors"
                  >
                    <FiX className="w-4 h-4 text-text-primary/60" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto h-full pb-20">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Mini Bottom Sheet for quick actions
export function MiniBottomSheet({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-canvas/40 z-40"
          />
          
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-canvas/95 backdrop-blur-2xl border-t border-border rounded-t-2xl"
          >
            <div className="w-12 h-1 bg-surface3 rounded-full mx-auto mt-3 mb-4" />
            <div className="px-4 pb-8">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}