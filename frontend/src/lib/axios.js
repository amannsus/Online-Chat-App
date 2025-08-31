
import axios from "axios";

/**
 * Use localhost in development.
 * In production, always use same-origin "/api" so the JWT cookie is first-party
 * when the site is served from Netlify (which proxies /api/* to Render).
 */
const getBaseURL = () => {
  if (import.meta.env.MODE === "development") {
    return "http://localhost:5001/api";
  }
  return "/api";
};

export const axiosInstance = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,           // send/receive cookies
  timeout: 10000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// Optional: request interceptor (kept minimal)
axiosInstance.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

/**
 * Response interceptor:
 * - Allow /auth/check to 401 silently so the app can render auth pages without loops.
 * - For other 401s, navigate to /login (SPA if window.navigateToLogin exists).
 */
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const path = window.location.pathname;
    const reqUrl = error.config?.url || "";

    if (status === 401) {
      const isAuthCheck = reqUrl.includes("/auth/check");
      const onAuthPages =
        path.startsWith("/login") || path.startsWith("/signup");

      if (!onAuthPages && !isAuthCheck) {
        if (window.navigateToLogin) {
          window.navigateToLogin();
        } else {
          window.location.replace("/login");
        }
      }
      // For /auth/check or when already on auth pages, just reject to let UI handle it
    }

    return Promise.reject(error);
  }
);
