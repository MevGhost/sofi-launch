'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthButton } from '@/components/AuthButton';
import { WebSocketStatus } from '@/components/WebSocketStatus';
import { useAuth } from '@/hooks/useAuth';
import dynamic from 'next/dynamic';
import {
  FiGrid,
  FiDollarSign,
  FiShield,
  FiSettings,
  FiSearch,
  FiBell,
  FiHome,
  FiZap,
  FiLock,
} from 'react-icons/fi';
import { SettingsModal } from './alien/SettingsModal';
import { NotificationModal } from './alien/NotificationModal';

// Dynamically import OuterSpaceBackground
const OuterSpaceBackground = dynamic(
  () => import('@/visual-effects/backgrounds/OuterSpaceBackground').then(mod => ({ default: mod.OuterSpaceBackground })),
  { ssr: false }
);

interface AppLayoutProps {
  children: React.ReactNode;
  isConnected: boolean;
}

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  requiresWallet?: boolean;
}

const navItems: NavItem[] = [
  { icon: <FiHome size={20} />, label: 'Home', href: '/', requiresWallet: false },
  { icon: <FiGrid size={20} />, label: 'Browse', href: '/browse', requiresWallet: true },
  { icon: <FiDollarSign size={20} />, label: 'Portfolio', href: '/portfolio', requiresWallet: true },
  { icon: <FiZap size={20} />, label: 'Launch', href: '/token/new', requiresWallet: true },
  { icon: <FiShield size={20} />, label: 'Escrow', href: '/escrow/new', requiresWallet: true },
];

export const AppLayout: React.FC<AppLayoutProps> = ({ children, isConnected }) => {
  const pathname = usePathname();
  const { isAuthenticated, isAdmin } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Check if we should show the background (not on token/new or escrow/new)
  const shouldShowBackground = pathname !== '/token/new' && pathname !== '/escrow/new';

  // Determine which nav item is active
  const getActiveNav = () => {
    for (const item of navItems) {
      if (pathname === item.href) {
        return item;
      }
      if (item.href !== '/' && pathname.startsWith(item.href.split('/').slice(0, -1).join('/'))) {
        return item;
      }
    }
    return null;
  };

  const activeNav = getActiveNav();

  return (
    <div className="min-h-screen bg-canvas relative">
      {/* Outer Space Background - only show on certain pages */}
      {shouldShowBackground && <OuterSpaceBackground />}
      {/* Icon Rail - Left Sidebar */}
      <nav className="w-16 bg-surface1/80 backdrop-blur-lg border-r border-border flex flex-col items-center py-4 fixed left-0 top-0 h-full z-40">
        {/* Logo */}
        <div className="w-12 h-12 flex items-center justify-center mb-8">
          <span className="text-primary font-bold text-lg">S4</span>
        </div>

        {/* Nav Items */}
        <div className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = activeNav === item;
            const isDisabled = item.requiresWallet && !isConnected;
            
            return (
              <div key={item.href} className="relative">
                {isDisabled ? (
                  <div
                    className={cn(
                      'w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-fast cursor-not-allowed',
                      'text-text-disabled bg-white/[0.02] opacity-30'
                    )}
                    title={`Connect wallet to access ${item.label}`}
                  >
                    {item.icon}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      'w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-fast group relative',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]'
                    )}
                    title={item.label}
                  >
                    {item.icon}
                    
                    {/* Tooltip */}
                    <span className="absolute left-full ml-2 px-2 py-1 bg-surface3 text-xs text-text-secondary rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-fast whitespace-nowrap z-50">
                      {item.label}
                    </span>
                  </Link>
                )}
              </div>
            );
          })}
          
          {/* Admin Link - Only show if authenticated as admin */}
          {isAdmin && (
            <div className="mt-auto mb-4">
              <Link
                href="/admin"
                className={cn(
                  'w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-fast group relative',
                  pathname === '/admin'
                    ? 'bg-danger/10 text-danger'
                    : 'text-text-muted hover:text-danger hover:bg-danger/5'
                )}
                title="Admin Panel"
              >
                <FiLock size={20} />
                <span className="absolute left-full ml-2 px-2 py-1 bg-surface3 text-xs text-text-secondary rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-fast whitespace-nowrap z-50">
                  Admin
                </span>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Top Bar */}
      <header className="h-16 bg-surface1/80 backdrop-blur-lg border-b border-border flex items-center px-6 fixed top-0 left-16 right-0 z-30">
        {/* Search - disabled when not connected */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input
              type="text"
              placeholder={isConnected ? "Search tokens..." : "Connect wallet to search"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={!isConnected}
              className={cn(
                "w-full h-10 pl-10 pr-4 bg-surface2 border border-border rounded-lg placeholder-text-muted focus:outline-none transition-colors duration-fast text-sm",
                isConnected 
                  ? "text-text-primary focus:border-primary" 
                  : "text-text-disabled cursor-not-allowed opacity-50"
              )}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 ml-auto">
          {/* WebSocket Status */}
          <WebSocketStatus />
          
          {/* Settings - disabled when not connected */}
          <button 
            onClick={() => isConnected && setShowSettings(true)}
            disabled={!isConnected}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-fast",
              isConnected
                ? "text-text-muted hover:text-text-secondary hover:bg-white/[0.03]"
                : "text-text-disabled cursor-not-allowed opacity-30"
            )}
          >
            <FiSettings size={18} />
          </button>

          {/* Notifications - disabled when not connected */}
          <button 
            onClick={() => isConnected && setShowNotifications(true)}
            disabled={!isConnected}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-fast relative",
              isConnected
                ? "text-text-muted hover:text-text-secondary hover:bg-white/[0.03]"
                : "text-text-disabled cursor-not-allowed opacity-30"
            )}
          >
            <FiBell size={18} />
            {isConnected && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full" />
            )}
          </button>

          {/* Auth Button - Wallet Connect + Authentication */}
          <AuthButton />
        </div>
        
        {showSettings && <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />}
        {showNotifications && <NotificationModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} />}
      </header>

      {/* Main Content */}
      <main className="ml-16 mt-16 min-h-[calc(100vh-4rem)] relative z-10">
        {children}
      </main>
    </div>
  );
};