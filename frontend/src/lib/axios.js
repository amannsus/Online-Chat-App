import axios from "axios";

const getBaseURL = () => {
  if (import.meta.env.MODE === "development" || import.meta.env.DEV) return "http://localhost:5001/api";
  return "/api"; // use Netlify proxy in production
};

export const axiosInstance = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

axiosInstance.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error.response?.status;
    const path = window.location.pathname;
    const url = error.config?.url || "";
    if (status === 401) {
      const isAuthCheck = url.includes("/auth/check");
      const onAuthPages = path.startsWith("/login") || path.startsWith("/signup");
      if (!onAuthPages && !isAuthCheck) {
        if (window.navigateToLogin) window.navigateToLogin();
        else window.location.replace("/login");
      }
    }
    return Promise.reject(error);
  }
);
export default axiosInstance;
