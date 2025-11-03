"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = exports.getWebSocketStats = exports.broadcastToRole = exports.broadcastToAddress = exports.emitWebSocketEvent = exports.setupWebSocket = void 0;
exports.getWebSocketService = getWebSocketService;
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
// Production-ready JWT secret handling
const getJWTSecret = () => {
    const secret = process.env['JWT_SECRET'];
    if (!secret && process.env['NODE_ENV'] === 'production') {
        throw new Error('CRITICAL: JWT_SECRET not set in production');
    }
    return secret || 'UNSAFE_DEVELOPMENT_SECRET_DO_NOT_USE_IN_PRODUCTION';
};
// WebSocket rate limiter
const wsRateLimiter = new rate_limiter_flexible_1.RateLimiterMemory({
    points: 100, // Number of messages
    duration: 60, // Per 60 seconds
    blockDuration: 60, // Block for 1 minute if exceeded
});
// Connection rate limiter
const connectionRateLimiter = new rate_limiter_flexible_1.RateLimiterMemory({
    points: 10, // Max 10 connections
    duration: 60, // Per minute
    blockDuration: 300, // Block for 5 minutes if exceeded
});
// Client management with memory optimization
class ClientManager {
    clients = new Map();
    maxClientsPerAddress = 5;
    maxTotalClients = 1000;
    clientCount = 0;
    add(address, ws) {
        // Check total client limit
        if (this.clientCount >= this.maxTotalClients) {
            console.warn(`Max total clients reached: ${this.maxTotalClients}`);
            return false;
        }
        // Check per-address limit
        if (!this.clients.has(address)) {
            this.clients.set(address, new Set());
        }
        const addressClients = this.clients.get(address);
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
    remove(address, ws) {
        const addressClients = this.clients.get(address);
        if (addressClients) {
            addressClients.delete(ws);
            this.clientCount--;
            if (addressClients.size === 0) {
                this.clients.delete(address);
            }
        }
    }
    getClients(address) {
        return this.clients.get(address.toLowerCase());
    }
    getAllClients() {
        return this.clients;
    }
    getClientCount() {
        return this.clientCount;
    }
    cleanup() {
        // Remove dead connections
        let removed = 0;
        this.clients.forEach((clientSet, address) => {
            clientSet.forEach((ws) => {
                if (ws.readyState !== ws_1.WebSocket.OPEN) {
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
const setupWebSocket = (wss) => {
    const JWT_SECRET = getJWTSecret();
    // Heartbeat interval with cleanup
    const heartbeatInterval = setInterval(() => {
        wss.clients.forEach((ws) => {
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
    wss.on('connection', async (ws, req) => {
        const clientIp = req.socket.remoteAddress || 'unknown';
        // Rate limit connections
        try {
            await connectionRateLimiter.consume(clientIp);
        }
        catch (rateLimiterRes) {
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
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            ws.userId = decoded.userId;
            ws.address = decoded.address;
            ws.role = decoded.role;
            // Add to client manager
            if (!clientManager.add(ws.address, ws)) {
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
        }
        catch (error) {
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
        ws.on('message', async (message) => {
            ws.messageCount = (ws.messageCount || 0) + 1;
            // Rate limit messages
            try {
                await wsRateLimiter.consume(ws.address || 'unknown');
            }
            catch (rateLimiterRes) {
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
            }
            catch (error) {
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
exports.setupWebSocket = setupWebSocket;
const extractTokenFromRequest = (req) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        if (token) {
            return token;
        }
        // Check authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.split(' ')[1] || null;
        }
    }
    catch (error) {
        console.error('Error extracting token:', error);
    }
    return null;
};
const handleWebSocketMessage = async (ws, message) => {
    switch (message.type) {
        case 'subscribe':
            // Subscribe to specific events with validation
            if (Array.isArray(message.events)) {
                const validEvents = message.events.filter((e) => typeof e === 'string' && e.length < 100).slice(0, 10); // Max 10 subscriptions
                validEvents.forEach((event) => {
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
                message.events.forEach((event) => {
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
const emitWebSocketEvent = async (eventType, data) => {
    const message = {
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
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                // Check if client subscribed to this event
                if (ws.subscribedEvents?.has(eventType) || ws.subscribedEvents?.has('*')) {
                    // Apply role-based filtering
                    if (shouldReceiveEvent(ws, eventType, data)) {
                        try {
                            ws.send(messageStr);
                            sentCount++;
                        }
                        catch (error) {
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
exports.emitWebSocketEvent = emitWebSocketEvent;
// Role-based event filtering
const shouldReceiveEvent = (ws, eventType, data) => {
    // Admin sees everything
    if (ws.role === 'admin') {
        return true;
    }
    // Event-specific filtering
    switch (eventType) {
        case 'escrow:created':
        case 'milestone:released':
            return (ws.address === data.kolAddress ||
                ws.address === data.projectAddress);
        case 'milestone:submitted':
            return ws.address === data.projectAddress;
        case 'submission:approved':
        case 'submission:rejected':
            return ws.address === data.kolAddress;
        case 'escrow:disputed':
            return (ws.address === data.kolAddress ||
                ws.address === data.projectAddress ||
                ws.address === data.raisedBy);
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
const broadcastToAddress = (address, message) => {
    const clientSet = clientManager.getClients(address.toLowerCase());
    if (clientSet) {
        const messageStr = JSON.stringify(message);
        clientSet.forEach((ws) => {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                try {
                    ws.send(messageStr);
                }
                catch (error) {
                    console.error(`Failed to broadcast to ${address}:`, error);
                }
            }
        });
    }
};
exports.broadcastToAddress = broadcastToAddress;
// Broadcast to role
const broadcastToRole = (role, message) => {
    const messageStr = JSON.stringify(message);
    const clients = clientManager.getAllClients();
    clients.forEach((clientSet) => {
        clientSet.forEach((ws) => {
            if (ws.readyState === ws_1.WebSocket.OPEN && ws.role === role) {
                try {
                    ws.send(messageStr);
                }
                catch (error) {
                    console.error(`Failed to broadcast to role ${role}:`, error);
                }
            }
        });
    });
};
exports.broadcastToRole = broadcastToRole;
// Get WebSocket stats
const getWebSocketStats = () => {
    const clients = clientManager.getAllClients();
    const stats = {
        connections: clientManager.getClientCount(),
        connectionsByAddress: {},
        connectionsByRole: {},
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
exports.getWebSocketStats = getWebSocketStats;
// Enhanced WebSocket service class
class WebSocketService {
    sendToUser(userId, message) {
        const clients = clientManager.getAllClients();
        let sent = false;
        clients.forEach((clientSet) => {
            clientSet.forEach((ws) => {
                if (ws.userId === userId && ws.readyState === ws_1.WebSocket.OPEN) {
                    try {
                        ws.send(JSON.stringify({
                            ...message,
                            timestamp: new Date().toISOString(),
                        }));
                        sent = true;
                    }
                    catch (error) {
                        console.error(`Failed to send to user ${userId}:`, error);
                    }
                }
            });
        });
        return sent;
    }
    sendToAddress(address, message) {
        (0, exports.broadcastToAddress)(address, {
            ...message,
            timestamp: new Date().toISOString(),
        });
    }
    broadcast(message) {
        const messageStr = JSON.stringify({
            ...message,
            timestamp: new Date().toISOString(),
        });
        const clients = clientManager.getAllClients();
        clients.forEach((clientSet) => {
            clientSet.forEach((ws) => {
                if (ws.readyState === ws_1.WebSocket.OPEN) {
                    try {
                        ws.send(messageStr);
                    }
                    catch (error) {
                        console.error('Broadcast error:', error);
                    }
                }
            });
        });
    }
    getStats() {
        return (0, exports.getWebSocketStats)();
    }
}
exports.WebSocketService = WebSocketService;
// Singleton instance
let wsServiceInstance = null;
function getWebSocketService() {
    if (!wsServiceInstance) {
        wsServiceInstance = new WebSocketService();
    }
    return wsServiceInstance;
}
//# sourceMappingURL=websocket-enhanced.service.js.map