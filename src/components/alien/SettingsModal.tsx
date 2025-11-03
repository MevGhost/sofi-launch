'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiGlobe, FiVolume2, FiBell, FiShield, FiEye, FiEyeOff } from 'react-icons/fi';
import { Button } from './Button';
import { Card } from './Card';
import { useAccount } from 'wagmi';
import { showToast } from '@/components/ToastProvider';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Settings context that components can use
export const useSettings = () => {
  const [settings, setSettings] = useState({
    language: 'en',
    slippage: '0.5',
    deadline: '30',
    soundEnabled: true,
    expertMode: false,
    hideBalances: false,
    performanceMode: false,
  });

  useEffect(() => {
    // Load all settings from localStorage
    const loadedSettings = {
      language: localStorage.getItem('language') || 'en',
      slippage: localStorage.getItem('slippage') || '0.5',
      deadline: localStorage.getItem('deadline') || '30',
      soundEnabled: localStorage.getItem('soundEnabled') !== 'false',
      expertMode: localStorage.getItem('expertMode') === 'true',
      hideBalances: localStorage.getItem('hideBalances') === 'true',
      performanceMode: localStorage.getItem('performanceMode') === 'true',
    };
    setSettings(loadedSettings);
  }, []);

  return settings;
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'trading' | 'security'>('general');
  const [slippage, setSlippage] = useState('0.5');
  const [customSlippage, setCustomSlippage] = useState('');
  const [deadline, setDeadline] = useState('30');
  const [language, setLanguage] = useState('en');
  const [soundEnabled, setSoundEnabled] = useState(true); // Keep for future transaction sounds
  const [expertMode, setExpertMode] = useState(false);
  const [hideBalances, setHideBalances] = useState(false);
  const [performanceMode, setPerformanceMode] = useState(false);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const { address, isConnected } = useAccount();
  
  // Load all settings from localStorage when modal opens
  useEffect(() => {
    if (isOpen) {
      const savedLanguage = localStorage.getItem('language') || 'en';
      const savedSlippage = localStorage.getItem('slippage') || '0.5';
      const savedDeadline = localStorage.getItem('deadline') || '30';
      const savedSound = localStorage.getItem('soundEnabled') !== 'false';
      const savedExpert = localStorage.getItem('expertMode') === 'true';
      const savedHideBalances = localStorage.getItem('hideBalances') === 'true';
      const savedPerformance = localStorage.getItem('performanceMode') === 'true';
      const savedDensity = (localStorage.getItem('density') as 'comfortable' | 'compact') || 'comfortable';
      
      setLanguage(savedLanguage);
      setSlippage(savedSlippage);
      setDeadline(savedDeadline);
      setSoundEnabled(savedSound);
      setExpertMode(savedExpert);
      setHideBalances(savedHideBalances);
      setPerformanceMode(savedPerformance);
      setDensity(savedDensity);

      // Apply classes immediately when opening to reflect saved state
      if (savedHideBalances) {
        document.body.classList.add('hide-balances');
      } else {
        document.body.classList.remove('hide-balances');
      }
      if (savedPerformance) {
        document.body.classList.add('performance-mode');
      } else {
        document.body.classList.remove('performance-mode');
      }
      if (savedDensity === 'compact') {
        document.body.classList.add('density-compact');
      } else {
        document.body.classList.remove('density-compact');
      }
    }
  }, [isOpen]);
  
  // Apply language change
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    // Trigger i18n language change if you have i18n setup
    // For now, we'll just store it
    document.documentElement.lang = newLang;
  };
  
  // Handle slippage selection
  const handleSlippageSelect = (value: string) => {
    setSlippage(value);
    setCustomSlippage('');
  };
  
  // Handle custom slippage
  const handleCustomSlippage = (value: string) => {
    // Validate number input
    if (value && !isNaN(Number(value))) {
      setSlippage(value);
      setCustomSlippage(value);
    }
  };
  
  // Get browser and OS info
  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let os = 'Unknown';
    
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    
    if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';
    
    return `${browser} on ${os}`;
  };
  
  // Save all settings
  const handleSave = () => {
    // Save all settings to localStorage
    localStorage.setItem('language', language);
    localStorage.setItem('slippage', slippage);
    localStorage.setItem('deadline', deadline);
    localStorage.setItem('soundEnabled', soundEnabled.toString());
    localStorage.setItem('expertMode', expertMode.toString());
    localStorage.setItem('hideBalances', hideBalances.toString());
    localStorage.setItem('performanceMode', performanceMode.toString());
    localStorage.setItem('density', density);
    
    // Apply hide balances to all balance elements
    if (hideBalances) {
      document.body.classList.add('hide-balances');
    } else {
      document.body.classList.remove('hide-balances');
    }

    // Apply performance mode class
    if (performanceMode) {
      document.body.classList.add('performance-mode');
    } else {
      document.body.classList.remove('performance-mode');
    }
    if (density === 'compact') {
      document.body.classList.add('density-compact');
    } else {
      document.body.classList.remove('density-compact');
    }
    
    showToast.success('Settings saved successfully');
    onClose();
  };

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

          {/* Modal - Properly centered */}
          <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-2xl"
            >
            <Card className="p-0 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-text-primary">Settings</h2>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.03] transition-all duration-fast"
                  >
                    <FiX size={18} />
                  </button>
                </div>

                {/* Tabs */}
                <div className="px-6 pt-4 flex gap-1">
                  {['general', 'trading', 'security'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab as any);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-fast ${
                        activeTab === tab
                          ? 'bg-primary/10 text-primary'
                          : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                  {activeTab === 'general' && (
                    <div className="space-y-6">
                      {/* Language */}
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-3">Language</label>
                        <div className="relative">
                          <FiGlobe className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                          <select
                            value={language}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            className="w-full h-10 pl-10 pr-4 bg-surface2 border border-border rounded-lg text-text-primary focus:border-primary focus:outline-none transition-colors duration-fast text-sm appearance-none cursor-pointer"
                          >
                            <option value="en">English</option>
                            <option value="es">Español</option>
                            <option value="zh">中文</option>
                            <option value="ja">日本語</option>
                            <option value="ko">한국어</option>
                          </select>
                        </div>
                      </div>

                      {/* Sound - Keep UI for future transaction sounds */}
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-3">Sound Effects</label>
                        <div className="flex items-center justify-between p-3 bg-surface2 rounded-lg border border-border">
                          <div className="flex items-center gap-3">
                            <FiVolume2 size={18} className="text-text-muted" />
                            <span className="text-sm text-text-primary">Transaction sounds</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={soundEnabled}
                              onChange={(e) => setSoundEnabled(e.target.checked)}
                            />
                            <div className="w-10 h-5 bg-surface3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      </div>

                      {/* Performance Mode */}
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-3">Performance</label>
                        <div className="flex items-center justify-between p-3 bg-surface2 rounded-lg border border-border">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-text-primary">Performance mode</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={performanceMode}
                              onChange={(e) => setPerformanceMode(e.target.checked)}
                            />
                            <div className="w-10 h-5 bg-surface3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                        <p className="text-xs text-text-muted mt-2">Disables decorative animations and backgrounds to improve performance.</p>
                      </div>

                      {/* Density */}
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-3">Density</label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDensity('comfortable')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${density === 'comfortable' ? 'bg-primary/10 border border-primary text-primary' : 'bg-surface2 border border-border text-text-muted hover:border-border-hover'}`}
                          >
                            Comfortable
                          </button>
                          <button
                            onClick={() => setDensity('compact')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${density === 'compact' ? 'bg-primary/10 border border-primary text-primary' : 'bg-surface2 border border-border text-text-muted hover:border-border-hover'}`}
                          >
                            Compact
                          </button>
                        </div>
                        <p className="text-xs text-text-muted mt-2">Compact reduces paddings and row heights to show more data.</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'trading' && (
                    <div className="space-y-6">
                      {/* Slippage */}
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-3">
                          Slippage Tolerance
                        </label>
                        <div className="flex gap-2">
                          {['0.1', '0.5', '1.0'].map((value) => (
                            <button
                              key={value}
                              onClick={() => handleSlippageSelect(value)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-fast ${
                                slippage === value && !customSlippage
                                  ? 'bg-primary/10 border border-primary text-primary'
                                  : 'bg-surface2 border border-border text-text-muted hover:border-border-hover'
                              }`}
                            >
                              {value}%
                            </button>
                          ))}
                          <input
                            type="text"
                            value={customSlippage}
                            onChange={(e) => handleCustomSlippage(e.target.value)}
                            placeholder="Custom"
                            className="flex-1 px-3 py-2 bg-surface2 border border-border rounded-lg text-text-primary placeholder-text-muted focus:border-primary focus:outline-none transition-colors duration-fast text-sm"
                          />
                        </div>
                        {Number(slippage) > 5 && (
                          <p className="text-xs text-warning mt-2">High slippage tolerance. Your transaction may be frontrun.</p>
                        )}
                      </div>

                      {/* Transaction Deadline */}
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-3">
                          Transaction Deadline
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={deadline}
                            onChange={(e) => {
                              if (!isNaN(Number(e.target.value))) {
                                setDeadline(e.target.value);
                              }
                            }}
                            className="w-20 px-3 py-2 bg-surface2 border border-border rounded-lg text-text-primary focus:border-primary focus:outline-none transition-colors duration-fast text-sm text-center"
                          />
                          <span className="text-sm text-text-muted">minutes</span>
                        </div>
                      </div>

                      {/* Expert Mode */}
                      <div className="p-3 bg-surface2 rounded-lg border border-border">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-text-primary">Expert Mode</p>
                            <p className="text-xs text-text-muted mt-1">Bypasses confirmation modals and warnings</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={expertMode}
                              onChange={(e) => {
                                setExpertMode(e.target.checked);
                                if (e.target.checked) {
                                  showToast.info('Expert mode enabled. Be careful!');
                                }
                              }}
                            />
                            <div className="w-10 h-5 bg-surface3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'security' && (
                    <div className="space-y-6">
                      {/* Session Management */}
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-3">
                          Active Sessions
                        </label>
                        <div className="space-y-2">
                          <div className="p-3 bg-surface2 rounded-lg border border-border flex items-center justify-between">
                            <div>
                              <p className="text-sm text-text-primary">Current Session</p>
                              <p className="text-xs text-text-muted">{getBrowserInfo()} • Now</p>
                              {isConnected && address && (
                                <p className="text-xs text-text-muted mt-1">
                                  Wallet: {address.slice(0, 6)}...{address.slice(-4)}
                                </p>
                              )}
                            </div>
                            <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">Active</span>
                          </div>
                        </div>
                      </div>

                      {/* Privacy */}
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-text-secondary">Privacy</label>
                        <div className="p-3 bg-surface2 rounded-lg border border-border">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {hideBalances ? <FiEyeOff size={18} className="text-text-muted" /> : <FiEye size={18} className="text-text-muted" />}
                              <div>
                                <p className="text-sm text-text-primary">Hide balances</p>
                                <p className="text-xs text-text-muted mt-1">Replace amounts with ****</p>
                              </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={hideBalances}
                                onChange={(e) => setHideBalances(e.target.checked)}
                              />
                              <div className="w-10 h-5 bg-surface3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Export Data */}
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-3">Data Management</label>
                        <div className="flex gap-3">
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => {
                              // Export settings as JSON
                              const settings = {
                                language,
                                slippage,
                                deadline,
                                soundEnabled,
                                expertMode,
                                hideBalances,
                                exportDate: new Date().toISOString()
                              };
                              const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = 's4labs-settings.json';
                              a.click();
                              URL.revokeObjectURL(url);
                              showToast.success('Settings exported successfully');
                            }}
                          >
                            Export Settings
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              if (confirm('This will clear all saved settings and reset to defaults. Continue?')) {
                                localStorage.clear();
                                window.location.reload();
                              }
                            }}
                          >
                            Clear All Data
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border flex items-center justify-end gap-3">
                  <Button variant="ghost" onClick={onClose}>Cancel</Button>
                  <Button variant="primary" onClick={handleSave}>
                    Save Changes
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// Add global styles for hiding balances
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .hide-balances [data-balance],
    .hide-balances .balance-amount {
      position: relative;
    }
    .hide-balances [data-balance]::after,
    .hide-balances .balance-amount::after {
      content: '****';
      position: absolute;
      left: 0;
      right: 0;
      background: inherit;
      color: inherit;
    }
  `;
  document.head.appendChild(style);
}