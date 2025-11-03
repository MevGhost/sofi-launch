import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // S4 Labs black theme
        canvas: '#000000',
        surface1: '#0A0A0A',
        surface2: '#141414',
        surface3: '#1F1F1F',
        
        // Borders (light gray)
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.12)',
          active: 'rgba(255, 255, 255, 0.2)',
        },
        
        // Brand colors
        primary: '#0EA5E9',
        success: '#00D395',
        danger: '#FF3B69',
        warning: '#FFB547',
        info: '#06B6D4',
        
        // Text colors
        'text-primary': '#FFFFFF',
        'text-secondary': 'rgba(255, 255, 255, 0.7)',
        'text-muted': 'rgba(255, 255, 255, 0.4)',
        'text-disabled': 'rgba(255, 255, 255, 0.2)',
      },
      fontFamily: {
        // Revert to Orbitron for body and Michroma for display
        sans: ['var(--font-orbitron)', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['var(--font-michroma)', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        orbitron: ['var(--font-orbitron)', 'sans-serif'],
        michroma: ['var(--font-michroma)', 'sans-serif'],
        mono: ['ui-monospace', 'SF Mono', 'Monaco', 'monospace'],
      },
      fontSize: {
        micro: ['11px', { letterSpacing: '0.04em', lineHeight: '1.2' }],
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.5' }],
        md: ['20px', { lineHeight: '1.3' }],
        lg: ['24px', { lineHeight: '1.3' }],
      },
      spacing: {
        '18': '72px',
        '88': '352px',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '12px',
        full: '999px',
      },
      transitionDuration: {
        fast: '120ms',
        default: '150ms',
        slow: '200ms',
      },
      boxShadow: {
        sm: '0 2px 8px rgba(0, 0, 0, 0.1)',
        md: '0 4px 12px rgba(0, 0, 0, 0.15)',
        lg: '0 8px 24px rgba(0, 0, 0, 0.2)',
      },
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'slideDown': 'slideDown 0.3s ease-out',
        'slideUp': 'slideUp 0.3s ease-out',
        'fadeIn': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;