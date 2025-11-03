export declare class EventListenerService {
    private provider;
    private contract;
    private isListening;
    constructor();
    /**
     * Start listening for TokenCreated events
     */
    start(): void;
    /**
     * Stop listening for events
     */
    stop(): void;
    /**
     * Handle TokenCreated event
     */
    private handleTokenCreated;
    /**
     * Sync historical TokenCreated events that may have been missed
     */
    private syncHistoricalEvents;
    /**
     * Force sync a specific block range with batching
     */
    syncBlockRange(fromBlock: number, toBlock: number): Promise<void>;
}
export declare const eventListenerService: EventListenerService;
//# sourceMappingURL=event-listener.service.d.ts.map