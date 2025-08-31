import { io } from 'socket.io-client';

const getSocketURL = () => {
  if (import.meta.env.MODE === "development") return 'http://localhost:5001';
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  return backendUrl || window.location.origin;
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
