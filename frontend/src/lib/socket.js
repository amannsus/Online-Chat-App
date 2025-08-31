import { io } from "socket.io-client";

const getSocketURL = () => {
  if (import.meta.env.MODE === "development") return "http://localhost:5001";
  return window.location.origin; // same-origin in production
};

export const socket = io(getSocketURL(), {
  autoConnect: false,
  transports: ["websocket", "polling"],
  withCredentials: true,
  timeout: 20000,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
