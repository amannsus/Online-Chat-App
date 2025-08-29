import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.MODE === "development" 
  ? 'http://localhost:5001' 
  : (import.meta.env.VITE_BACKEND_URL || window.location.origin);

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'], // Add polling as fallback
  withCredentials: true,
  timeout: 20000,
});
