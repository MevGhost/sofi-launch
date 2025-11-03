/**
 * AlienBase-Inspired Design System
 * Ultra-minimal, snappy, professional trading interface
 */

// 1. DESIGN TOKENS
export const designTokens = {
  // Colors - Dark, professional, minimal accents
  colors: {
    // Backgrounds (pure black)
    bg: {
      canvas: '#000000',      // Pure black canvas
      surface1: '#0A0A0A',    // Slightly lighter surface
      surface2: '#141414',    // Card/panel background
      surface3: '#1F1F1F',    // Elevated elements
    },
    // Borders (light gray)
    border: {
      default: 'rgba(255, 255, 255, 0.08)',     // 8% white
      hover: 'rgba(255, 255, 255, 0.12)',       // 12% white
      active: 'rgba(255, 255, 255, 0.2)',       // 20% white
    },
    // Text hierarchy
    text: {
      primary: '#FFFFFF',                     // Pure white
      secondary: 'rgba(255, 255, 255, 0.7)',  // 70% white
      muted: 'rgba(255, 255, 255, 0.4)',      // 40% white
      disabled: 'rgba(255, 255, 255, 0.2)',   // 20% white
    },
    // Accent colors (minimal use)
    primary: '#0EA5E9',     // S4 Labs blue (primary CTA only)
    success: '#00D395',     // Green for positive
    danger: '#FF3B69',      // Red for negative
    warning: '#FFB547',     // Amber for warnings
    info: '#06B6D4',        // Light blue for info
  },

  // Typography
  typography: {
    fonts: {
      heading: 'Inter, -apple-system, sans-serif',
      body: 'Inter, -apple-system, sans-serif',
      mono: 'ui-monospace, "SF Mono", monospace',
    },
    weights: {
      regular: 400,
      medium: 500,
      semibold: 600,
    },
    sizes: {
      micro: '11px',    // CAPS labels
      xs: '12px',       // Table text
      sm: '14px',       // Body small
      base: '16px',     // Body default
      md: '20px',       // Section headers
      lg: '24px',       // Page titles
    },
    lineHeight: {
      tight: '1.2',
      normal: '1.5',
      relaxed: '1.75',
    },
    tracking: {
      tight: '-0.01em',
      normal: '0',
      wide: '0.04em',    // For uppercase labels
    },
  },

  // Spacing (4px grid)
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
  },

  // Border Radius
  radius: {
    none: '0',
    sm: '6px',       // Small elements
    md: '10px',      // Buttons
    lg: '12px',      // Cards, inputs
    full: '999px',   // Pills
  },

  // Shadows (very subtle)
  shadows: {
    none: 'none',
    sm: '0 2px 8px rgba(0, 0, 0, 0.1)',
    md: '0 4px 12px rgba(0, 0, 0, 0.15)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.2)',
  },

  // Transitions
  transitions: {
    fast: '120ms ease-out',
    default: '150ms ease-out',
    slow: '200ms ease-out',
  },
};

// 2. COMPONENT SPECS
export const components = {
  // Card
  card: {
    base: 'bg-surface2 border border-border-default rounded-lg',
    padding: {
      sm: 'p-3',    // 12px
      md: 'p-4',    // 16px
      lg: 'p-6',    // 24px
    },
    header: 'text-micro uppercase tracking-wide text-muted font-medium mb-2',
    value: 'text-lg font-semibold text-primary',
    meta: 'text-xs text-muted mt-1',
  },

  // Button
  button: {
    base: 'font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed rounded-[10px]',
    sizes: {
      sm: 'h-8 px-3 text-xs',      // 32px height
      md: 'h-10 px-4 text-sm',     // 40px height
    },
    variants: {
      primary: 'bg-primary text-white hover:bg-primary/90 active:scale-[0.98]',
      secondary: 'bg-surface3 text-secondary border border-border-default hover:border-border-hover',
      ghost: 'text-secondary hover:text-primary hover:bg-white/[0.03]',
    },
  },

  // Input / Select
  input: {
    base: 'w-full bg-surface2 border border-border-default rounded-lg text-primary placeholder-muted focus:border-primary focus:outline-none transition-colors duration-150',
    sizes: {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
    },
    label: 'text-micro uppercase tracking-wide text-muted font-medium mb-1',
    helper: 'text-xs text-muted mt-1',
    error: 'text-xs text-danger mt-1',
  },

  // Segmented Tabs
  tabs: {
    container: 'inline-flex bg-surface1 rounded-full p-1',
    tab: 'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150',
    active: 'bg-primary text-white',
    inactive: 'text-muted hover:text-secondary',
  },

  // Switch
  switch: {
    track: 'w-11 h-6 bg-surface3 rounded-full relative transition-colors duration-150',
    thumb: 'absolute w-4 h-4 bg-white rounded-full top-1 transition-transform duration-150',
    on: 'bg-primary',
    off: 'bg-surface3',
  },

  // Chip / Badge
  chip: {
    base: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
    variants: {
      default: 'bg-surface3 text-secondary',
      primary: 'bg-primary/10 text-primary',
      success: 'bg-success/10 text-success',
      danger: 'bg-danger/10 text-danger',
      warning: 'bg-warning/10 text-warning',
    },
  },

  // Table
  table: {
    container: 'w-full',
    header: 'text-micro uppercase tracking-wide text-muted font-medium text-left',
    row: 'border-t border-border-default hover:bg-white/[0.02] transition-colors duration-150',
    cell: 'py-3 text-sm text-secondary',
    numeric: 'font-mono tabular-nums text-right',
    positive: 'text-success',
    negative: 'text-danger',
  },

  // Chart Container
  chart: {
    container: 'bg-surface1 border border-border-default rounded-lg p-4',
    toolbar: 'flex items-center gap-2 mb-3',
    timeframe: 'inline-flex bg-surface2 rounded-full p-1',
    grid: 'stroke-border-default',
  },

  // Tooltip
  tooltip: {
    base: 'bg-surface3 text-xs text-secondary px-2 py-1 rounded-md shadow-lg',
    arrow: 'text-surface3',
  },

  // Navigation
  nav: {
    rail: 'w-16 bg-surface1 border-r border-border-default flex flex-col items-center py-4',
    item: 'w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-150',
    active: 'bg-primary/10 text-primary',
    inactive: 'text-muted hover:text-secondary hover:bg-white/[0.03]',
  },

  // Top Bar
  topBar: {
    base: 'h-16 bg-surface1 border-b border-border-default flex items-center px-6',
    search: 'max-w-md bg-surface2 border border-border-default rounded-lg px-4 py-2',
    actions: 'flex items-center gap-3',
  },

  // Right Panel
  panel: {
    base: 'w-80 bg-surface1 border-l border-border-default p-4',
    section: 'mb-6',
    cta: 'w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary/90',
  },
};

// 3. DESIGN FLOW CHECKLIST
export const designFlow = `
1. Shell Setup:
   - Left icon rail for primary navigation
   - Top bar with search, settings, wallet
   - Main content area with optional right panel

2. Section Structure:
   - Header: Title (uppercase micro) + filter chips/tabs
   - KPI cards row (optional)
   - Primary content: table/form/chart
   - Context panel: CTA + key stats

3. Component Assembly:
   - Use surface hierarchy (canvas → surface1 → surface2 → surface3)
   - One primary CTA per view (blue)
   - Semantic colors for data (green/red)
   - Uppercase micro labels for sections
   - Tabular numbers for all metrics

4. Interaction Patterns:
   - 120-150ms transitions
   - Subtle hover states (border/bg changes)
   - Minimal elevation (borders over shadows)
   - Focus rings for accessibility

5. Data Presentation:
   - Dense tables with hover highlights
   - Inline sparklines/micro-charts
   - Clear positive/negative indicators
   - Right-aligned numbers

6. Visual Hierarchy:
   - High contrast for primary actions
   - Muted colors for secondary info
   - Consistent spacing rhythm (4px grid)
   - Clear reading path with single CTA
`;

// 4. TAILWIND/CSS VARIABLES
export const cssVariables = `
:root {
  /* Backgrounds */
  --bg-canvas: #000000;
  --bg-surface1: #0A0A0A;
  --bg-surface2: #111111;
  --bg-surface3: #1A1A1A;
  
  /* Borders */
  --border-default: rgba(0, 82, 255, 0.08);
  --border-hover: rgba(0, 82, 255, 0.15);
  --border-active: rgba(0, 82, 255, 0.3);
  
  /* Text */
  --text-primary: #FFFFFF;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --text-muted: rgba(255, 255, 255, 0.4);
  --text-disabled: rgba(255, 255, 255, 0.2);
  
  /* Accents */
  --color-primary: #0052FF;
  --color-success: #00D395;
  --color-danger: #FF3B69;
  --color-warning: #FFB547;
  --color-info: #0EA5E9;
  
  /* Typography */
  --font-heading: 'Inter', -apple-system, sans-serif;
  --font-body: 'Inter', -apple-system, sans-serif;
  --font-mono: ui-monospace, 'SF Mono', monospace;
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  
  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-full: 999px;
  
  /* Transitions */
  --transition-fast: 120ms ease-out;
  --transition-default: 150ms ease-out;
  --transition-slow: 200ms ease-out;
}
`;

// Export Tailwind config extension
export const tailwindExtend = {
  colors: {
    canvas: '#000000',
    surface1: '#0A0A0A',
    surface2: '#111111',
    surface3: '#1A1A1A',
    border: {
      DEFAULT: 'rgba(0, 82, 255, 0.08)',
      hover: 'rgba(0, 82, 255, 0.15)',
      active: 'rgba(0, 82, 255, 0.3)',
    },
    primary: '#0052FF',
    success: '#00D395',
    danger: '#FF3B69',
    warning: '#FFB547',
    info: '#0EA5E9',
    muted: 'rgba(255, 255, 255, 0.4)',
    secondary: 'rgba(255, 255, 255, 0.7)',
  },
  fontFamily: {
    sans: ['Inter', '-apple-system', 'sans-serif'],
    mono: ['ui-monospace', 'SF Mono', 'monospace'],
  },
  fontSize: {
    micro: ['11px', '1.2'],
    xs: ['12px', '1.5'],
    sm: ['14px', '1.5'],
    base: ['16px', '1.5'],
    md: ['20px', '1.3'],
    lg: ['24px', '1.3'],
  },
  borderRadius: {
    sm: '6px',
    md: '10px',
    lg: '12px',
    full: '999px',
  },
};