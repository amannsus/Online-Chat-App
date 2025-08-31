
import { io } from 'socket.io-client';

const getSocketURL = () => {
  if (import.meta.env.MODE === "development") return 'http://localhost:5001';
  // Use backend URL for websockets; cookies aren’t required for your socket join flow
  return import.meta.env.VITE_BACKEND_URL; // e.g., https://online-chat-app-hwop.onrender.com
};

export const socket = io(getSocketURL(), {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  withCredentials: true,
  timeout: 20000,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
