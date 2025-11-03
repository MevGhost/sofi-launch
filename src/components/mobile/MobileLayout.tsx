'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  FiHome,
  FiGrid,
  FiZap,
  FiBriefcase,
  FiMenu,
  FiX,
  FiSearch,
  FiShield,
  FiFileText,
  FiLock,
  FiBook,
  FiCheckCircle,
  FiSettings
} from 'react-icons/fi';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { icon: <FiHome size={20} />, label: 'Home', href: '/' },
  { icon: <FiGrid size={20} />, label: 'Browse', href: '/browse' },
  { icon: <FiZap size={20} />, label: 'Launch', href: '/token/new' },
  { icon: <FiBriefcase size={20} />, label: 'Portfolio', href: '/portfolio' },
];

interface MobileLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showNav?: boolean;
  title?: string;
  headerActions?: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  showHeader = true,
  showNav = true,
  title,
  headerActions
}) => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      {showHeader && (
        <header className="fixed top-0 left-0 right-0 z-30 bg-surface1 border-b border-border">
          <div className="flex items-center justify-between h-14 px-4">
            {/* Title or Logo */}
            <div className="flex items-center gap-3">
              {title ? (
                <h1 className="text-sm font-semibold text-text-primary">{title}</h1>
              ) : (
                <span className="text-primary font-bold text-lg">S4</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {headerActions}
              <button
                onClick={() => setMenuOpen(true)}
                className="p-2 text-text-muted hover:text-text-primary transition-colors"
              >
                <FiMenu size={20} />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={cn(
        'min-h-screen',
        showHeader && 'pt-14',
        showNav && 'pb-16'
      )}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-surface1 border-t border-border">
          <div className="flex items-center justify-around h-16 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                             (item.href !== '/' && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                    isActive
                      ? 'text-primary'
                      : 'text-text-muted hover:text-text-secondary'
                  )}
                >
                  {item.icon}
                  <span className="text-[10px] font-medium">{item.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 w-12 h-0.5 bg-primary" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Full Screen Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-canvas">
          <div className="flex flex-col h-full">
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="text-primary font-bold text-lg">S4 Labs</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 text-text-muted hover:text-text-primary transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Menu Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {/* Main Navigation */}
                <div className="space-y-1">
                  <p className="text-micro uppercase tracking-wide text-text-muted font-medium mb-2">
                    Navigation
                  </p>
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg transition-colors',
                        pathname === item.href
                          ? 'bg-primary/10 text-primary'
                          : 'text-text-secondary hover:bg-surface2'
                      )}
                    >
                      {item.icon}
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  ))}
                </div>

                {/* Additional Links */}
                <div className="pt-4 space-y-1">
                  <p className="text-micro uppercase tracking-wide text-text-muted font-medium mb-2">
                    More
                  </p>
                  <Link
                    href="/escrow/new"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg text-text-secondary hover:bg-surface2 transition-colors"
                  >
                    <FiShield size={20} />
                    <span className="text-sm font-medium">Create Escrow</span>
                  </Link>
                  <Link
                    href="/verifier"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg text-text-secondary hover:bg-surface2 transition-colors"
                  >
                    <FiCheckCircle size={20} />
                    <span className="text-sm font-medium">Verifier Dashboard</span>
                  </Link>
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg text-text-secondary hover:bg-surface2 transition-colors"
                  >
                    <FiSettings size={20} />
                    <span className="text-sm font-medium">Admin Panel</span>
                  </Link>
                </div>

                {/* Resources */}
                <div className="pt-4 space-y-1">
                  <p className="text-micro uppercase tracking-wide text-text-muted font-medium mb-2">
                    Resources
                  </p>
                  <Link
                    href="/docs"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg text-text-secondary hover:bg-surface2 transition-colors"
                  >
                    <FiBook size={20} />
                    <span className="text-sm font-medium">Documentation</span>
                  </Link>
                  <Link
                    href="/privacy"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg text-text-secondary hover:bg-surface2 transition-colors"
                  >
                    <FiLock size={20} />
                    <span className="text-sm font-medium">Privacy Policy</span>
                  </Link>
                  <Link
                    href="/terms"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg text-text-secondary hover:bg-surface2 transition-colors"
                  >
                    <FiFileText size={20} />
                    <span className="text-sm font-medium">Terms of Service</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Menu Footer with Wallet */}
            <div className="p-4 border-t border-border">
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Mobile Card Component
interface MobileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg';
}

export const MobileCard: React.FC<MobileCardProps> = ({ 
  className, 
  padding = 'md', 
  children,
  ...props 
}) => {
  const paddings = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  return (
    <div
      className={cn(
        'bg-surface2 border border-border rounded-lg',
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// Mobile Metric Card
interface MobileMetricCardProps {
  label: string;
  value: string | number;
  change?: {
    value: string | number;
    positive: boolean;
  };
  icon?: React.ReactNode;
}

export const MobileMetricCard: React.FC<MobileMetricCardProps> = ({ 
  label, 
  value, 
  change, 
  icon 
}) => {
  return (
    <MobileCard padding="sm">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-wide text-text-muted font-medium">
            {label}
          </p>
          <p className="text-base font-semibold text-text-primary mt-0.5">
            {value}
          </p>
          {change && (
            <p className={cn(
              'text-[10px] mt-0.5 font-medium',
              change.positive ? 'text-success' : 'text-danger'
            )}>
              {change.positive ? '+' : ''}{change.value}
            </p>
          )}
        </div>
        {icon && (
          <div className="text-text-muted opacity-50">
            {icon}
          </div>
        )}
      </div>
    </MobileCard>
  );
};