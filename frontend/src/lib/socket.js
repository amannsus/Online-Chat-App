import { io } from 'socket.io-client';

const getSocketURL = () => {
  // Check if we're in development
  if (import.meta.env.MODE === "development") {
    return 'http://localhost:5001';
  }
  
  // In production, use the backend URL from environment or same origin
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  
  // If backend URL is set and not the default placeholder
  if (backendUrl && !backendUrl.includes('your-render-app')) {
    return backendUrl;
  }
  
  // Fallback to same origin for production
  return window.location.origin;
};

console.log('Socket connecting to:', getSocketURL());

export const socket = io(getSocketURL(), {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  withCredentials: true,
  timeout: 20000,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  forceNew: true
});
