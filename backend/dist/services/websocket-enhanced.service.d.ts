import { WebSocketServer } from 'ws';
interface WebSocketMessage {
    type: string;
    data: any;
    timestamp: string;
}
export declare const setupWebSocket: (wss: WebSocketServer) => void;
export declare const emitWebSocketEvent: (eventType: string, data: any) => Promise<void>;
export declare const broadcastToAddress: (address: string, message: WebSocketMessage) => void;
export declare const broadcastToRole: (role: string, message: WebSocketMessage) => void;
export declare const getWebSocketStats: () => {
    connections: number;
    connectionsByAddress: Record<string, number>;
    connectionsByRole: Record<string, number>;
};
export declare class WebSocketService {
    sendToUser(userId: string, message: any): boolean;
    sendToAddress(address: string, message: any): void;
    broadcast(message: any): void;
    getStats(): {
        connections: number;
        connectionsByAddress: Record<string, number>;
        connectionsByRole: Record<string, number>;
    };
}
export declare function getWebSocketService(): WebSocketService;
export {};
//# sourceMappingURL=websocket-enhanced.service.d.ts.map