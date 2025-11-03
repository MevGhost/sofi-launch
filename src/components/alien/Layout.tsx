import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import dynamic from 'next/dynamic';
import {
  FiGrid,
  FiTrendingUp,
  FiDollarSign,
  FiShield,
  FiFileText,
  FiSettings,
  FiSearch,
  FiMenu,
  FiX,
  FiHome,
  FiZap,
  FiCornerDownRight
} from 'react-icons/fi';
import { SettingsModal } from './SettingsModal';
import { CommandPalette } from '@/components/CommandPalette';
import { apiRequest, API_ENDPOINTS } from '@/lib/api/config';

// Dynamically import OuterSpaceBackground
const OuterSpaceBackground = dynamic(
  () => import('@/visual-effects/backgrounds/OuterSpaceBackground').then(mod => ({ default: mod.OuterSpaceBackground })),
  { ssr: false }
);

// Icon Rail Navigation (Left sidebar)
interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  subPaths?: { pattern: RegExp; label: string }[];
}

const navItems: NavItem[] = [
  { icon: <FiHome size={20} />, label: 'Home', href: '/' },
  { icon: <FiGrid size={20} />, label: 'Browse', href: '/browse' },
  { 
    icon: <FiDollarSign size={20} />, 
    label: 'Portfolio', 
    href: '/portfolio',
    subPaths: [
      { pattern: /^\/portfolio\/.+$/, label: 'Portfolio Details' }
    ]
  },
  { 
    icon: <FiZap size={20} />, 
    label: 'Launch', 
    href: '/token/new',
    subPaths: [
      { pattern: /^\/token\/0x[a-fA-F0-9]+$/, label: 'Token Details' },
      { pattern: /^\/token\/[^\/]+$/, label: 'Token Page' }
    ]
  },
  { 
    icon: <FiShield size={20} />, 
    label: 'Escrow', 
    href: '/escrow/new',
    subPaths: [
      { pattern: /^\/escrow\/dashboard$/, label: 'Dashboard' },
      { pattern: /^\/escrow\/[^\/]+$/, label: 'Escrow Details' }
    ]
  },
];

export const IconRail: React.FC = () => {
  const pathname = usePathname();

  // Determine active item and sub-navigation
  const getActiveNav = () => {
    // Check for exact matches first
    for (const item of navItems) {
      if (pathname === item.href) {
        return { main: item, sub: null };
      }
    }
    
    // Check for sub-paths
    for (const item of navItems) {
      if (item.subPaths) {
        for (const subPath of item.subPaths) {
          if (subPath.pattern.test(pathname)) {
            return { main: item, sub: subPath.label };
          }
        }
      }
      // Also check if path starts with the href (for other related pages)
      if (item.href !== '/' && pathname.startsWith(item.href.split('/').slice(0, -1).join('/'))) {
        return { main: item, sub: null };
      }
    }
    
    return { main: null, sub: null };
  };

  const activeNav = getActiveNav();

  return (
    <nav className="w-16 bg-surface1/80 backdrop-blur-lg border-r border-border flex flex-col items-center py-4 fixed left-0 top-0 h-full z-40">
      {/* Logo */}
      <div className="w-12 h-12 flex items-center justify-center mb-8">
        <span className="text-primary font-bold text-lg">S4</span>
      </div>

      {/* Nav Items */}
      <div className="flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = activeNav.main === item;
          const hasSubActive = isActive && activeNav.sub;
          
          return (
            <div key={item.href} className="relative">
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
              
              {/* Sub-navigation indicator */}
              {hasSubActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center">
                  <FiCornerDownRight size={12} className="text-primary/60" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
};

// Top Bar (Global header)
interface TopBarProps {
  onSettingsClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onSettingsClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 0) {
      try {
        // Use real API for search with apiRequest utility
        const params = new URLSearchParams({
          search: query,
          limit: '5'
        });
        const response = await apiRequest<{ 
          success: boolean; 
          data: { 
            tokens: Array<{
              address: string;
              name: string;
              symbol: string;
            }>;
          } 
        }>(`${API_ENDPOINTS.tokens.list}?${params}`);
        
        if (response?.success && response.data?.tokens) {
          const searchTokens = response.data.tokens.map((token) => ({
            address: token.address,
            name: token.name,
            symbol: token.symbol
          }));
          setSearchResults(searchTokens);
          setShowResults(true);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        setShowResults(false);
      }
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  return (
    <header className="h-16 bg-surface1/80 backdrop-blur-lg border-b border-border flex items-center px-6 fixed top-0 left-16 right-0 z-30">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchQuery && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            className="w-full h-10 pl-10 pr-4 bg-surface2 border border-border rounded-lg text-text-primary placeholder-text-muted focus:border-primary focus:outline-none transition-colors duration-fast text-sm"
          />
          
          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-surface2 border border-border rounded-lg shadow-lg overflow-hidden z-50">
              {searchResults.map((token) => (
                <Link
                  key={token.address}
                  href={`/token/${token.address}`}
                  className="block px-4 py-3 hover:bg-surface3 transition-colors duration-fast border-b border-border last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-text-primary font-medium">{token.name}</div>
                      <div className="text-text-muted text-xs">{token.symbol}</div>
                    </div>
                    <div className="text-text-muted text-xs">{token.address}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Settings */}
        <button 
          onClick={onSettingsClick}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-text-muted hover:text-text-secondary hover:bg-white/[0.03] transition-all duration-fast"
        >
          <FiSettings size={18} />
        </button>


        {/* Wallet Connect */}
        <ConnectButton />
      </div>
    </header>
  );
};

// Main Layout Shell
interface LayoutShellProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  collapsibleRightPanel?: boolean;
  onCollapseToggle?: (collapsed: boolean) => void;
  isCollapsed?: boolean;
}

export const LayoutShell: React.FC<LayoutShellProps> = ({ 
  children, 
  rightPanel, 
  collapsibleRightPanel = false,
  onCollapseToggle,
  isCollapsed = false 
}) => {
  const pathname = usePathname();
  const [showSettings, setShowSettings] = useState(false);
  const [internalCollapsed, setInternalCollapsed] = useState(isCollapsed);
  
  // Check if we should show the background (not on token/new or escrow/new)
  const shouldShowBackground = pathname !== '/token/new' && pathname !== '/escrow/new';

  // Persist and auto-collapse behavior based on viewport width
  useEffect(() => {
    // Load persisted state
    const persisted = localStorage.getItem('rightPanelCollapsed');
    if (persisted !== null) {
      setInternalCollapsed(persisted === 'true');
      onCollapseToggle?.(persisted === 'true');
    }

    const handleResize = () => {
      const width = window.innerWidth;
      const autoCollapse = width < 1440; // threshold for collapsing
      if (autoCollapse !== internalCollapsed && localStorage.getItem('rightPanelCollapsed') === null) {
        setInternalCollapsed(autoCollapse);
        onCollapseToggle?.(autoCollapse);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // When consumer toggles, persist
  useEffect(() => {
    localStorage.setItem('rightPanelCollapsed', String(internalCollapsed));
  }, [internalCollapsed]);
  
  return (
    <div className="min-h-screen bg-canvas relative">
      {/* Outer Space Background - only show on certain pages */}
      {shouldShowBackground && (
        typeof document === 'undefined' || !document.body.classList.contains('performance-mode') ? (
          <OuterSpaceBackground />
        ) : null
      )}
      <IconRail />
      <TopBar 
        onSettingsClick={() => setShowSettings(true)}
      />
      
      <div className="flex relative z-10">
        {/* Main Content */}
        <main className={cn(
          'flex-1 ml-16 mt-16 min-h-[calc(100vh-4rem)] transition-[margin] duration-300',
          rightPanel && !(isCollapsed ?? internalCollapsed) && !internalCollapsed ? 'mr-80' : rightPanel ? (isCollapsed ?? internalCollapsed) || internalCollapsed ? 'mr-12' : '' : ''
        )}>
          {children}
        </main>

        {/* Right Panel (optional) */}
        {rightPanel && (
          <aside className={cn(
            'bg-surface1 border-l border-border fixed right-0 top-16 h-[calc(100vh-4rem)] overflow-y-auto transition-[width] duration-300',
            (isCollapsed ?? internalCollapsed) || internalCollapsed ? 'w-12' : 'w-80 p-4'
          )}>
            {(isCollapsed ?? internalCollapsed) || internalCollapsed ? (
              <div className="pt-4">
                <button
                  onClick={() => {
                    setInternalCollapsed(false);
                    onCollapseToggle?.(false);
                  }}
                  className="group p-2 hover:bg-surface2 rounded-lg transition-colors mx-auto block"
                  aria-label="Expand sidebar"
                >
                  <svg 
                    className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-transform"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="animate-fadeIn">
                {/* Global collapse control (in addition to page-provided controls) */}
                <div className="pb-3 mb-4 border-b border-border -mt-2 -mx-2 px-2">
                  <button
                    onClick={() => {
                      setInternalCollapsed(true);
                      onCollapseToggle?.(true);
                    }}
                    className="group flex items-center gap-2 px-3 py-2 text-text-muted hover:text-text-primary hover:bg-surface2 rounded-lg transition-all"
                    aria-label="Collapse sidebar"
                  >
                    <svg 
                      className="w-4 h-4"
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={1.5} 
                        d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                      />
                    </svg>
                    <span className="text-xs uppercase tracking-wide font-medium">Collapse Sidebar</span>
                  </button>
                </div>
                {rightPanel}
              </div>
            )}
          </aside>
        )}
      </div>
      
      {/* Modals - Rendered at root level to blur everything */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      {/* Command palette (Cmd/Ctrl+K) */}
      <CommandPalette />
    </div>
  );
};

// Section Header Component
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, actions }) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-micro uppercase tracking-wide text-text-muted font-medium">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-text-secondary mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};

// Tab Component - Enhanced with better styling
interface Tab {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, value, onChange, className }) => {
  return (
    <div className={cn("flex gap-6 border-b border-border", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'pb-3 px-1 font-medium text-sm transition-all relative group',
            value === tab.value
              ? 'text-primary'
              : 'text-text-muted hover:text-text-secondary'
          )}
        >
          <span className="flex items-center gap-2">
            {tab.icon && <span className="opacity-80">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                value === tab.value 
                  ? "bg-primary/20 text-primary" 
                  : "bg-surface3 text-text-muted"
              )}>
                {tab.badge}
              </span>
            )}
          </span>
          {value === tab.value && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      ))}
    </div>
  );
};

// Chip Component
interface ChipProps {
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning';
  children: React.ReactNode;
  onClick?: () => void;
}

export const Chip: React.FC<ChipProps> = ({ variant = 'default', children, onClick }) => {
  const variants = {
    default: 'bg-surface3 text-text-secondary',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    danger: 'bg-danger/10 text-danger',
    warning: 'bg-warning/10 text-warning',
  };

  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity duration-fast'
      )}
    >
      {children}
    </span>
  );
};