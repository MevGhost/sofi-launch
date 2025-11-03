'use client';

import React, { useState, useEffect } from 'react';
import { wsManager, WS_EVENTS } from '@/lib/api/config';
import { FiWifi, FiWifiOff, FiRefreshCw } from 'react-icons/fi';
import { cn } from '@/lib/utils';

export function WebSocketStatus({ className }: { className?: string }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastConnected, setLastConnected] = useState<Date | null>(null);

  useEffect(() => {
    if (!wsManager) return;

    // Connect on mount
    wsManager.connect();

    // Set up event listeners
    const handleConnect = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setLastConnected(new Date());
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setIsReconnecting(true);
    };

    const handleError = () => {
      setIsConnected(false);
    };

    const unsubConnect = wsManager.on(WS_EVENTS.CONNECT, handleConnect);
    const unsubDisconnect = wsManager.on(WS_EVENTS.DISCONNECT, handleDisconnect);
    const unsubError = wsManager.on(WS_EVENTS.ERROR, handleError);

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubError();
    };
  }, []);

  const handleReconnect = () => {
    if (wsManager && !isConnected) {
      setIsReconnecting(true);
      wsManager.connect();
    }
  };

  const getStatusColor = () => {
    if (isConnected) return 'text-success';
    if (isReconnecting) return 'text-warning';
    return 'text-danger';
  };

  const getStatusIcon = () => {
    if (isReconnecting) {
      return <FiRefreshCw className="animate-spin" size={16} />;
    }
    return isConnected ? <FiWifi size={16} /> : <FiWifiOff size={16} />;
  };

  const getStatusText = () => {
    if (isConnected) return 'Connected';
    if (isReconnecting) return 'Reconnecting...';
    return 'Disconnected';
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        onClick={handleReconnect}
        disabled={isConnected || isReconnecting}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all',
          'bg-surface2 border border-border',
          isConnected && 'cursor-default',
          !isConnected && !isReconnecting && 'hover:bg-surface3 cursor-pointer'
        )}
        title={`WebSocket: ${getStatusText()}`}
      >
        <span className={getStatusColor()}>{getStatusIcon()}</span>
        <span className="text-text-muted hidden sm:inline">{getStatusText()}</span>
      </button>
      {lastConnected && !isConnected && (
        <span className="text-micro text-text-muted hidden md:inline">
          Last connected: {lastConnected.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}