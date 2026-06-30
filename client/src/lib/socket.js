import { io } from 'socket.io-client';

let socketInstance = null;
let connected = false;
const listeners = new Set();

const SERVER_URL = import.meta.env.VITE_SIGNALING_SERVER_URL || 'http://localhost:4000';

export function getSocket() {
  return socketInstance;
}

export function isConnected() {
  return connected;
}

export function connectSocket(token) {
  if (socketInstance?.connected) return;

  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  socketInstance = io(SERVER_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.5,
  });

  socketInstance.on('connect', () => {
    connected = true;
    notify();
  });

  socketInstance.on('disconnect', () => {
    connected = false;
    notify();
  });

  socketInstance.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
    connected = false;
    notify();
  });
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    connected = false;
    notify();
  }
}

function notify() {
  listeners.forEach(fn => fn(socketInstance, connected));
}

export function onConnectionChange(fn) {
  listeners.add(fn);
  fn(socketInstance, connected);
  return () => listeners.delete(fn);
}
