'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiBell, FiCheck, FiAlertCircle, FiTrendingUp, FiShield, FiDollarSign, FiClock } from 'react-icons/fi';
import { Card } from './Card';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: HTMLButtonElement | null;
}

interface Notification {
  id: string;
  type: 'trade' | 'escrow' | 'system' | 'price';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  icon: React.ReactNode;
}

export function NotificationModal({ isOpen, onClose, anchorRef }: NotificationModalProps) {
  const [modalPosition, setModalPosition] = useState({ top: 80, right: 24 });
  const [notifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'trade',
      title: 'Trade Executed',
      message: 'Successfully bought 1,000 BONK for 0.5 ETH',
      timestamp: '2 minutes ago',
      read: false,
      icon: <FiTrendingUp size={16} className="text-success" />
    },
    {
      id: '2',
      type: 'escrow',
      title: 'Milestone Released',
      message: 'Milestone #2 has been released - 5,000 USDC',
      timestamp: '1 hour ago',
      read: false,
      icon: <FiShield size={16} className="text-primary" />
    },
    {
      id: '3',
      type: 'price',
      title: 'Price Alert',
      message: 'PEPE reached your target price of $0.001',
      timestamp: '3 hours ago',
      read: true,
      icon: <FiDollarSign size={16} className="text-warning" />
    },
    {
      id: '4',
      type: 'system',
      title: 'System Update',
      message: 'Platform maintenance scheduled for tomorrow',
      timestamp: '1 day ago',
      read: true,
      icon: <FiAlertCircle size={16} className="text-info" />
    }
  ]);

  // Calculate position based on anchor element
  useEffect(() => {
    if (anchorRef && isOpen) {
      const rect = anchorRef.getBoundingClientRect();
      const modalWidth = 400; // max-w-md is roughly 400px
      
      // Position below the button
      let top = rect.bottom + 8;
      let right = window.innerWidth - rect.right;
      
      // Adjust if modal would go off-screen
      if (right + modalWidth > window.innerWidth) {
        right = window.innerWidth - modalWidth - 24;
      }
      
      setModalPosition({ top, right });
    }
  }, [anchorRef, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with proper blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
            onClick={onClose}
          />

          {/* Modal positioned dynamically below notification button */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed w-full max-w-md z-[101]"
            style={{ 
              top: `${modalPosition.top}px`, 
              right: `${modalPosition.right}px` 
            }}
          >
            <Card className="p-0 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiBell size={18} className="text-text-muted" />
                  <h2 className="text-lg font-semibold text-text-primary">Notifications</h2>
                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                    {notifications.filter(n => !n.read).length} new
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.03] transition-all duration-fast"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Notifications FiList */}
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <FiBell size={32} className="text-text-muted mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-text-muted">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`p-4 hover:bg-white/[0.02] transition-colors duration-fast cursor-pointer ${
                          !notification.read ? 'bg-primary/[0.02]' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface2">
                            {notification.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-text-primary">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-text-muted mt-0.5">
                                  {notification.message}
                                </p>
                              </div>
                              {!notification.read && (
                                <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <FiClock size={12} className="text-text-muted" />
                              <span className="text-xs text-text-muted">
                                {notification.timestamp}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-3 border-t border-border">
                  <button className="w-full text-center text-xs text-primary hover:text-primary/80 transition-colors duration-fast font-medium">
                    Mark all as read
                  </button>
                </div>
              )}
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}