import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';
import { RateLimiterMemory } from 'rate-limiter-flexible';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  address?: string;
  role?: string;
  isAlive?: boolean;
  subscribedEvents?: Set<string>;
  connectionTime?: number;
  messageCount?: number;
}

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

// Production-ready JWT secret handling
const getJWTSecret = () => {
  const secret = process.env['JWT_SECRET'];
  if (!secret && process.env['NODE_ENV'] === 'production') {
    throw new Error('CRITICAL: JWT_SECRET not set in production');
  }
  return secret || 'UNSAFE_DEVELOPMENT_SECRET_DO_NOT_USE_IN_PRODUCTION';
};

// WebSocket rate limiter
const wsRateLimiter = new RateLimiterMemory({
  points: 100, // Number of messages
  duration: 60, // Per 60 seconds
  blockDuration: 60, // Block for 1 minute if exceeded
});

// Connection rate limiter
const connectionRateLimiter = new RateLimiterMemory({
  points: 10, // Max 10 connections
  duration: 60, // Per minute
  blockDuration: 300, // Block for 5 minutes if exceeded
});

// Client management with memory optimization
class ClientManager {
  private clients = new Map<string, Set<AuthenticatedWebSocket>>();
  private maxClientsPerAddress = 5;
  private maxTotalClients = 1000;
  private clientCount = 0;

  add(address: string, ws: AuthenticatedWebSocket): boolean {
    // Check total client limit
    if (this.clientCount >= this.maxTotalClients) {
      console.warn(`Max total clients reached: ${this.maxTotalClients}`);
      return false;
    }

    // Check per-address limit
    if (!this.clients.has(address)) {
      this.clients.set(address, new Set());
    }
    
    const addressClients = this.clients.get(address)!;
    if (addressClients.size >= this.maxClientsPerAddress) {
      console.warn(`Max clients per address reached for ${address}`);
      // Close oldest connection
      const oldestClient = Array.from(addressClients)[0];
      oldestClient.close(1008, 'Connection limit exceeded');
      addressClients.delete(oldestClient);
      this.clientCount--;
    }

    addressClients.add(ws);
    this.clientCount++;
    return true;
  }

  remove(address: string, ws: AuthenticatedWebSocket): void {
    const addressClients = this.clients.get(address);
    if (addressClients) {
      addressClients.delete(ws);
      this.clientCount--;
      if (addressClients.size === 0) {
        this.clients.delete(address);
      }
    }
  }

  getClients(address: string): Set<AuthenticatedWebSocket> | undefined {
    return this.clients.get(address.toLowerCase());
  }

  getAllClients(): Map<string, Set<AuthenticatedWebSocket>> {
    return this.clients;
  }

  getClientCount(): number {
    return this.clientCount;
  }

  cleanup(): void {
    // Remove dead connections
    let removed = 0;
    this.clients.forEach((clientSet, address) => {
      clientSet.forEach((ws) => {
        if (ws.readyState !== WebSocket.OPEN) {
          clientSet.delete(ws);
          this.clientCount--;
          removed++;
        }
      });
      if (clientSet.size === 0) {
        this.clients.delete(address);
      }
    });
    if (removed > 0) {
      console.log(`Cleaned up ${removed} dead WebSocket connections`);
    }
  }
}

const clientManager = new ClientManager();

export const setupWebSocket = (wss: WebSocketServer) => {
  const JWT_SECRET = getJWTSecret();
  
  // Heartbeat interval with cleanup
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.isAlive === false) {
        if (ws.address) {
          clientManager.remove(ws.address, ws);
        }
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
    
    // Periodic cleanup
    clientManager.cleanup();
  }, 30000);

  // Memory usage monitoring
  const memoryMonitorInterval = setInterval(() => {
    const usage = process.memoryUsage();
    const totalClients = clientManager.getClientCount();
    
    if (usage.heapUsed > 500 * 1024 * 1024) { // 500MB threshold
      console.warn(`High memory usage detected: ${Math.round(usage.heapUsed / 1024 / 1024)}MB with ${totalClients} clients`);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        console.log('Forced garbage collection');
      }
    }
  }, 60000); // Check every minute

  wss.on('connection', async (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    
    // Rate limit connections
    try {
      await connectionRateLimiter.consume(clientIp);
    } catch (rateLimiterRes) {
      ws.close(1008, 'Too many connections');
      return;
    }
    
    ws.isAlive = true;
    ws.connectionTime = Date.now();
    ws.messageCount = 0;
    ws.subscribedEvents = new Set();
    
    // Handle authentication
    const token = extractTokenFromRequest(req);
    if (!token) {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      }));
      ws.close(1008, 'No token provided');
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      ws.userId = decoded.userId;
      ws.address = decoded.address;
      ws.role = decoded.role;
      
      // Add to client manager
      if (!clientManager.add(ws.address!, ws)) {
        ws.close(1008, 'Connection limit exceeded');
        return;
      }
      
      // Send connection success
      ws.send(JSON.stringify({
        type: 'connection',
        data: { 
          status: 'authenticated', 
          address: ws.address,
          serverTime: new Date().toISOString() 
        },
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Authentication failed' },
        timestamp: new Date().toISOString(),
      }));
      ws.close(1008, 'Invalid token');
      return;
    }

    // Handle pong
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Handle messages with rate limiting
    ws.on('message', async (message: Buffer) => {
      ws.messageCount = (ws.messageCount || 0) + 1;
      
      // Rate limit messages
      try {
        await wsRateLimiter.consume(ws.address || 'unknown');
      } catch (rateLimiterRes) {
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Rate limit exceeded. Please slow down.' },
          timestamp: new Date().toISOString(),
        }));
        return;
      }

      // Message size limit (1MB)
      if (message.length > 1024 * 1024) {
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Message too large' },
          timestamp: new Date().toISOString(),
        }));
        return;
      }

      try {
        const data = JSON.parse(message.toString());
        
        // Validate message structure
        if (!data.type || typeof data.type !== 'string') {
          throw new Error('Invalid message structure');
        }
        
        await handleWebSocketMessage(ws, data);
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format' },
          timestamp: new Date().toISOString(),
        }));
      }
    });

    // Handle close
    ws.on('close', (code, reason) => {
      if (ws.address) {
        clientManager.remove(ws.address, ws);
      }
      
      // Log abnormal closures
      if (code !== 1000 && code !== 1001) {
        console.log(`WebSocket closed abnormally: code=${code}, reason=${reason}, address=${ws.address}`);
      }
    });

    // Handle error
    ws.on('error', (error) => {
      console.error(`WebSocket error for ${ws.address}:`, error.message);
      if (ws.address) {
        clientManager.remove(ws.address, ws);
      }
    });
  });

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
    clearInterval(memoryMonitorInterval);
  });

  // Server-level error handling
  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });
};

const extractTokenFromRequest = (req: IncomingMessage): string | null => {
  try {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (token) {
      return token;
    }
    
    // Check authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1] || null;
    }
  } catch (error) {
    console.error('Error extracting token:', error);
  }
  
  return null;
};

const handleWebSocketMessage = async (ws: AuthenticatedWebSocket, message: any) => {
  switch (message.type) {
    case 'subscribe':
      // Subscribe to specific events with validation
      if (Array.isArray(message.events)) {
        const validEvents = message.events.filter((e: any) => 
          typeof e === 'string' && e.length < 100
        ).slice(0, 10); // Max 10 subscriptions
        
        validEvents.forEach((event: string) => {
          ws.subscribedEvents?.add(event);
        });
        
        ws.send(JSON.stringify({
          type: 'subscribed',
          data: { events: validEvents },
          timestamp: new Date().toISOString(),
        }));
      }
      break;
      
    case 'unsubscribe':
      // Unsubscribe from events
      if (Array.isArray(message.events)) {
        message.events.forEach((event: string) => {
          ws.subscribedEvents?.delete(event);
        });
        
        ws.send(JSON.stringify({
          type: 'unsubscribed',
          data: { events: message.events },
          timestamp: new Date().toISOString(),
        }));
      }
      break;
      
    case 'ping':
      ws.send(JSON.stringify({
        type: 'pong',
        data: { time: Date.now() },
        timestamp: new Date().toISOString(),
      }));
      break;
      
    default:
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: `Unknown message type: ${message.type}` },
        timestamp: new Date().toISOString(),
      }));
  }
};

// Enhanced event emission with filtering
export const emitWebSocketEvent = async (eventType: string, data: any) => {
  const message: WebSocketMessage = {
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
  };
  
  const messageStr = JSON.stringify(message);
  
  // Batch send to all relevant clients
  const clients = clientManager.getAllClients();
  let sentCount = 0;
  
  clients.forEach((clientSet, address) => {
    clientSet.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Check if client subscribed to this event
        if (ws.subscribedEvents?.has(eventType) || ws.subscribedEvents?.has('*')) {
          // Apply role-based filtering
          if (shouldReceiveEvent(ws, eventType, data)) {
            try {
              ws.send(messageStr);
              sentCount++;
            } catch (error) {
              console.error(`Failed to send event to ${address}:`, error);
            }
          }
        }
      }
    });
  });
  
  if (process.env['NODE_ENV'] === 'development') {
    console.log(`Event ${eventType} sent to ${sentCount} clients`);
  }
};

// Role-based event filtering
const shouldReceiveEvent = (
  ws: AuthenticatedWebSocket,
  eventType: string,
  data: any
): boolean => {
  // Admin sees everything
  if (ws.role === 'admin') {
    return true;
  }
  
  // Event-specific filtering
  switch (eventType) {
    case 'escrow:created':
    case 'milestone:released':
      return (
        ws.address === data.kolAddress ||
        ws.address === data.projectAddress
      );
      
    case 'milestone:submitted':
      return ws.address === data.projectAddress;
      
    case 'submission:approved':
    case 'submission:rejected':
      return ws.address === data.kolAddress;
      
    case 'escrow:disputed':
      return (
        ws.address === data.kolAddress ||
        ws.address === data.projectAddress ||
        ws.address === data.raisedBy
      );
      
    // Public events
    case 'token:created':
    case 'token:trade':
    case 'token:graduated':
      return true;
      
    default:
      return false;
  }
};

// Broadcast to specific address
export const broadcastToAddress = (address: string, message: WebSocketMessage) => {
  const clientSet = clientManager.getClients(address.toLowerCase());
  if (clientSet) {
    const messageStr = JSON.stringify(message);
    clientSet.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error(`Failed to broadcast to ${address}:`, error);
        }
      }
    });
  }
};

// Broadcast to role
export const broadcastToRole = (role: string, message: WebSocketMessage) => {
  const messageStr = JSON.stringify(message);
  const clients = clientManager.getAllClients();
  
  clients.forEach((clientSet) => {
    clientSet.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN && ws.role === role) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error(`Failed to broadcast to role ${role}:`, error);
        }
      }
    });
  });
};

// Get WebSocket stats
export const getWebSocketStats = () => {
  const clients = clientManager.getAllClients();
  const stats = {
    connections: clientManager.getClientCount(),
    connectionsByAddress: {} as Record<string, number>,
    connectionsByRole: {} as Record<string, number>,
  };
  
  clients.forEach((clientSet, address) => {
    stats.connectionsByAddress[address] = clientSet.size;
    
    clientSet.forEach((ws) => {
      const role = ws.role || 'unknown';
      stats.connectionsByRole[role] = (stats.connectionsByRole[role] || 0) + 1;
    });
  });
  
  return stats;
};

// Enhanced WebSocket service class
export class WebSocketService {
  sendToUser(userId: string, message: any) {
    const clients = clientManager.getAllClients();
    let sent = false;
    
    clients.forEach((clientSet) => {
      clientSet.forEach((ws) => {
        if (ws.userId === userId && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({
              ...message,
              timestamp: new Date().toISOString(),
            }));
            sent = true;
          } catch (error) {
            console.error(`Failed to send to user ${userId}:`, error);
          }
        }
      });
    });
    
    return sent;
  }

  sendToAddress(address: string, message: any) {
    broadcastToAddress(address, {
      ...message,
      timestamp: new Date().toISOString(),
    });
  }

  broadcast(message: any) {
    const messageStr = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString(),
    });
    
    const clients = clientManager.getAllClients();
    clients.forEach((clientSet) => {
      clientSet.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(messageStr);
          } catch (error) {
            console.error('Broadcast error:', error);
          }
        }
      });
    });
  }
  
  getStats() {
    return getWebSocketStats();
  }
}

// Singleton instance
let wsServiceInstance: WebSocketService | null = null;

export function getWebSocketService(): WebSocketService {
  if (!wsServiceInstance) {
    wsServiceInstance = new WebSocketService();
  }
  return wsServiceInstance;
}