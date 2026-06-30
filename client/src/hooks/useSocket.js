import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSocket, isConnected, connectSocket, disconnectSocket, onConnectionChange } from '../lib/socket';

export function useSocket() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(isConnected);

  useEffect(() => {
    const unsub = onConnectionChange((sock, conn) => {
      setConnected(conn);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (user?.token) {
      connectSocket(user.token);
    } else {
      disconnectSocket();
    }
  }, [user?.token]);

  const socket = getSocket();
  const emit = useCallback((event, data) => {
    if (socket?.connected) {
      socket.emit(event, data);
    }
  }, []);

  const on = useCallback((event, handler) => {
    socket?.on(event, handler);
    return () => socket?.off(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socket?.off(event, handler);
  }, []);

  return { socket, connected, emit, on, off };
}
