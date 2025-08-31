
import axios from "axios";

// Build a base URL that keeps cookies first-party
const getBaseURL = () => {
  // Local development talks directly to the backend
  if (import.meta.env.MODE === "development" || import.meta.env.DEV) {
    return "http://localhost:5001/api";
  }

  // In production, use same-origin so Netlify proxies /api to Render
  // (configured in netlify.toml and public/_redirects)
  return "/api";
};

export const axiosInstance = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,          // send/receive the jwt cookie
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Centralized 401 handling without loops
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const path = window.location.pathname;
    const url = error.config?.url || "";

    if (status === 401) {
      // Ignore the initial auth check to avoid flicker/loops
      const isAuthCheck = url.includes("/auth/check");
      const onAuthPages = path.startsWith("/login") || path.startsWith("/signup");

      if (!onAuthPages && !isAuthCheck) {
        if (window.navigateToLogin) {
          window.navigateToLogin();
        } else {
          window.location.replace("/login");
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
