/**
 * S4 Labs Design System
 * Minimalist, professional, production-ready
 */

export const designTokens = {
  // Colors - Using existing S4 Labs palette
  colors: {
    // Backgrounds
    bg: {
      0: '#000000',        // Pure black canvas
      1: '#0A0A0A',        // Surface-1 (slightly lighter)
      2: '#111111',        // Surface-2 (cards)
    },
    // Borders
    border: {
      DEFAULT: 'rgba(255, 255, 255, 0.08)',  // 8% white
      hover: 'rgba(255, 255, 255, 0.12)',    // 12% white
      focus: 'rgba(0, 82, 255, 0.5)',        // 50% primary
    },
    // Text
    text: {
      primary: '#FFFFFF',           // Pure white
      secondary: 'rgba(255, 255, 255, 0.8)',  // 80% white
      muted: 'rgba(255, 255, 255, 0.5)',      // 50% white
      disabled: 'rgba(255, 255, 255, 0.3)',   // 30% white
    },
    // Brand
    primary: {
      DEFAULT: '#0052FF',  // Electric blue
      hover: '#0047E0',    // Darker on hover
      muted: 'rgba(0, 82, 255, 0.1)',  // 10% for backgrounds
    },
    accent: '#0EA5E9',     // Cyan accent
    // Semantic
    success: '#10B981',    // Emerald green
    danger: '#EF4444',     // Red
    warning: '#F59E0B',    // Amber
    info: '#3B82F6',       // Blue
  },

  // Typography
  typography: {
    fonts: {
      heading: 'var(--font-orbitron)',  // Orbitron for headings
      body: 'var(--font-michroma)',     // Michroma for body
      mono: 'ui-monospace, monospace',  // Monospace for numbers
    },
    sizes: {
      xs: '11px',    // Micro labels
      sm: '12px',    // Small text
      base: '14px',  // Base text
      md: '16px',    // Medium text
      lg: '20px',    // Large text
      xl: '24px',    // XL headings
      '2xl': '32px', // 2XL headings
      '3xl': '40px', // 3XL headings
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    tracking: {
      tight: '-0.02em',
      normal: '0',
      wide: '0.02em',
      wider: '0.08em',  // For uppercase labels
    },
  },

  // Spacing Scale
  spacing: {
    0: '0',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },

  // Border Radius
  radius: {
    none: '0',
    sm: '8px',      // Small elements
    md: '12px',     // Cards, inputs
    lg: '16px',     // Large cards
    xl: '20px',     // Extra large
    full: '999px',  // Pills, circles
  },

  // Shadows (minimal)
  shadows: {
    none: 'none',
    sm: '0 2px 8px rgba(0, 0, 0, 0.1)',
    md: '0 4px 16px rgba(0, 0, 0, 0.15)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.2)',
    glow: '0 0 20px rgba(0, 82, 255, 0.15)',  // Blue glow
  },

  // Transitions
  transitions: {
    fast: '120ms ease-out',
    default: '200ms ease-out',
    slow: '300ms ease-out',
  },

  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Z-index scale
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modalBackdrop: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
    notification: 80,
  },
};

// Component variants using design tokens
export const components = {
  // Buttons
  button: {
    base: 'font-orbitron font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed',
    sizes: {
      sm: 'h-8 px-3 text-xs rounded-lg',
      md: 'h-10 px-4 text-sm rounded-xl',
      lg: 'h-12 px-6 text-base rounded-xl',
    },
    variants: {
      primary: 'bg-[#0052FF] text-white hover:bg-[#0047E0] active:scale-[0.98]',
      secondary: 'bg-transparent border border-white/[0.08] text-white hover:bg-white/[0.05]',
      ghost: 'bg-transparent text-white/80 hover:text-white hover:bg-white/[0.05]',
      danger: 'bg-red-500 text-white hover:bg-red-600',
    },
  },

  // Cards
  card: {
    base: 'bg-[#111111] border border-white/[0.08] rounded-xl',
    padding: {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    },
  },

  // Inputs
  input: {
    base: 'w-full bg-[#0A0A0A] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:border-[#0052FF] focus:outline-none transition-all duration-200',
    sizes: {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-4 text-base',
    },
  },

  // Labels
  label: {
    base: 'text-[11px] uppercase tracking-wider text-white/50 font-orbitron',
  },

  // Badges
  badge: {
    base: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
    variants: {
      default: 'bg-white/[0.08] text-white/80',
      primary: 'bg-[#0052FF]/10 text-[#0052FF]',
      success: 'bg-emerald-500/10 text-emerald-500',
      danger: 'bg-red-500/10 text-red-500',
      warning: 'bg-amber-500/10 text-amber-500',
    },
  },
};

// Utility classes
export const utils = {
  // Text utilities
  'text-label': 'text-[11px] uppercase tracking-wider text-white/50 font-orbitron',
  'text-muted': 'text-white/50',
  'text-secondary': 'text-white/80',
  
  // Layout utilities
  'container-max': 'max-w-7xl mx-auto',
  'section-padding': 'px-4 sm:px-6 lg:px-8',
  
  // Glass effect
  'glass': 'bg-white/[0.02] backdrop-blur-xl',
  'glass-border': 'border border-white/[0.08]',
  
  // Hover effects
  'hover-glow': 'hover:shadow-[0_0_20px_rgba(0,82,255,0.15)]',
  'hover-lift': 'hover:-translate-y-0.5',
};

// Export Tailwind config extension
export const tailwindExtend = {
  colors: {
    bg: designTokens.colors.bg,
    border: designTokens.colors.border.DEFAULT,
    primary: designTokens.colors.primary,
    accent: designTokens.colors.accent,
  },
  fontFamily: {
    orbitron: ['var(--font-orbitron)', 'sans-serif'],
    michroma: ['var(--font-michroma)', 'sans-serif'],
  },
  fontSize: designTokens.typography.sizes,
  spacing: designTokens.spacing,
  borderRadius: designTokens.radius,
  boxShadow: designTokens.shadows,
  zIndex: designTokens.zIndex,
};