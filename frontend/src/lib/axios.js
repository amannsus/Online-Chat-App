// frontend/src/lib/axios.js
import axios from "axios";

const isDev = import.meta.env.MODE === "development";

const getBaseURL = () => {
  // In development, hit the local API directly
  if (isDev) return "http://localhost:5001/api";

  // In production, always use same-origin so auth cookies are first‑party
  // and flow through Netlify’s proxy rule (/api/* -> backend)
  return "/api";
};

export const axiosInstance = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,             // send/receive cookies with requests
  timeout: isDev ? 15000 : 30000,    // give Render Free time to wake up
  headers: {
    "X-Requested-With": "XMLHttpRequest",
  },
});

// Optional warmup helper (use before first auth call if desired)
export const warmupApi = async () => {
  try {
    await axiosInstance.get("/health", { timeout: 5000 });
  } catch {
    // ignore warmup errors
  }
};

// Centralized 401 handling to redirect to login only when appropriate
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    const url = error.config?.url || "";

    if (status === 401) {
      // Avoid loops on the initial /auth/check or when already on auth pages
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
