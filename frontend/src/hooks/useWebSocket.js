import { useState, useEffect, useCallback, useRef } from 'react';

const useWebSocket = (userId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Initialize WebSocket connection
  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(`ws://localhost:8000/ws/${userId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      };

      ws.onerror = (error) => {
        setError('WebSocket error occurred');
        console.error('WebSocket error:', error);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };
    } catch (e) {
      setError('Failed to establish WebSocket connection');
      console.error('WebSocket connection error:', e);
    }
  }, [userId]);

  // Cleanup on unmount
  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  // Subscribe to symbols
  const subscribe = useCallback((symbols) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        symbols: Array.isArray(symbols) ? symbols : [symbols]
      }));
    }
  }, [isConnected]);

  // Unsubscribe from symbols
  const unsubscribe = useCallback((symbols) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        symbols: Array.isArray(symbols) ? symbols : [symbols]
      }));
    }
  }, [isConnected]);

  // Handle incoming messages
  const handleMessage = useCallback((message) => {
    switch (message.type) {
      case 'market_update':
        // Emit market update event
        window.dispatchEvent(new CustomEvent('market_update', {
          detail: message.data
        }));
        break;

      case 'news_update':
        // Emit news update event
        window.dispatchEvent(new CustomEvent('news_update', {
          detail: message.data
        }));
        break;

      case 'calendar_update':
        // Emit calendar update event
        window.dispatchEvent(new CustomEvent('calendar_update', {
          detail: message.data
        }));
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }, []);

  return {
    isConnected,
    error,
    subscribe,
    unsubscribe
  };
};

export default useWebSocket;
