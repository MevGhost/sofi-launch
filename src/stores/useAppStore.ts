import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Token {
  address: string;
  name: string;
  symbol: string;
  logo?: string;
  marketCap: string;
  liquidity: string;
  bondingProgress: number;
  launchTime: string;
  totalSupply: string;
  holders: number;
  change24h: number;
  volume24h: string;
  description?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export interface Trade {
  id: string;
  type: 'buy' | 'sell';
  tokenAddress: string;
  amount: string;
  price: string;
  timestamp: number;
  txHash: string;
}

interface AppState {
  // Token state
  tokens: Token[];
  selectedToken: Token | null;
  setSelectedToken: (token: Token | null) => void;
  addToken: (token: Token) => void;
  updateToken: (address: string, updates: Partial<Token>) => void;
  
  // Trade state
  trades: Trade[];
  addTrade: (trade: Trade) => void;
  
  // Filter state
  filters: {
    minMarketCap?: string;
    maxMarketCap?: string;
    minLiquidity?: string;
    bondingProgress: [number, number];
  };
  setFilters: (filters: any) => void;
  
  // UI state
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Token state
      tokens: [],
      selectedToken: null,
      setSelectedToken: (token) => set({ selectedToken: token }),
      addToken: (token) => set((state) => ({ 
        tokens: [...state.tokens, token] 
      })),
      updateToken: (address, updates) => set((state) => ({
        tokens: state.tokens.map(t => 
          t.address === address ? { ...t, ...updates } : t
        )
      })),
      
      // Trade state
      trades: [],
      addTrade: (trade) => set((state) => ({
        trades: [trade, ...state.trades].slice(0, 100) // Keep last 100 trades
      })),
      
      // Filter state
      filters: {
        bondingProgress: [0, 100]
      },
      setFilters: (filters) => set({ filters }),
      
      // UI state
      viewMode: 'grid',
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: 's4-launchpad-storage',
      partialize: (state) => ({
        viewMode: state.viewMode,
        filters: state.filters,
      }),
    }
  )
);