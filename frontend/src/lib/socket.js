// frontend/src/lib/socket.js - Fixed socket configuration
import { io } from 'socket.io-client';

const getSocketURL = () => {
  if (import.meta.env.MODE === "development") {
    return 'http://localhost:5001';
  }
  
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  
  if (backendUrl && !backendUrl.includes('your-render-app')) {
    return backendUrl;
  }
  
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
  // Removed forceNew to prevent creating unnecessary new connections
});

// frontend/src/lib/axios.js - Fixed axios configuration
import axios from "axios";

const getBaseURL = () => {
  if (import.meta.env.MODE === "development") {
    return "http://localhost:5001/api";
  }
  
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  if (backendUrl) {
    return `${backendUrl}/api`;
  }
  
  return "/api";
};

export const axiosInstance = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  timeout: 10000,
});

// Fixed interceptor to use React Router navigation instead of hard refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    // Only redirect if we're not already on the login page
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      
      // Don't redirect if we're already on login or signup pages
      if (!currentPath.includes('/login') && !currentPath.includes('/signup')) {
        // Use React Router navigation if available
        if (window.navigateToLogin) {
          window.navigateToLogin();
        } else {
          // Fallback to location.replace (better than href for SPAs)
          window.location.replace('/login');
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// frontend/src/store/useAuthStore.js - Fixed auth store
import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get('/auth/check');
      set({ authUser: res.data });
      
      if (res.data) {
        const { useChatStore } = await import("./useChatStore.js");
        useChatStore.getState().connectSocket(res.data._id);
      }
    } catch (error) {
      // Don't log error for 401s on auth check
      if (error.response?.status !== 401) {
        console.error("Auth check error:", error);
      }
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully!");
      
      const { useChatStore } = await import("./useChatStore.js");
      useChatStore.getState().connectSocket(res.data._id);
      
      return { success: true };
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(error.response?.data?.message || "Something went wrong");
      return { success: false, error: error.response?.data?.message };
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully!");
      
      const { useChatStore } = await import("./useChatStore.js");
      useChatStore.getState().connectSocket(res.data._id);
      
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.response?.data?.message || "Something went wrong");
      return { success: false, error: error.response?.data?.message };
    } finally {
      set({ isLoggingIn: false });
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully!");
      return { success: true };
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile");
      return { success: false, error: error.response?.data?.message };
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      
      const { useChatStore } = await import("./useChatStore.js");
      useChatStore.getState().disconnectSocket();
      
      toast.success("Logged out successfully!");
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
      return { success: false };
    }
  },
}));

export default useAuthStore;
