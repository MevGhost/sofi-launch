/**
 * API Configuration
 * Central configuration for all API endpoints and WebSocket connections
 */

// API Base URL - uses environment variable or defaults (backend runs on 5001 per .env)
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// WebSocket URL - uses environment variable or defaults
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5001';

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    logout: `${API_BASE_URL}/api/auth/logout`,
    verify: `${API_BASE_URL}/api/auth/verify`,
    nonce: `${API_BASE_URL}/api/auth/nonce`,
  },

  // Token/Launchpad endpoints
  tokens: {
    list: `${API_BASE_URL}/api/tokens`,
    create: `${API_BASE_URL}/api/tokens/create`,
    details: (address: string) => `${API_BASE_URL}/api/tokens/${address}`,
    buy: `${API_BASE_URL}/api/tokens/buy`,
    sell: `${API_BASE_URL}/api/tokens/sell`,
    chart: (address: string) => `${API_BASE_URL}/api/tokens/${address}/chart`,
    holders: (address: string) => `${API_BASE_URL}/api/tokens/${address}/holders`,
    trades: (address: string) => `${API_BASE_URL}/api/tokens/${address}/trades`,
  },

  // Escrow endpoints
  escrows: {
    list: `${API_BASE_URL}/api/escrows`,
    create: `${API_BASE_URL}/api/escrows`,
    deploy: `${API_BASE_URL}/api/escrows/deploy`, // New endpoint for deployment
    details: (id: string) => `${API_BASE_URL}/api/escrows/${id}`,
    update: (id: string) => `${API_BASE_URL}/api/escrows/${id}`,
    milestones: (id: string) => `${API_BASE_URL}/api/escrows/${id}/milestones`,
    releaseMilestone: (escrowId: string, milestoneId: string) => 
      `${API_BASE_URL}/api/escrows/${escrowId}/milestones/${milestoneId}/release`,
    dispute: (id: string) => `${API_BASE_URL}/api/escrows/${id}/dispute`,
    activities: (id: string) => `${API_BASE_URL}/api/escrows/${id}/activities`,
  },

  // Admin endpoints
  admin: {
    dashboard: `${API_BASE_URL}/api/admin/dashboard`,
    users: `${API_BASE_URL}/api/admin/users`,
    escrows: `${API_BASE_URL}/api/admin/escrows`,
    settings: `${API_BASE_URL}/api/admin/settings`,
    fees: `${API_BASE_URL}/api/admin/fees`,
    contracts: `${API_BASE_URL}/api/admin/contracts`,
  },

  // KOL endpoints
  kol: {
    profile: `${API_BASE_URL}/api/kol/profile`,
    deals: `${API_BASE_URL}/api/kol/deals`,
    earnings: `${API_BASE_URL}/api/kol/earnings`,
    reputation: `${API_BASE_URL}/api/kol/reputation`,
  },

  // Portfolio endpoints
  portfolio: {
    overview: `${API_BASE_URL}/api/portfolio`,
    tokens: `${API_BASE_URL}/api/portfolio/tokens`,
    escrows: `${API_BASE_URL}/api/portfolio/escrows`,
    activities: `${API_BASE_URL}/api/portfolio/activities`,
    pnl: `${API_BASE_URL}/api/portfolio/pnl`,
  },

  // Statistics
  stats: {
    platform: `${API_BASE_URL}/api/stats`,
    tokens: `${API_BASE_URL}/api/stats/tokens`,
    escrows: `${API_BASE_URL}/api/stats/escrows`,
    volume: `${API_BASE_URL}/api/stats/volume`,
  },

  // Metadata
  metadata: {
    token: (address: string) => `${API_BASE_URL}/api/metadata/token/${address}`,
    upload: `${API_BASE_URL}/api/metadata/upload`,
  },

  // Upload endpoints
  upload: {
    tokenImage: `${API_BASE_URL}/api/upload/token-image`,
    deleteImage: (filename: string) => `${API_BASE_URL}/api/upload/token-image/${filename}`,
  },

  // Verifier endpoints
  verifier: {
    verify: `${API_BASE_URL}/api/verifier/verify`,
    pending: `${API_BASE_URL}/api/verifier/pending`,
    history: `${API_BASE_URL}/api/verifier/history`,
  },
} as const;

// WebSocket Events
export const WS_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Token events
  TOKEN_CREATED: 'token:created',
  TOKEN_TRADE: 'token:trade',
  TOKEN_GRADUATED: 'token:graduated',
  TOKEN_PRICE_UPDATE: 'token:price',

  // Escrow events
  ESCROW_CREATED: 'escrow:created',
  ESCROW_FUNDED: 'escrow:funded',
  ESCROW_MILESTONE_RELEASED: 'escrow:milestone:released',
  ESCROW_DISPUTED: 'escrow:disputed',
  ESCROW_COMPLETED: 'escrow:completed',

  // User events
  USER_NOTIFICATION: 'user:notification',
  USER_ACTIVITY: 'user:activity',
} as const;

// Request headers
export const getAuthHeaders = (token?: string) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Check for global auth token first
  const globalToken = typeof window !== 'undefined' ? (window as any).__AUTH_TOKEN : null;
  const authToken = token || globalToken;
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Add chain information if needed
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID;
  if (chainId) {
    headers['X-Chain'] = chainId;
    headers['X-Chain-Type'] = 'evm';
  }

  return headers;
};

// Error handling
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// API request wrapper with error handling
export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    // Extract token from options headers if provided
    let token: string | undefined;
    if (options.headers) {
      const headers = options.headers as Record<string, string>;
      const authHeader = headers['Authorization'];
      token = authHeader?.replace('Bearer ', '');
    }
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(token),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new APIError(
        error.message || `Request failed with status ${response.status}`,
        response.status,
        error.code,
        error.details
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new APIError('Network error: Unable to connect to the server', 0, 'NETWORK_ERROR');
    }

    throw new APIError(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500,
      'UNKNOWN_ERROR'
    );
  }
}

// WebSocket connection manager
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(WS_BASE_URL);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit(WS_EVENTS.CONNECT, {});
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event) {
            this.emit(data.event, data.payload);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit(WS_EVENTS.ERROR, error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.emit(WS_EVENTS.DISCONNECT, {});
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    this.reconnectTimer = setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.listeners.clear();
    this.reconnectAttempts = 0;
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }

  send(event: string, payload: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, payload }));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', event);
    }
  }
}

// Create a singleton instance
export const wsManager = typeof window !== 'undefined' ? new WebSocketManager() : null;