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


axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const path = window.location.pathname;
    const url = error.config?.url || "";

    if (status === 401) {
      // Ignore the initial auth check 401 to avoid login page reload loops
      const isAuthCheck = url.includes('/auth/check');

      const onAuthPages = path.startsWith('/login') || path.startsWith('/signup');
      if (!onAuthPages && !isAuthCheck) {
        if (window.navigateToLogin) {
          window.navigateToLogin(); // spa navigation if provided
        } else {
          window.location.replace('/login'); // avoid full reload loop
        }
      }
      // If already on auth pages or it’s /auth/check, let the app render normally
    }
    return Promise.reject(error);
  }
);
