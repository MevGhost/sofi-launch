import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  address?: string;
  role?: string;
  isAlive?: boolean;
}

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

// Get JWT_SECRET securely
const getJWTSecret = () => {
  const secret = process.env['JWT_SECRET'];
  if (!secret && process.env['NODE_ENV'] === 'production') {
    throw new Error('CRITICAL: JWT_SECRET not set in production');
  }
  return secret || 'UNSAFE_DEVELOPMENT_SECRET_DO_NOT_USE_IN_PRODUCTION';
};

const JWT_SECRET = getJWTSecret();
const clients = new Map<string, Set<AuthenticatedWebSocket>>();

export const setupWebSocket = (wss: WebSocketServer) => {
  // Heartbeat interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.isAlive === false) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('connection', (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
    // Removed console log to reduce spam
    
    ws.isAlive = true;
    
    // Handle authentication
    const token = extractTokenFromRequest(req);
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        ws.userId = decoded.userId;
        ws.address = decoded.address;
        ws.role = decoded.role;
        
        // Add to clients map
        if (!clients.has(ws.address!)) {
          clients.set(ws.address!, new Set());
        }
        clients.get(ws.address!)!.add(ws);
        
        // Send connection success
        ws.send(JSON.stringify({
          type: 'connection',
          data: { status: 'authenticated', address: ws.address },
          timestamp: new Date().toISOString(),
        }));
      } catch (error) {
        // Silently handle auth errors to reduce console spam
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Authentication failed' },
          timestamp: new Date().toISOString(),
        }));
        ws.close();
        return;
      }
    } else {
      // Allow unauthenticated connections for public data
      ws.send(JSON.stringify({
        type: 'connection',
        data: { status: 'connected', authenticated: false },
        timestamp: new Date().toISOString(),
      }));
    }

    // Handle pong
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Handle messages
    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        handleWebSocketMessage(ws, data);
      } catch (error) {
        // Silently handle message errors
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format' },
          timestamp: new Date().toISOString(),
        }));
      }
    });

    // Handle close
    ws.on('close', () => {
      // Removed console log to reduce spam
      if (ws.address && clients.has(ws.address)) {
        clients.get(ws.address)!.delete(ws);
        if (clients.get(ws.address)!.size === 0) {
          clients.delete(ws.address);
        }
      }
    });

    // Handle error
    ws.on('error', (_error) => {
      // Silently handle WebSocket errors to reduce console spam
    });
  });

  wss.on('close', () => {
    clearInterval(interval);
  });
};

const extractTokenFromRequest = (req: IncomingMessage): string | null => {
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
  
  return null;
};

const handleWebSocketMessage = (ws: AuthenticatedWebSocket, message: any) => {
  switch (message.type) {
    case 'subscribe':
      // Handle subscription to specific events
      ws.send(JSON.stringify({
        type: 'subscribed',
        data: { events: message.events },
        timestamp: new Date().toISOString(),
      }));
      break;
      
    case 'ping':
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString(),
      }));
      break;
      
    default:
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Unknown message type' },
        timestamp: new Date().toISOString(),
      }));
  }
};

export const emitWebSocketEvent = async (eventType: string, data: any) => {
  const message: WebSocketMessage = {
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
  };
  
  const messageStr = JSON.stringify(message);
  
  // Import db at the top of the function to avoid circular dependency
  // NOTIFICATIONS DISABLED - Database import is commented out
  // const { db } = await import('./database.service');
  
  // Send to all connected clients and create notifications
  const recipientAddresses = new Set<string>();
  
  clients.forEach((clientSet, address) => {
    clientSet.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Apply role-based filtering if needed
        if (shouldReceiveEvent(ws, eventType, data)) {
          ws.send(messageStr);
          recipientAddresses.add(address);
        }
      }
    });
  });
  
  // NOTIFICATIONS DISABLED - Database notification creation is commented out
  /*
  // Create notifications in database for recipients
  try {
    const notificationData = getNotificationData(eventType, data);
    if (notificationData) {
      for (const address of recipientAddresses) {
        const user = await db.getUserByAddress(address);
        if (user) {
          await db.createNotification({
            userId: user.id,
            type: notificationData.type,
            title: notificationData.title,
            message: notificationData.message,
            data: notificationData.data,
          });
        }
      }
    }
  } catch (error) {
    console.error('Failed to create notifications:', error);
  }
  */
};

const shouldReceiveEvent = (
  ws: AuthenticatedWebSocket,
  eventType: string,
  data: any
): boolean => {
  // Implement role-based event filtering
  switch (eventType) {
    case 'escrow:created':
      // Only parties involved in the escrow
      return (
        ws.address === data.kolAddress ||
        ws.address === data.projectAddress ||
        ws.role === 'admin'
      );
      
    case 'milestone:released':
      // Only relevant KOL and project team
      return (
        ws.address === data.kolAddress ||
        ws.address === data.projectAddress ||
        ws.role === 'admin'
      );
      
    case 'milestone:submitted':
      // Project owner and admin should be notified
      return (
        ws.address === data.projectAddress ||
        ws.role === 'admin'
      );
      
    case 'submission:approved':
    case 'submission:rejected':
      // KOL should be notified
      return (
        ws.address === data.kolAddress ||
        ws.role === 'admin'
      );
      
    case 'milestone:reviewed':
      // Both KOL and project owner should know
      return (
        ws.address === data.kolAddress ||
        ws.address === data.projectAddress ||
        ws.role === 'admin'
      );
      
    case 'escrow:disputed':
      // KOL, project owner, and admin should be notified
      return (
        ws.address === data.kolAddress ||
        ws.address === data.raisedBy ||
        ws.role === 'admin'
      );
      
    default:
      return true;
  }
};

// NOTIFICATIONS DISABLED - Notification data helper is commented out
/*
const getNotificationData = (eventType: string, data: any) => {
  switch (eventType) {
    case 'escrow:created':
      return {
        type: 'ESCROW_CREATED',
        title: 'New Escrow Created',
        message: `New escrow "${data.projectName}" has been created`,
        data,
      };
      
    case 'milestone:submitted':
      return {
        type: 'MILESTONE_SUBMITTED',
        title: 'Milestone Submission',
        message: `KOL submitted deliverable for milestone ${data.milestoneId}`,
        data,
      };
      
    case 'submission:approved':
      return {
        type: 'MILESTONE_APPROVED',
        title: 'Submission Approved',
        message: `Your milestone submission has been approved`,
        data,
      };
      
    case 'submission:rejected':
      return {
        type: 'MILESTONE_REJECTED',
        title: 'Submission Rejected',
        message: `Your milestone submission has been rejected`,
        data,
      };
      
    case 'milestone:released':
      return {
        type: 'MILESTONE_RELEASED',
        title: 'Funds Released',
        message: `Milestone funds have been released`,
        data,
      };
      
    case 'funds:claimed':
      return {
        type: 'FUNDS_CLAIMED',
        title: 'Funds Claimed',
        message: `KOL has claimed their payment`,
        data,
      };
      
    case 'escrow:disputed':
      return {
        type: 'DISPUTE_RAISED',
        title: 'Dispute Raised',
        message: `A dispute has been raised on the escrow`,
        data,
      };
      
    case 'dispute:resolved':
      return {
        type: 'DISPUTE_RESOLVED',
        title: 'Dispute Resolved',
        message: `The dispute has been resolved`,
        data,
      };
      
    case 'escrow:completed':
      return {
        type: 'ESCROW_COMPLETED',
        title: 'Escrow Completed',
        message: `Escrow has been completed successfully`,
        data,
      };
      
    case 'escrow:cancelled':
      return {
        type: 'ESCROW_CANCELLED',
        title: 'Escrow Cancelled',
        message: `Escrow has been cancelled`,
        data,
      };
      
    case 'milestone:reviewed':
      return {
        type: 'VERIFICATION_REQUIRED',
        title: 'Verification Required',
        message: `Milestone requires verification`,
        data,
      };
      
    default:
      return null;
  }
};
*/

export const broadcastToAddress = (address: string, message: WebSocketMessage) => {
  const clientSet = clients.get(address.toLowerCase());
  if (clientSet) {
    const messageStr = JSON.stringify(message);
    clientSet.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }
};

export const broadcastToRole = (role: string, message: WebSocketMessage) => {
  const messageStr = JSON.stringify(message);
  clients.forEach((clientSet) => {
    clientSet.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN && ws.role === role) {
        ws.send(messageStr);
      }
    });
  });
};

// WebSocketService class for notification integration
export class WebSocketService {
  sendToUser(userId: string, message: any) {
    // Find user's address from userId
    clients.forEach((clientSet, _address) => {
      clientSet.forEach((ws) => {
        if (ws.userId === userId && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            ...message,
            timestamp: new Date().toISOString(),
          }));
        }
      });
    });
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
    
    clients.forEach((clientSet) => {
      clientSet.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      });
    });
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